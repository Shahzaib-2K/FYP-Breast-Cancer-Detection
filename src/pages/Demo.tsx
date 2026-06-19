import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  Loader,
  AlertCircle,
  CheckCircle,
  Eye,
  Target,
  Layers,
  Download,
  Maximize2,
} from 'lucide-react';
import './Demo.css';

interface PredictionResult {
  prediction: 'Benign' | 'Malignant';
  confidence: number;
  roi_image_url: string;
  heatmap_url: string;
  dashboard_url: string;
}

/**
 * Open a data-URL image in a new tab. Plain `<a target="_blank" href="data:...">`
 * often fails for large PNGs (blocked or blank tab). Opening `about:blank`
 * synchronously on click keeps the pop-up allowed, then we navigate to a
 * short-lived `blob:` URL.
 */
function openDataUrlImageInNewTab(dataUrl: string): void {
  const newWin = window.open('about:blank', '_blank');
  if (!newWin) {
    window.alert(
      'Could not open a new tab. Your browser may have blocked the pop-up—allow pop-ups for this site, or use Download PNG.'
    );
    return;
  }
  try {
    newWin.opener = null;
  } catch {
    /* ignore */
  }

  void (async () => {
    let objectUrl: string | null = null;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      newWin.location.href = objectUrl;
      window.setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }, 120_000);
    } catch {
      try {
        newWin.close();
      } catch {
        /* ignore */
      }
      window.alert('Could not load the dashboard image. Try Download PNG instead.');
    }
  })();
}

