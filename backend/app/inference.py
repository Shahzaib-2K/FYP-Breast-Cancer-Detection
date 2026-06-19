from __future__ import annotations

import base64
import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, List, Optional

import matplotlib

matplotlib.use("Agg")

import cv2
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageDraw
from sklearn.preprocessing import normalize as sk_normalize
from torchvision import models, transforms

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None  # type: ignore[misc, assignment]

try:
    from transformers import ViTConfig, ViTForImageClassification
except ImportError as exc:  # pragma: no cover
    raise RuntimeError(
        "transformers is required for the ViT backbone (pip install transformers)"
    ) from exc

from xgboost import XGBClassifier


@dataclass
class RoiPrediction:
    roi_id: int
    bbox: List[int]
    prediction: str
    malignant_probability: float
    gradcam_base64: Optional[str] = None
    vit_attention_base64: Optional[str] = None
    crop_base64: Optional[str] = None


@dataclass
class InferenceResult:
    final_prediction: str
    confidence: float
    roi_count: int
    roi_predictions: List[RoiPrediction]
    roi_preview_base64: Optional[str] = None
    dashboard_base64: Optional[str] = None


def _load_torch_checkpoint(path: Path) -> dict[str, Any]:
    """Match notebook: weights are saved via `torch.save(model.state_dict(), ...)`.

    Notebook re-loads with `weights_only=True`. We try that first and fall
    back to `weights_only=False` to support older checkpoint formats.
    """
    try:
        blob = torch.load(path, map_location="cpu", weights_only=True)
    except Exception:
        blob = torch.load(path, map_location="cpu", weights_only=False)
    if isinstance(blob, dict):
        for key in ("state_dict", "model", "model_state_dict"):
            inner = blob.get(key)
            if isinstance(inner, dict):
                blob = inner
                break
    if not isinstance(blob, dict):
        raise RuntimeError(f"Unexpected checkpoint format in {path}")
    out: dict[str, Any] = {}
    for raw_k, v in blob.items():
        k = str(raw_k)
        for prefix in ("module.", "model.", "backbone."):
            if k.startswith(prefix):
                k = k[len(prefix) :]
        out[k] = v
    return out


def _vit_base_patch16_224_config() -> "ViTConfig":
    """Hard-coded ViTConfig for `google/vit-base-patch16-224` so the backend
    works fully offline (no Hugging Face Hub download needed)."""
    return ViTConfig(
        hidden_size=768,
        num_hidden_layers=12,
        num_attention_heads=12,
        intermediate_size=3072,
        hidden_act="gelu",
        hidden_dropout_prob=0.0,
        attention_probs_dropout_prob=0.0,
        initializer_range=0.02,
        layer_norm_eps=1e-12,
        image_size=224,
        patch_size=16,
        num_channels=3,
        qkv_bias=True,
        num_labels=2,
        id2label={0: "benign", 1: "malignant"},
        label2id={"benign": 0, "malignant": 1},
    )


class GradCAM:
    """Grad-CAM with proper hook lifecycle management (port of `GradCAM` from
    the FYP notebook). Use as a context manager so hooks are removed even if
    `generate` raises, otherwise hooks accumulate on the model and leak memory.
    """

    def __init__(self, model: nn.Module, target_layer: nn.Module) -> None:
        self.model = model
        self.target_layer = target_layer
        self.gradients: Optional[torch.Tensor] = None
        self.activations: Optional[torch.Tensor] = None
        self._handles: list = []
        self._register_hooks()

    def _register_hooks(self) -> None:
        def forward_hook(_module: nn.Module, _inp: Any, output: torch.Tensor) -> None:
            self.activations = output.detach()

        def backward_hook(_module: nn.Module, _grad_in: Any, grad_out: Any) -> None:
            self.gradients = grad_out[0].detach()

        self._handles.append(self.target_layer.register_forward_hook(forward_hook))
        self._handles.append(self.target_layer.register_full_backward_hook(backward_hook))

    def remove_hooks(self) -> None:
        for h in self._handles:
            h.remove()
        self._handles.clear()

    def __enter__(self) -> "GradCAM":
        return self

    def __exit__(self, *args: Any) -> None:
        self.remove_hooks()

    def generate(self, input_tensor: torch.Tensor, class_idx: int) -> np.ndarray:
        self.model.zero_grad(set_to_none=True)
        output = self.model(input_tensor)
        score = output[:, class_idx]
        score.backward()

        assert self.gradients is not None and self.activations is not None
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        cam = (weights * self.activations).sum(dim=1)
        cam = F.relu(cam)
        cam_np = cam.squeeze().detach().cpu().numpy()
        cam_np = cv2.resize(cam_np, (224, 224))
        denom = cam_np.max() - cam_np.min()
        cam_np = (cam_np - cam_np.min()) / (denom + 1e-8)
        return cam_np


