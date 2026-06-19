from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps

from .inference import InferenceResult, ModelRunner

ROOT_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = Path(os.getenv("MODELS_DIR", str(ROOT_DIR / "models")))

DEFAULT_YOLO_MODEL_PATH = Path(os.getenv("YOLO_MODEL_PATH", str(MODELS_DIR / "best.pt")))
DEFAULT_RESNET_MODEL_PATH = Path(os.getenv("RESNET_MODEL_PATH", str(MODELS_DIR / "best_classifier.pt")))
DEFAULT_VIT_MODEL_PATH = Path(os.getenv("VIT_MODEL_PATH", str(MODELS_DIR / "vit_best.pt")))
DEFAULT_XGB_MODEL_PATH = Path(os.getenv("XGB_MODEL_PATH", str(MODELS_DIR / "xgboost_fused.json")))
DEFAULT_XGB_CONFIG_PATH = Path(os.getenv("XGB_CONFIG_PATH", str(MODELS_DIR / "xgb_config.json")))

YOLO_CONF = float(os.getenv("YOLO_CONF", "0.25"))
MAX_ROIS = int(os.getenv("MAX_ROIS", "64"))
MAX_EXPLAIN_ROIS = int(os.getenv("MAX_EXPLAIN_ROIS", "8"))
YOLO_IMG_SIZE = os.getenv("YOLO_IMG_SIZE")
YOLO_IMG_SIZE_INT = int(YOLO_IMG_SIZE) if YOLO_IMG_SIZE else None
MAX_IMAGE_SIDE = os.getenv("MAX_IMAGE_SIDE")
MAX_IMAGE_SIDE_INT = int(MAX_IMAGE_SIDE) if MAX_IMAGE_SIDE else None

_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
CORS_ORIGINS = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app = FastAPI(title="Breast Cancer Detection API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model_runner: Optional[ModelRunner] = None


def get_model_runner() -> ModelRunner:
    global _model_runner
    if _model_runner is None:
        cfg = DEFAULT_XGB_CONFIG_PATH if DEFAULT_XGB_CONFIG_PATH.exists() else None
        _model_runner = ModelRunner(
            yolo_model_path=DEFAULT_YOLO_MODEL_PATH,
            resnet_model_path=DEFAULT_RESNET_MODEL_PATH,
            vit_model_path=DEFAULT_VIT_MODEL_PATH,
            xgb_model_path=DEFAULT_XGB_MODEL_PATH,
            xgb_config_path=cfg,
            yolo_conf=YOLO_CONF,
            max_rois=MAX_ROIS,
            yolo_imgsz=YOLO_IMG_SIZE_INT,
            max_image_side=MAX_IMAGE_SIDE_INT,
            max_explain_rois=MAX_EXPLAIN_ROIS,
        )
    return _model_runner


@app.get("/health")
def health() -> dict:
    import torch

    return {
        "status": "ok",
        "torch_device": "cuda" if torch.cuda.is_available() else "cpu",
        "models_present": {
            "yolo": DEFAULT_YOLO_MODEL_PATH.is_file(),
            "resnet": DEFAULT_RESNET_MODEL_PATH.is_file(),
            "vit": DEFAULT_VIT_MODEL_PATH.is_file(),
            "xgboost": DEFAULT_XGB_MODEL_PATH.is_file(),
            "xgb_config": DEFAULT_XGB_CONFIG_PATH.is_file(),
        },
        "models_dir": str(MODELS_DIR),
    }


def _as_data_url(b64: Optional[str]) -> str:
    return f"data:image/png;base64,{b64}" if b64 else ""


@app.post("/api/predict")
async def predict(
    file: UploadFile = File(...),
    explain: bool = True,
) -> dict:
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/tiff"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Unsupported image type.")

    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid image file.") from exc

    try:
        runner = get_model_runner()
        result: InferenceResult = runner.predict(image, explain=explain)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    normalized = (
        result.final_prediction.capitalize()
        if result.final_prediction.lower() in {"benign", "malignant"}
        else result.final_prediction
    )

    preview_data_url = _as_data_url(result.roi_preview_base64)
    dashboard_data_url = _as_data_url(result.dashboard_base64)

    return {
        "prediction": normalized,
        "final_prediction": result.final_prediction,
        "confidence": result.confidence,
        "roi_count": result.roi_count,
        "roi_predictions": [
            {
                "roi_id": roi.roi_id,
                "bbox": roi.bbox,
                "prediction": roi.prediction,
                "malignant_probability": roi.malignant_probability,
                "crop_url": _as_data_url(roi.crop_base64),
                "gradcam_url": _as_data_url(roi.gradcam_base64),
                "vit_attention_url": _as_data_url(roi.vit_attention_base64),
            }
            for roi in result.roi_predictions
        ],
        "roi_image_url": preview_data_url,
        "heatmap_url": dashboard_data_url or preview_data_url,
        "dashboard_url": dashboard_data_url,
    }
