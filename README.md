# Breast Cancer Detection

An AI-powered web application that detects and classifies regions of interest in mammogram images as benign or malignant. Built as a Final Year Project, combining a React frontend with a FastAPI backend running an ensemble of deep learning models.

<!--
SCREENSHOT 1: Add a screenshot of your Home page here.
Replace the line below with: ![Home Page](screenshots/home.png)
-->
![Home Page](screenshots/home.png)

## Overview

The system takes a mammogram image as input and runs it through a multi-stage pipeline: a YOLO model first detects candidate regions of interest, then ResNet and Vision Transformer (ViT) classifiers analyze each region, and an XGBoost model fuses their outputs into a final prediction. Grad-CAM and ViT attention maps are generated so predictions can be visually explained rather than treated as a black box.

## Features

- Upload a mammogram image and receive a malignant/benign prediction
- Automatic region-of-interest detection using YOLO
- Dual classification via ResNet and ViT models, fused with XGBoost
- Visual explainability through Grad-CAM and attention heatmaps
- Clean, responsive web interface

<!--
SCREENSHOT 2: Add a screenshot of your Demo/results page here.
Replace the line below with: ![Detection Demo](screenshots/demo.png)
-->
![Detection Demo](screenshots/demo.png)

## Tech Stack

**Frontend:** React, TypeScript, React Router

**Backend:** FastAPI (Python)

**Machine Learning:** PyTorch, torchvision, Ultralytics YOLO, Hugging Face Transformers (ViT), XGBoost, scikit-learn, OpenCV

## Project Structure

```
breast-cancer-detection/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app and API routes
│       └── inference.py     # Model loading and inference pipeline
├── src/
│   ├── pages/                # Home, Demo, Team pages
│   └── components/           # Header, Footer, shared UI
├── models/                   # Trained model weights (see below)
├── dataset_sample/           # Sample images for testing
└── public/
```

## Model 
|         File            |  Size  |              Purpose                     |
|-------------------------|--------|------------------------------------------|
| `best.pt`               | 6 MB   | YOLOv8 — region detector                 |
| `best_classifier.pt`    | 90 MB  | ResNet50 — texture classifier            |
| `vit_best.pt`           | 328 MB | Vision Transformer — structure analyser  |
| `xgboost_fused.json`    | 132 KB | XGBoost — final decision maker           |
| `xgb_config.json`       | 4 KB   | Config flag (L2 normalisation on/off)    |

Due to GitHub's file size limitations, two of the trained model are not stored directly in this repository. Instead, the following models are available as GitHub Release assets:

* `best_classifier.pt` (ResNet50)
* `vit_best.pt` (Vision Transformer)

Download and place them in the `models/` folder before running the backend locally:
https://github.com/Shahzaib-2K/FYP-Breast-Cancer-Detection/releases/tag/V2.0


## Running Locally

**Backend:**
1. Open Command Prompt
2. Navigate into your backend folder:

```bash
cd path\to\breast-cancer-detection\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
1. Open a new Command Prompt window 

```bash
cd path\to\breast-cancer-detection
npm install
npm start
```

The frontend will run on `http://localhost:3000` and connect to the backend API.

<!--
SCREENSHOT 3 (optional): Add a screenshot showing the Grad-CAM/attention visualization output here.
Replace the line below with: ![Explainability Output](screenshots/explainability.png)
-->
![Explainability Output](screenshots/explainability.png)

## Disclaimer

This project was built for academic purposes as part of a Final Year Project and is **not** intended for real clinical or diagnostic use.