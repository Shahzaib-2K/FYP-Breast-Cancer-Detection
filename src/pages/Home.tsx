import React from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  Brain,
  Zap,
  Eye,
  Globe,
  Users,
  BarChart3,
  Microscope,
  TrendingUp,
  Database,
  Code,
  Layers,
  Sparkles,
  Image,
  ChevronRight
} from 'lucide-react';
import './Home.css';
import './Project.css';
import './homeClinical.css';

const datasetSampleGroups: { classLabel: 'Benign' | 'Malignant'; images: string[] }[] = [
  {
    classLabel: 'Benign',
    images: [
      '/dataset_sample/benign1.jpeg',
      '/dataset_sample/benign2.jpeg',
      '/dataset_sample/benign3.jpeg',
      '/dataset_sample/benign4.jpeg'
    ]
  },
  {
    classLabel: 'Malignant',
    images: [
      '/dataset_sample/malignant1.jpeg',
      '/dataset_sample/malignant2.jpeg',
      '/dataset_sample/malignant3.jpeg',
      '/dataset_sample/malignant4.jpeg'
    ]
  }
];

const Home: React.FC = () => {
  return (
    <div className="home">
      {/* Hero — project overview + metrics (left) · pipeline summary (right) */}
      <section className="hero home-hero" aria-labelledby="home-hero-title">
        <div className="hero-background">
          <div className="hero-pattern"></div>
        </div>
        <div className="container">
          <div className="home-hero-layout">
            <h1 id="home-hero-title" className="home-hero-title">
              Automated breast cancer detection
            </h1>
            <div className="home-hero-intro">
              <p className="home-hero-lede">
                <strong>Breast cancer</strong> affects millions of lives each year.{' '}
                <strong>Early detection saves lives</strong>, but traditional diagnosis through a microscope is{' '}
                <strong>slow, subjective</strong>, and heavily dependent on a pathologist's experience. Our
                solution is an <strong>AI-powered web application</strong> that analyzes breast tissue images and
                instantly predicts whether the tissue is <strong>benign</strong> or <strong>malignant</strong> — while
                showing <strong>exactly why</strong> it made that decision.
              </p>
              <p className="home-hero-support">
                <strong>Our hybrid AI</strong> chains <strong>YOLOv8n</strong> for regions of interest,{' '}
                <strong>ResNet50</strong> and a <strong>Vision Transformer</strong> for fused embeddings, and{' '}
                <strong>XGBoost</strong> for the benign vs malignant decision. On the public{' '}
                <strong>BreaKHis</strong> benchmark (<strong>7,909</strong> microscope images), we reach{' '}
                <strong>98.36% accuracy</strong> across magnifications. Every prediction includes{' '}
                <strong>visual heatmap explanations</strong>. The interface runs in your browser with{' '}
                <strong>no installation</strong>—inference runs on the server and results appear on the page.
              </p>

              <ul className="home-hero-stats" aria-label="Key results on BreaKHis">
                <li className="home-hero-stat">
                  <span className="home-hero-stat-value">98.36%</span>
                  <span className="home-hero-stat-label">Overall accuracy</span>
                  <span className="home-hero-stat-note">Full-dataset run</span>
                </li>
                <li className="home-hero-stat">
                  <span className="home-hero-stat-value">99.51%</span>
                  <span className="home-hero-stat-label">ROC-AUC</span>
                  <span className="home-hero-stat-note">Image-level</span>
                </li>
                <li className="home-hero-stat">
                  <span className="home-hero-stat-value">0.52%</span>
                  <span className="home-hero-stat-label">Benign FPR</span>
                  <span className="home-hero-stat-note">False alarm rate</span>
                </li>
              </ul>
            </div>

            <aside className="home-hero-aside" aria-labelledby="home-hero-pipeline-title">
              <div className="home-hero-pipeline-card">
                <div className="home-hero-pipeline-head">
                  <Microscope size={22} strokeWidth={2} className="home-hero-pipeline-icon" aria-hidden />
                  <div>
                    <h2 id="home-hero-pipeline-title" className="home-hero-pipeline-title">
                      Pipeline
                    </h2>
                  </div>
                </div>
                <ul className="home-hero-pipeline-list">
                  <li className="home-hero-pipeline-item">
                    <span className="home-hero-pipeline-marker" aria-hidden>
                      <Target size={16} strokeWidth={2.25} aria-hidden />
                    </span>
                    <div className="home-hero-pipeline-body">
                      <span className="home-hero-pipeline-name">Localize tissue</span>
                      <span className="home-hero-pipeline-desc">YOLOv8n proposes ROIs on each field.</span>
                    </div>
                  </li>
                  <li className="home-hero-pipeline-item">
                    <span className="home-hero-pipeline-marker" aria-hidden>
                      <Brain size={16} strokeWidth={2.25} aria-hidden />
                    </span>
                    <div className="home-hero-pipeline-body">
                      <span className="home-hero-pipeline-name">Encode</span>
                      <span className="home-hero-pipeline-desc">ResNet50 + ViT-Base → fused vector.</span>
                    </div>
                  </li>
                  <li className="home-hero-pipeline-item">
                    <span className="home-hero-pipeline-marker" aria-hidden>
                      <Layers size={16} strokeWidth={2.25} aria-hidden />
                    </span>
                    <div className="home-hero-pipeline-body">
                      <span className="home-hero-pipeline-name">Classify</span>
                      <span className="home-hero-pipeline-desc">XGBoost; ROI majority vote (ties → malignant).</span>
                    </div>
                  </li>
                  <li className="home-hero-pipeline-item home-hero-pipeline-item--last">
                    <span className="home-hero-pipeline-marker" aria-hidden>
                      <Sparkles size={16} strokeWidth={2.25} aria-hidden />
                    </span>
                    <div className="home-hero-pipeline-body">
                      <span className="home-hero-pipeline-name">Output + explain</span>
                      <span className="home-hero-pipeline-desc">Grad-CAM + ViT attention overlays.</span>
                      <ul className="home-hero-pipeline-labels" aria-label="Binary classification labels">
                        <li className="home-hero-pipeline-label home-hero-pipeline-label--benign">Benign</li>
                        <li className="home-hero-pipeline-label home-hero-pipeline-label--malignant">Malignant</li>
                      </ul>
                    </div>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>


      {/* Key Highlights Section */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2>Key capabilities</h2>
            <p className="section-subtitle">
              Strong results on public tissue images, plus heat maps and a simple web demo for learning
            </p>
          </div>
          <div className="highlights-grid">
            <div className="highlight-card">
              <div className="highlight-icon">
                <Zap size={32} aria-hidden />
              </div>
              <h3>Accuracy</h3>
              <p>
                On the full public set (<strong>7,909</strong> images, all magnifications) our fused
                pipeline reaches <strong>98.36%</strong> accuracy, <strong>99.51%</strong> ROC-AUC,{' '}
                <strong>99.53%</strong> PR-AUC, and MCC <strong>0.962</strong>, with a low benign
                false-alarm rate (<strong>0.52%</strong> FPR in the final run). These figures are for
                research comparison only—not for treating patients.
              </p>
              <div className="highlight-metric">
                <TrendingUp size={16} aria-hidden />
                <span>Multi-model pipeline</span>
              </div>
            </div>
            
            <div className="highlight-card">
              <div className="highlight-icon">
                <Eye size={32} aria-hidden />
              </div>
              <h3>Heat maps</h3>
              <p>
                Grad-CAM highlights important areas on the ResNet branch. ViT attention rollout shows where
                the transformer focused across the <strong>224×224</strong> tissue patch. Together they
                give a picture a teacher or reviewer can discuss—not proof by itself.
              </p>
              <div className="highlight-metric">
                <BarChart3 size={16} aria-hidden />
                <span>Heat maps in the browser</span>
              </div>
            </div>
            
            <div className="highlight-card">
              <div className="highlight-icon">
                <Globe size={32} aria-hidden />
              </div>
              <h3>Demo</h3>
              <p>
                Upload an image on the Demo page. The server runs the trained models and returns a label,
                confidence-style scores, and side-by-side pictures you can inspect.
              </p>
              <div className="highlight-metric">
                <Users size={16} aria-hidden />
                <span>Built for learning and demos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="architecture" className="section home-architecture">
        <div className="container">
          <div className="section-header">
            <h2>Hybrid AI architecture</h2>
            <p className="section-subtitle">
              From standardized input to a suggested label—heat maps included in the demo for context.
            </p>
          </div>
          <div className="methodology-content">
            <div className="methodology-flow">
              <div className="flow-step">
                <div className="step-icon">
                  <Image size={24} aria-hidden />
                </div>
                <div className="step-content">
                  <h4>Image standardization</h4>
                  <p>
                    Resize, normalize, and (in training only) light augmentation so every crop matches what
                    the networks expect.
                  </p>
                </div>
              </div>

              <div className="flow-arrow" aria-hidden>
                →
              </div>

              <div className="flow-step">
                <div className="step-icon">
                  <Target size={24} aria-hidden />
                </div>
                <div className="step-content">
                  <h4>ROI localization</h4>
                  <p>YOLOv8n proposes tissue regions before each crop is scored.</p>
                </div>
              </div>

              <div className="flow-arrow" aria-hidden>
                →
              </div>

              <div className="flow-step">
                <div className="step-icon">
                  <Brain size={24} aria-hidden />
                </div>
                <div className="step-content">
                  <h4>Dual encoding</h4>
                  <p>
                    ResNet50 captures local structure; ViT-Base adds global context. Their outputs are fused
                    before classification.
                  </p>
                </div>
              </div>

              <div className="flow-arrow" aria-hidden>
                →
              </div>

              <div className="flow-step">
                <div className="step-icon">
                  <Layers size={24} aria-hidden />
                </div>
                <div className="step-content">
                  <h4>Fusion classification</h4>
                  <p>
                    XGBoost outputs benign vs malignant. Multiple ROIs are merged by majority vote; ties
                    favor malignant.
                  </p>
                </div>
              </div>

              <div className="flow-arrow" aria-hidden>
                →
              </div>

              <div className="flow-step">
                <div className="step-icon">
                  <Eye size={24} aria-hidden />
                </div>
                <div className="step-content">
                  <h4>Explainability</h4>
                  <p>Grad-CAM and ViT attention maps ship with the score for transparency—not a diagnosis.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="dataset" className="section">
        <div className="container">
          <div className="section-header">
            <h2>BreaKHis dataset</h2>
            <p className="section-subtitle">
              Public microscope images used for training and testing
            </p>
          </div>

          <div className="home-dataset-layout">
            <div className="home-dataset-panel">
              <p className="home-dataset-lead">
                We train and evaluate on <strong>BreaKHis</strong>, a well-known public set from Spanhol et
                al. (IEEE TBME, 2016). It has <strong>7,909</strong> stained breast tissue photos at four zoom
                levels (40× to 400×), each labeled <strong>benign</strong> or <strong>malignant</strong>, with
                several subtypes under each label. We split data <strong>70% / 20% / 10%</strong> for train,
                validation, and test. Because malignant examples are more common, we use standard tricks
                (class weights during training and a matching setting in XGBoost) so the model does not
                ignore the rarer benign class.
              </p>
              <div className="home-dataset-metrics" role="list">
                <div className="home-dataset-metric" role="listitem">
                  <span className="home-dataset-metric__value">7,909</span>
                  <span className="home-dataset-metric__label">Images (all zoom levels)</span>
                </div>
                <div className="home-dataset-metric" role="listitem">
                  <span className="home-dataset-metric__value">2,480 / 5,429</span>
                  <span className="home-dataset-metric__label">Benign / malignant counts</span>
                </div>
                <div className="home-dataset-metric" role="listitem">
                  <span className="home-dataset-metric__value">224×224</span>
                  <span className="home-dataset-metric__label">Size fed to the networks</span>
                </div>
              </div>
            </div>

            <div className="home-dataset-gallery" role="region" aria-label="Sample microscope thumbnails">
              {datasetSampleGroups.map((group) => (
                <div key={group.classLabel} className="home-dataset-group">
                  <div
                    className={
                      group.classLabel === 'Benign'
                        ? 'home-dataset-group__header home-dataset-group__header--benign'
                        : 'home-dataset-group__header home-dataset-group__header--malignant'
                    }
                  >
                    <span className="home-dataset-group__title">{group.classLabel}</span>
                  </div>
                  <div className="home-dataset-group__thumbs">
                    {group.images.map((src) => (
                      <div key={src} className="home-dataset-thumb">
                        <img src={src} alt="" loading="lazy" decoding="async" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="home-dataset-gallery-note">Illustration only—not for diagnosis.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="specs" className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2>Technical specifications</h2>
            <p className="section-subtitle">Dataset, models, and software</p>
          </div>
          <div className="specs-grid">
            <div className="spec-card">
              <h3>Dataset</h3>
              <div className="spec-list">
                <div className="spec-item">
                  <Database size={20} aria-hidden />
                  <div>
                    <strong>BreaKHis</strong>
                    <p>7,909 public breast tissue images at four microscope zoom levels</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="spec-card">
              <h3>Models</h3>
              <div className="spec-list">
                <div className="spec-item">
                  <Brain size={20} aria-hidden />
                  <div>
                    <strong>YOLOv8n</strong>
                    <p>ROI detector trained with full-image boxes on BreaKHis</p>
                  </div>
                </div>
                <div className="spec-item">
                  <Brain size={20} aria-hidden />
                  <div>
                    <strong>ResNet50</strong>
                    <p>Fine-tuned CNN; 2048-D embedding before the classifier head</p>
                  </div>
                </div>
                <div className="spec-item">
                  <Brain size={20} aria-hidden />
                  <div>
                    <strong>ViT-Base (patch 16, 224×224)</strong>
                    <p>Global context via the [CLS] token (768-D)</p>
                  </div>
                </div>
                <div className="spec-item">
                  <Brain size={20} aria-hidden />
                  <div>
                    <strong>XGBoost</strong>
                    <p>Final tree ensemble on the fused 2816-D features (per ROI; then majority vote)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="spec-card">
              <h3>Software</h3>
              <div className="spec-list">
                <div className="spec-item">
                  <Code size={20} aria-hidden />
                  <div>
                    <strong>Backend</strong>
                    <p>
                      Python, FastAPI, PyTorch, Ultralytics (YOLO), Hugging Face Transformers, XGBoost,
                      OpenCV, and related libraries
                    </p>
                  </div>
                </div>
                <div className="spec-item">
                  <Code size={20} aria-hidden />
                  <div>
                    <strong>Frontend</strong>
                    <p>React, TypeScript, and CSS for the pages you see here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="next-steps" className="section section-alt home-next-steps">
        <div className="container">
          <div className="section-header">
            <h2>Where to next</h2>
            <p className="section-subtitle">
              Run the trained pipeline on an upload, or open the team page for people and contact details.
            </p>
          </div>
          <div className="home-next-steps-grid">
            <Link to="/demo" className="home-next-steps-card home-next-steps-card--demo">
              <span className="home-next-steps-card-stripe" aria-hidden />
              <div className="home-next-steps-card-body">
                <div className="home-next-steps-card-top">
                  <div className="home-next-steps-icon" aria-hidden>
                    <Microscope size={28} strokeWidth={2} />
                  </div>
                  <span className="home-next-steps-tag">Hands-on</span>
                </div>
                <h3>Live demo</h3>
                <p>
                  Upload a histopathology image, view the predicted class with scores, and inspect Grad-CAM and
                  ViT attention overlays.
                </p>
                <span className="home-next-steps-cta">
                  Open demo
                  <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
                </span>
              </div>
            </Link>
            <Link to="/team" className="home-next-steps-card home-next-steps-card--team">
              <span className="home-next-steps-card-stripe" aria-hidden />
              <div className="home-next-steps-card-body">
                <div className="home-next-steps-card-top">
                  <div className="home-next-steps-icon" aria-hidden>
                    <Users size={28} strokeWidth={2} />
                  </div>
                  <span className="home-next-steps-tag">About</span>
                </div>
                <h3>Team</h3>
                <p>
                  Supervisors, student contributors, and how to reach the project. Educational use only—not
                  clinical software.
                </p>
                <span className="home-next-steps-cta">
                  View team
                  <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