const Demo: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or TIFF)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setUploadedFile(file);
      setError(null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!uploadedImage || !uploadedFile) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch(`${apiBaseUrl}/api/predict`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.detail || 'Failed to analyze image. Please try again.';
        throw new Error(message);
      }

      const data = await response.json();

      const rawLabel = data.final_prediction ?? data.prediction;
      let prediction: PredictionResult['prediction'] = 'Benign';
      if (rawLabel != null) {
        const label = String(rawLabel).trim().toLowerCase();
        if (label.includes('malig')) prediction = 'Malignant';
        else if (label.includes('benig')) prediction = 'Benign';
      }

      let confidenceNum = typeof data.confidence === 'number' ? data.confidence : Number(data.confidence);
      if (!Number.isFinite(confidenceNum)) confidenceNum = 0;
      if (confidenceNum > 1) confidenceNum = confidenceNum / 100;
      if (confidenceNum < 0) confidenceNum = 0;
      if (confidenceNum > 1) confidenceNum = 1;

      const apiResult: PredictionResult = {
        prediction,
        confidence: confidenceNum,
        roi_image_url: data.roi_image_url || uploadedImage,
        heatmap_url: data.heatmap_url || uploadedImage,
        dashboard_url: data.dashboard_url || '',
      };

      setResult(apiResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze image. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="demo">
      <section className="section">
        <div className="container">
          <header className="page-heading">
            <p className="page-heading__eyebrow">Research prototype</p>
            <h1 className="page-heading__title">Histopathology demo</h1>
            <p className="page-heading__lead">
              Upload a single patch image to run the hybrid pipeline.
            </p>
          </header>
          <div className="demo-content">
            <div
              className={[
                'upload-section',
                uploadedImage ? 'upload-section--has-file' : '',
                isLoading ? 'upload-section--analyzing' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="upload-section__intro">
                <h2>Upload histopathology image</h2>
                <p className="upload-description">
                  The request runs against the research API. Responses are for demonstration only.
                </p>
              </div>

              <div
                className={`upload-zone ${dragActive ? 'drag-active' : ''} ${uploadedImage ? 'has-image' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/tiff"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                />
                
                {uploadedImage ? (
                  <div className="uploaded-image-preview">
                    <img src={uploadedImage} alt="Uploaded histopathology preview" />
                    <button 
                      className="remove-image-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-zone__icon-ring" aria-hidden>
                      <Upload size={44} strokeWidth={1.75} />
                    </div>
                    <h3>Drop an image here</h3>
                    <p>or click anywhere in this area to browse</p>
                    <ul className="supported-formats" aria-label="Accepted files">
                      <li>JPEG, PNG, or TIFF</li>
                      <li>Up to 10 MB</li>
                    </ul>
                  </div>
                )}
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              {uploadedImage && !result && (
                <div className="analyze-section">
                  <p className="analyze-section__hint">
                    {isLoading
                      ? 'Running detection, encoders, and classifier—this may take a few seconds.'
                      : 'When you are ready, run the pipeline on this patch.'}
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary analyze-btn"
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader className="spinning" size={20} />
                        Analyzing...
                      </>
                    ) : (
                      'Analyze Image'
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Results Section */}
            {result && (
              <div className="results-section">
                <div className="results-section__intro">
                  <h2>Analysis results</h2>
                </div>

                {/* Prediction — clinical readout strip */}
                <div className={`prediction-strip prediction-strip--${result.prediction.toLowerCase()}`}>
                  <div className="prediction-strip__accent" aria-hidden />
                  <div className="prediction-strip__body">
                    <div className="prediction-strip__glyph" aria-hidden>
                      {result.prediction === 'Malignant' ? (
                        <AlertCircle
                          size={20}
                          strokeWidth={2}
                          className="prediction-strip__glyph-svg prediction-strip__glyph-svg--malignant"
                        />
                      ) : (
                        <CheckCircle
                          size={20}
                          strokeWidth={2}
                          className="prediction-strip__glyph-svg prediction-strip__glyph-svg--benign"
                        />
                      )}
                    </div>
                    <dl className="prediction-strip__readout">
                      <div className="prediction-strip__field">
                        <dt className="prediction-strip__label">Slide-level class</dt>
                        <dd className="prediction-strip__value">{result.prediction}</dd>
                      </div>
                      <div className="prediction-strip__divider" aria-hidden />
                      <div className="prediction-strip__field">
                        <dt className="prediction-strip__label">Model confidence</dt>
                        <dd className="prediction-strip__metric">
                          {(result.confidence * 100).toFixed(1)}
                          <span className="prediction-strip__metric-unit">%</span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Full FYP-II dashboard — framed viewport + actions */}
                {result.dashboard_url ? (
                  <div
                    className={`dashboard-panel dashboard-panel--${result.prediction.toLowerCase()}`}
                  >
                    <div className="dashboard-panel__head">
                      <div className="dashboard-panel__titles">
                        <div className="dashboard-panel__icon-wrap" aria-hidden>
                          <Layers size={22} strokeWidth={2} />
                        </div>
                        <div>
                          <h3 className="dashboard-panel__title">Explainability dashboard</h3>
                          <p className="dashboard-panel__subtitle">
                            YOLO regions · ResNet50 Grad-CAM · ViT attention rollout
                          </p>
                        </div>
                      </div>
                      <div className="dashboard-panel__actions">
                        <button
                          type="button"
                          className="dashboard-panel__action"
                          onClick={() => openDataUrlImageInNewTab(result.dashboard_url)}
                        >
                          <Maximize2 size={16} />
                          Open full size
                        </button>
                        <a
                          href={result.dashboard_url}
                          download="breast-cancer-explainability-dashboard.png"
                          className="dashboard-panel__action dashboard-panel__action--primary"
                        >
                          <Download size={16} />
                          Download PNG
                        </a>
                      </div>
                    </div>

                    <div className="dashboard-panel__viewport">
                      <img
                        src={result.dashboard_url}
                        alt="Explainability dashboard: ROI summary, ResNet50 Grad-CAM and ViT attention maps per region"
                        className="dashboard-panel__img"
                        decoding="async"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="visualizations">
                    <div className="visualization-card">
                      <h4>
                        <Target size={20} />
                        Original Image with ROI
                      </h4>
                      <div className="image-container">
                        <img src={result.roi_image_url} alt="ROI Detection" />
                      </div>
                      <p>Region of Interest detected by YOLOv8</p>
                    </div>

                    <div className="visualization-card">
                      <h4>
                        <Eye size={20} />
                        Explainability Heatmap
                      </h4>
                      <div className="image-container">
                        <img src={result.heatmap_url} alt="Heatmap" />
                      </div>
                      <p>Grad-CAM visualization showing AI attention</p>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-outline reset-btn"
                  onClick={() => {
                    handleReset();
                    window.setTimeout(() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 0);
                  }}
                >
                  Analyze another image
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Instructions Section */}
      <section className="section section-alt">
        <div className="container">
          <h2 className="text-center mb-5">How to Use the Demo</h2>
          <div className="instructions-grid">
            <div className="instruction-step">
              <div className="step-number">1</div>
              <h4>Upload Image</h4>
              <p>Upload a histopathology image using drag & drop or click to browse</p>
            </div>
            <div className="instruction-step">
              <div className="step-number">2</div>
              <h4>AI Analysis</h4>
              <p>Our hybrid AI system processes the image using YOLOv8, ResNet50, ViT, and XGBoost</p>
            </div>
            <div className="instruction-step">
              <div className="step-number">3</div>
              <h4>View Results</h4>
              <p>Examine the prediction, confidence score, and explainability visualizations</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Demo;