def _apply_heatmap_overlay(
    pil_image: Image.Image,
    heatmap: np.ndarray,
    alpha: float = 0.5,
    colormap: int = cv2.COLORMAP_JET,
) -> Image.Image:
    """Overlay a [0, 1] heatmap on a PIL image. Returns 224x224 PIL.RGB.

    Mirrors `apply_heatmap_overlay` from the FYP notebook so backend overlays
    are pixel-equivalent to the ones generated in Colab.
    """
    img_np = np.array(pil_image.convert("RGB").resize((224, 224)))
    heatmap_u8 = (np.clip(heatmap, 0.0, 1.0) * 255).astype(np.uint8)
    colored = cv2.applyColorMap(heatmap_u8, colormap)
    colored = cv2.cvtColor(colored, cv2.COLOR_BGR2RGB)
    overlay = (alpha * colored + (1 - alpha) * img_np).clip(0, 255).astype(np.uint8)
    return Image.fromarray(overlay)


def _pil_to_b64_png(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


class ModelRunner:
    """WSI/patch pipeline: YOLO ROI → ResNet50 (local) + ViT (global) → concat → XGBoost.

    With explainability enabled, ResNet50 Grad-CAM (local texture) and ViT
    Attention Rollout (global structure) are computed per ROI and composed
    into a single dashboard image (matches FYP-II Section 5 notebook output).
    """

    def __init__(
        self,
        yolo_model_path: Path,
        resnet_model_path: Path,
        vit_model_path: Path,
        xgb_model_path: Path,
        xgb_config_path: Optional[Path] = None,
        device: Optional[str] = None,
        yolo_conf: float = 0.25,
        max_rois: int = 64,
        box_padding: float = 0.0,
        yolo_imgsz: Optional[int] = None,
        max_image_side: Optional[int] = None,
        max_explain_rois: int = 8,
    ) -> None:
        self.yolo_model_path = yolo_model_path
        self.resnet_model_path = resnet_model_path
        self.vit_model_path = vit_model_path
        self.xgb_model_path = xgb_model_path
        self.yolo_conf = yolo_conf
        self.max_rois = max_rois
        self.box_padding = box_padding
        self.yolo_imgsz = yolo_imgsz
        self.max_image_side = max_image_side
        self.max_explain_rois = max_explain_rois

        self.use_l2_normalization = False
        if xgb_config_path and xgb_config_path.exists():
            cfg = json.loads(xgb_config_path.read_text(encoding="utf-8"))
            self.use_l2_normalization = bool(cfg.get("use_l2_normalization", False))

        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        self.yolo: Any = None
        if yolo_model_path.exists():
            if YOLO is None:
                raise RuntimeError("ultralytics is required for YOLO weights; pip install ultralytics")
            self.yolo = YOLO(str(yolo_model_path))

        # `resnet_full` keeps the classification head — required for Grad-CAM
        # gradients. `resnet_features` is the same model with the head dropped,
        # used for the 2048-D feature vector that feeds XGBoost. They share
        # weights so loading happens once.
        self.resnet_full = self._load_resnet_full()
        self.resnet_features = nn.Sequential(*list(self.resnet_full.children())[:-1])
        self.resnet_features.to(self.device).eval()

        self.vit = self._load_vit()
        self.xgb = self._load_xgb()

        self.imagenet_transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

    def _load_resnet_full(self) -> nn.Module:
        if not self.resnet_model_path.exists():
            raise RuntimeError(f"ResNet weights not found at {self.resnet_model_path}")
        resnet = models.resnet50(weights=None)
        num_ftrs = resnet.fc.in_features
        resnet.fc = nn.Linear(num_ftrs, 2)
        state = _load_torch_checkpoint(self.resnet_model_path)
        resnet.load_state_dict(state, strict=False)
        resnet.eval()
        resnet.to(self.device)
        return resnet

    def _load_vit(self) -> nn.Module:
        """Load HuggingFace ViT (`google/vit-base-patch16-224`) — must match
        the architecture the notebook trained with. We force the *eager*
        attention implementation; SDPA does not return per-layer attention
        weights, which `output_attentions=True` (and rollout) requires.
        """
        if not self.vit_model_path.exists():
            raise RuntimeError(f"ViT weights not found at {self.vit_model_path}")
        config = _vit_base_patch16_224_config()
        try:
            config._attn_implementation = "eager"  # type: ignore[attr-defined]
        except Exception:
            pass
        vit = ViTForImageClassification(config)
        state = _load_torch_checkpoint(self.vit_model_path)
        missing, _ = vit.load_state_dict(state, strict=False)
        if missing:
            critical = [k for k in missing if "classifier" not in k]
            if critical:
                raise RuntimeError(
                    f"ViT checkpoint is missing {len(critical)} weights "
                    f"(first: {critical[:3]}). The .pt file may not be a "
                    f"HuggingFace ViTForImageClassification state_dict."
                )
        vit.eval()
        vit.to(self.device)
        return vit

    def _load_xgb(self) -> XGBClassifier:
        if not self.xgb_model_path.exists():
            raise RuntimeError(f"XGBoost model not found at {self.xgb_model_path}")
        xgb = XGBClassifier()
        xgb.load_model(str(self.xgb_model_path))
        return xgb

    @torch.inference_mode()
    def _features_per_roi(self, crops: List[Image.Image]) -> np.ndarray:
        """For each ROI crop: ResNet50 (2048-D) + ViT [CLS] (768-D) → 2816-D.

        Matches `extract_fused_features` in the notebook (same preprocessing,
        same backbone outputs, same concatenation order). Optional per-modality
        L2 is applied only when `xgb_config.json` says so.
        """
        if not crops:
            return np.empty((0, 2816), dtype=np.float32)

        batch = torch.stack([self.imagenet_transform(c) for c in crops]).to(self.device)

        rn = self.resnet_features(batch).flatten(start_dim=1).cpu().numpy()

        vit_out = self.vit.vit(pixel_values=batch, output_hidden_states=False)
        cls = vit_out.last_hidden_state[:, 0, :].cpu().numpy()

        if self.use_l2_normalization:
            rn = sk_normalize(rn, norm="l2")
            cls = sk_normalize(cls, norm="l2")

        return np.concatenate([rn, cls], axis=1).astype(np.float32, copy=False)

    @staticmethod
    def _maybe_downscale(image: Image.Image, max_side: Optional[int]) -> Image.Image:
        if not max_side:
            return image
        w, h = image.size
        longest = max(w, h)
        if longest <= max_side:
            return image
        scale = max_side / longest
        nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
        return image.resize((nw, nh), Image.Resampling.LANCZOS)

    @staticmethod
    def _roi_overlay_png_base64(image: Image.Image, boxes: List[List[int]]) -> str:
        """Draw YOLO boxes on a copy of the image for the web UI."""
        img = image.convert("RGB").copy()
        draw = ImageDraw.Draw(img)
        w, h = img.size
        stroke = max(2, min(w, h) // 400)
        for box in boxes:
            x1, y1, x2, y2 = box
            draw.rectangle([x1, y1, x2, y2], outline=(200, 52, 52), width=stroke)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("ascii")

    def _yolo_boxes(self, image: Image.Image) -> List[List[int]]:
        w, h = image.size
        if self.yolo is None:
            return [[0, 0, w, h]]

        arr = np.array(image.convert("RGB"))
        kwargs: dict[str, Any] = {"conf": self.yolo_conf, "verbose": False}
        if self.yolo_imgsz is not None:
            kwargs["imgsz"] = int(self.yolo_imgsz)
        results = self.yolo.predict(arr, **kwargs)
        scored: list[tuple[float, np.ndarray]] = []
        for r in results:
            if r.boxes is None or len(r.boxes) == 0:
                continue
            xyxy = r.boxes.xyxy.cpu().numpy()
            conf = r.boxes.conf.cpu().numpy()
            for i in range(len(xyxy)):
                scored.append((float(conf[i]), xyxy[i]))

        scored.sort(key=lambda x: -x[0])
        scored = scored[: self.max_rois]
        boxes: List[List[int]] = []
        for _, row in scored:
            x1, y1, x2, y2 = map(int, row.tolist())
            boxes.append([x1, y1, x2, y2])

        if not boxes:
            return [[0, 0, w, h]]
        return boxes

    def _crop_with_pad(self, image: Image.Image, box: List[int]) -> Image.Image:
        x1, y1, x2, y2 = box
        w, h = image.size
        bw = max(1, x2 - x1)
        bh = max(1, y2 - y1)
        pad = self.box_padding
        nx1 = max(0, int(x1 - pad * bw))
        ny1 = max(0, int(y1 - pad * bh))
        nx2 = min(w, int(x2 + pad * bw))
        ny2 = min(h, int(y2 + pad * bh))
        if nx2 <= nx1 or ny2 <= ny1:
            return image
        return image.crop((nx1, ny1, nx2, ny2))

    # ──────────────────────────────────────────────────────────────────
    # Explainability — Grad-CAM and ViT Attention Rollout per ROI
    # ──────────────────────────────────────────────────────────────────

    def _gradcam_for_roi(self, roi: Image.Image, target_cls: int) -> np.ndarray:
        """Run a fresh Grad-CAM pass on `resnet_full.layer4[-1]` for one ROI.

        Notebook uses `resnet_full.layer4[-1]` as the target conv layer; we do
        the same. Must run with grad enabled even though the model is in eval
        mode — gradients are still required for CAM.
        """
        img_t = self.imagenet_transform(roi).unsqueeze(0).to(self.device)
        img_t.requires_grad_(True)
        with GradCAM(self.resnet_full, self.resnet_full.layer4[-1]) as cam:
            with torch.set_grad_enabled(True):
                heatmap = cam.generate(img_t, target_cls)
        if self.device.type == "cuda":
            torch.cuda.empty_cache()
        return heatmap

    def _vit_attention_rollout(self, roi: Image.Image) -> np.ndarray:
        """ViT Attention Rollout (Abnar & Zuidema 2020), reshaped to 224×224.

        Adds the identity for residual connections, normalises rows, and
        chains the per-layer matrices. Then take the [CLS] token's row,
        drop the [CLS] entry, reshape the remaining 196 patches to 14×14,
        normalise, and resize.
        """
        img_t = self.imagenet_transform(roi).unsqueeze(0).to(self.device)
        with torch.no_grad():
            outputs = self.vit(pixel_values=img_t, output_attentions=True)
        attentions = outputs.attentions  # type: ignore[attr-defined]
        if attentions is None:
            return np.zeros((224, 224), dtype=np.float32)

        n_tokens = attentions[0].shape[-1]  # 197 for ViT-Base/16 @ 224
        eye = torch.eye(n_tokens, device=self.device)
        rollout = eye.clone()
        for attn in attentions:
            attn_avg = attn.squeeze(0).mean(dim=0)
            attn_avg = attn_avg + eye
            attn_avg = attn_avg / attn_avg.sum(dim=-1, keepdim=True)
            rollout = torch.matmul(attn_avg, rollout)

        side = int(round((n_tokens - 1) ** 0.5))
        cls_attn = rollout[0, 1:].reshape(side, side).detach().cpu().numpy()
        denom = cls_attn.max() - cls_attn.min()
        cls_attn = (cls_attn - cls_attn.min()) / (denom + 1e-8)
        return cv2.resize(cls_attn, (224, 224))

    # ──────────────────────────────────────────────────────────────────
    # Dashboard — matches FYP-II notebook Section 5
    # ──────────────────────────────────────────────────────────────────

    def _build_dashboard(
        self,
        original: Image.Image,
        roi_preds: List[RoiPrediction],
        explained: List[dict[str, Any]],
        final_label: str,
        confidence: float,
        n_boxes: int,
    ) -> str:
        """Render the FYP-II dashboard PNG and return it as base64.

        Row 1 (overview) : original + colour-coded YOLO boxes | summary table | final box
        Row 2..N+1       : ROI crop | ResNet50 Grad-CAM | ViT Attention Rollout
        """
        n_rois = len(explained)
        n_rows = 1 + n_rois
        pred_color = "#e74c3c" if final_label == "malignant" else "#2ecc71"

        fig = plt.figure(figsize=(15, 5 * n_rows))

        # ── Row 1 col 1: original + colour-coded boxes
        ax_orig = fig.add_subplot(n_rows, 3, 1)
        orig_boxed = original.convert("RGB").copy()
        draw = ImageDraw.Draw(orig_boxed)
        for r in roi_preds:
            box_col = "red" if r.prediction == "malignant" else "lime"
            x1, y1, x2, y2 = r.bbox
            draw.rectangle([x1, y1, x2, y2], outline=box_col, width=4)
            draw.text(
                (x1, max(y1 - 18, 0)),
                f"ROI {r.roi_id} - {'M' if r.prediction == 'malignant' else 'B'}",
                fill=box_col,
            )
        ax_orig.imshow(orig_boxed)
        ax_orig.set_title(
            f"Original Image\nYOLO: {n_boxes} ROI(s) detected",
            fontsize=13,
            fontweight="bold",
        )
        ax_orig.axis("off")

        # ── Row 1 col 2: per-ROI summary table
        ax_table = fig.add_subplot(n_rows, 3, 2)
        ax_table.axis("off")
        header = ["ROI", "Prediction", "Mal. Prob"]
        body = [
            [str(r.roi_id), r.prediction.upper(), f"{r.malignant_probability:.4f}"]
            for r in roi_preds
        ]
        table = ax_table.table(
            cellText=body or [["-", "-", "-"]],
            colLabels=header,
            loc="center",
            cellLoc="center",
        )
        table.auto_set_font_size(False)
        table.set_fontsize(11)
        table.scale(1.2, 2.0)
        for j in range(3):
            table[0, j].set_facecolor("#2c3e50")
            table[0, j].set_text_props(color="white", fontweight="bold")
        for i, r in enumerate(roi_preds):
            row_color = "#fde8e8" if r.prediction == "malignant" else "#e8fde8"
            for j in range(3):
                table[i + 1, j].set_facecolor(row_color)
        ax_table.set_title("ROI Classification Summary", fontsize=13, fontweight="bold")

        # ── Row 1 col 3: final prediction box
        ax_pred = fig.add_subplot(n_rows, 3, 3)
        ax_pred.axis("off")
        bg_color = "#fde8e8" if final_label == "malignant" else "#e8fde8"
        ax_pred.text(
            0.5,
            0.5,
            f"FINAL PREDICTION\n\n{final_label.upper()}\n\nConfidence: {confidence:.1%}",
            ha="center",
            va="center",
            fontsize=14,
            fontweight="bold",
            color=pred_color,
            transform=ax_pred.transAxes,
            bbox=dict(
                boxstyle="round,pad=1",
                facecolor=bg_color,
                edgecolor=pred_color,
                linewidth=3,
            ),
        )
        ax_pred.set_title("Final Result", fontsize=13, fontweight="bold")

        # ── Rows 2..N+1: one row per explained ROI
        for idx, er in enumerate(explained):
            row = idx + 2
            base_col = (row - 1) * 3
            roi_color = "#e74c3c" if er["prediction"] == "malignant" else "#2ecc71"
            roi_title = (
                f"ROI {er['roi_id']} - {er['prediction'].upper()}\n"
                f"Mal. prob: {er['malignant_probability']:.4f}"
            )

            ax_roi = fig.add_subplot(n_rows, 3, base_col + 1)
            ax_roi.imshow(er["roi_pil"].resize((224, 224)))
            ax_roi.set_title(roi_title, fontsize=11, fontweight="bold", color=roi_color)
            ax_roi.axis("off")

            ax_gc = fig.add_subplot(n_rows, 3, base_col + 2)
            ax_gc.imshow(er["gradcam_overlay"])
            ax_gc.set_title(
                "ResNet50 Grad-CAM\n(Local Texture Features)",
                fontsize=11,
                fontweight="bold",
            )
            ax_gc.axis("off")

            ax_vit = fig.add_subplot(n_rows, 3, base_col + 3)
            ax_vit.imshow(er["vit_overlay"])
            ax_vit.set_title(
                "ViT Attention Rollout\n(Global Structure Features)",
                fontsize=11,
                fontweight="bold",
            )
            ax_vit.axis("off")

        fig.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
        plt.close(fig)
        return base64.b64encode(buf.getvalue()).decode("ascii")

    def _aggregate(
        self,
        roi_predictions: List[RoiPrediction],
        *,
        roi_preview_base64: Optional[str] = None,
        dashboard_base64: Optional[str] = None,
    ) -> InferenceResult:
        if not roi_predictions:
            return InferenceResult(
                final_prediction="No ROI detected",
                confidence=0.0,
                roi_count=0,
                roi_predictions=[],
                roi_preview_base64=roi_preview_base64,
                dashboard_base64=dashboard_base64,
            )

        malignant_count = sum(r.prediction == "malignant" for r in roi_predictions)
        malignant_probs = [r.malignant_probability for r in roi_predictions]

        # Notebook rule: `final = 'malignant' if mal >= len(roi_preds)/2 else 'benign'`.
        # Tie defaults to malignant — clinical safety default.
        final_prediction = (
            "malignant" if malignant_count * 2 >= len(roi_predictions) else "benign"
        )

        avg_malignant = float(np.mean(malignant_probs)) if malignant_probs else 0.0
        confidence = avg_malignant if final_prediction == "malignant" else 1.0 - avg_malignant

        return InferenceResult(
            final_prediction=final_prediction,
            confidence=max(0.0, min(1.0, confidence)),
            roi_count=len(roi_predictions),
            roi_predictions=roi_predictions,
            roi_preview_base64=roi_preview_base64,
            dashboard_base64=dashboard_base64,
        )

    def predict(self, image: Image.Image, *, explain: bool = True) -> InferenceResult:
        image = image.convert("RGB")
        image = self._maybe_downscale(image, self.max_image_side)

        boxes = self._yolo_boxes(image)
        roi_preview_base64 = self._roi_overlay_png_base64(image, boxes)

        crops = [self._crop_with_pad(image, box) for box in boxes]
        fused_rows = self._features_per_roi(crops)
        probs_all = self.xgb.predict_proba(fused_rows)

        roi_predictions: List[RoiPrediction] = []
        for i, box in enumerate(boxes, start=1):
            mal_prob = float(probs_all[i - 1][1])
            label = "malignant" if mal_prob >= 0.5 else "benign"
            roi_predictions.append(
                RoiPrediction(
                    roi_id=i,
                    bbox=box,
                    prediction=label,
                    malignant_probability=mal_prob,
                )
            )

        dashboard_base64: Optional[str] = None
        if explain and roi_predictions:
            # Cap the number of ROIs we explain — Grad-CAM + ViT rollout
            # together are ~150-300ms/ROI on CPU. Notebook also assumes
            # YOLO produces a small number of ROIs per histology image.
            top_idx = sorted(
                range(len(roi_predictions)),
                key=lambda k: -roi_predictions[k].malignant_probability,
            )[: max(1, self.max_explain_rois)]

            explained: List[dict[str, Any]] = []
            for k in top_idx:
                r = roi_predictions[k]
                roi_pil = crops[k]
                target_cls = 1 if r.prediction == "malignant" else 0

                gradcam_map = self._gradcam_for_roi(roi_pil, target_cls)
                gradcam_overlay = _apply_heatmap_overlay(
                    roi_pil, gradcam_map, alpha=0.5, colormap=cv2.COLORMAP_JET
                )

                vit_map = self._vit_attention_rollout(roi_pil)
                vit_overlay = _apply_heatmap_overlay(
                    roi_pil, vit_map, alpha=0.5, colormap=cv2.COLORMAP_INFERNO
                )

                r.gradcam_base64 = _pil_to_b64_png(gradcam_overlay)
                r.vit_attention_base64 = _pil_to_b64_png(vit_overlay)
                r.crop_base64 = _pil_to_b64_png(roi_pil.resize((224, 224)))

                explained.append(
                    {
                        "roi_id": r.roi_id,
                        "prediction": r.prediction,
                        "malignant_probability": r.malignant_probability,
                        "roi_pil": roi_pil,
                        "gradcam_overlay": gradcam_overlay,
                        "vit_overlay": vit_overlay,
                    }
                )

            # Build dashboard from majority vote *now* so the title matches.
            mal_count = sum(r.prediction == "malignant" for r in roi_predictions)
            final_label = (
                "malignant" if mal_count * 2 >= len(roi_predictions) else "benign"
            )
            avg_mal = float(np.mean([r.malignant_probability for r in roi_predictions]))
            conf = avg_mal if final_label == "malignant" else 1.0 - avg_mal
            dashboard_base64 = self._build_dashboard(
                original=image,
                roi_preds=roi_predictions,
                explained=explained,
                final_label=final_label,
                confidence=max(0.0, min(1.0, conf)),
                n_boxes=len(boxes),
            )

        return self._aggregate(
            roi_predictions,
            roi_preview_base64=roi_preview_base64,
            dashboard_base64=dashboard_base64,
        )
