OilTrace

OilTrace is a satellite-based marine oil spill detection and analysis system designed to identify potential oil spills from Sentinel-1 Synthetic Aperture Radar (SAR) imagery and convert detected regions into geospatial spill information.

The system combines deep-learning-based image segmentation, geospatial processing, and a web-based visualization interface. The project also provides modular components for AIS data handling, vessel attribution, and oil-spill drift analysis.

Features

Sentinel-1 SAR image analysis

Semantic segmentation using ResNet-50 + DeepLabV3+

Five-class segmentation:

Sea Surface

Oil Spill

Look-alike

Ship

Land

Oil-spill pixel extraction

Spill-mask post-processing

Spill polygon generation

Pixel-to-geographic coordinate conversion

Spill area, perimeter, and center estimation

Interactive Leaflet-based dashboard

FastAPI backend for model inference

Streamlit-based segmentation demo

Modular AIS, attribution, and drift-analysis services

Training, evaluation, and inference utilities

System Architecture

                         Sentinel-1 SAR Image
                                  |
                                  v
                     +--------------------------+
                     |    Image Preprocessing   |
                     +------------+-------------+
                                  |
                                  v
                     +--------------------------+
                     |      ResNet-50 Encoder   |
                     +------------+-------------+
                                  |
                                  v
                     +--------------------------+
                     |       DeepLabV3+         |
                     |    Semantic Segmentation |
                     +------------+-------------+
                                  |
                                  v
                    +----------------------------+
                    |       5-Class Mask         |
                    |----------------------------|
                    | Sea Surface                |
                    | Oil Spill                  |
                    | Look-alike                 |
                    | Ship                       |
                    | Land                       |
                    +-------------+--------------+
                                  |
                                  v
                       Oil Spill Mask Extraction
                                  |
                                  v
                         Polygon Generation
                                  |
                                  v
                    Geographic Coordinate Mapping
                                  |
                                  v
                   Area / Perimeter / Center
                                  |
                                  v
                         Web Visualization

Supporting modules:

AIS Data
   |
   v
Vessel Processing
   |
   v
Attribution

Environmental / Drift Data
   |
   v
Drift Analysis

Project Structure

OilTrace/
│
├── backend/
│   ├── api/
│   │   └── routes_analysis.py
│   ├── schemas/
│   │   └── analysis.py
│   ├── services/
│   │   ├── ais_service.py
│   │   ├── attribution_service.py
│   │   ├── drift_service.py
│   │   ├── geoprocessing_service.py
│   │   └── segmentation_service.py
│   ├── utils/
│   │   └── config.py
│   └── main.py
│
├── demo/
│   └── Oil_Spill_Segmentation/
│       ├── app.py
│       ├── sample_image_for_inference/
│       └── training/
│
├── frontend/
│   ├── index.html
│   ├── js/
│   │   ├── api.js
│   │   ├── app.js
│   │   └── data.js
│   └── style.css
│
├── ml/
│   ├── models/
│   │   └── resnet_50_deeplab_v3+/
│   │       └── oil_spill_seg_resnet_50_deeplab_v3+_80.pt
│   └── training/
│
├── src/
│   ├── ais/
│   ├── api/
│   ├── attribution/
│   ├── characterisation/
│   ├── detection/
│   ├── drift/
│   ├── preprocessing/
│   └── utils/
│
├── data/
├── tests/
├── requirements.txt
├── SRS.md
├── SDD.md
├── Requirements.md
└── README.md

Technology Stack

Machine Learning

Python

PyTorch

Torchvision

ResNet-50

DeepLabV3+

OpenCV

NumPy

Pillow

Backend

FastAPI

Pydantic

Uvicorn

Python Multipart

Frontend

HTML

CSS

JavaScript

Leaflet

Demo

Streamlit

Model

OilTrace uses a ResNet-50 encoder with a DeepLabV3+ segmentation decoder.

Segmentation Classes

Class ID

Class

0

Sea Surface

1

Oil Spill

2

Look-alike

3

Ship

4

Land

Model Checkpoint

ml/models/resnet_50_deeplab_v3+/
└── oil_spill_seg_resnet_50_deeplab_v3+_80.pt

The model checkpoint is stored using Git LFS.

Installation

Prerequisites

Python 3.10 or later

Git

Git LFS

Clone the repository

git lfs install
git clone https://github.com/rishihake-21/OilTrace.git
cd OilTrace
git lfs pull

Create a virtual environment

Windows PowerShell

python -m venv mlvenv
.\mlvenv\Scripts\Activate.ps1

Linux / macOS

python3 -m venv mlvenv
source mlvenv/bin/activate

Install dependencies

python -m pip install --upgrade pip
pip install -r requirements.txt

Running the Backend

From the repository root:

uvicorn backend.main:app --reload --port 8000

The API will be available at:

http://127.0.0.1:8000

FastAPI documentation:

http://127.0.0.1:8000/docs

Running the Frontend

Open a second terminal:

cd frontend
python -m http.server 5500

Open the dashboard:

http://localhost:5500

The frontend should be served through a local HTTP server rather than opened directly with file://.

SAR Analysis Workflow

1. Select a SAR image
2. Provide the image footprint
3. Send the image to the FastAPI backend
4. Preprocess the image
5. Run ResNet-50 + DeepLabV3+ inference
6. Generate the five-class segmentation map
7. Extract the Oil Spill class
8. Convert the oil mask into polygons
9. Convert pixel coordinates to geographic coordinates
10. Calculate spill area, perimeter and center
11. Return structured analysis results
12. Display the spill geometry on the map

API

POST /api/analyze

Analyzes a SAR image and returns segmentation and spill information.

Request

Content type:

multipart/form-data

Parameters:

Parameter

Type

Description

file

File

SAR image

north

float

Northern image boundary

south

float

Southern image boundary

east

float

Eastern image boundary

west

float

Western image boundary

Example

curl -X POST "http://127.0.0.1:8000/api/analyze" \
  -F "file=@sample.jpg" \
  -F "north=18" \
  -F "south=17" \
  -F "east=72" \
  -F "west=71"

Response

The response contains:

image dimensions

supplied footprint

per-class segmentation counts

oil-pixel count

oil percentage

spill detection status

spill polygon count

spill center

approximate area

approximate perimeter

polygon coordinates

Geospatial Processing

The current implementation maps image pixels to geographic coordinates using the supplied image footprint.

For a pixel (x, y):

longitude = west + (x / image_width) * (east - west)

latitude = north - (y / image_height) * (north - south)

This converts image-space spill polygons into latitude/longitude coordinates for map visualization and geographic measurements.

The current implementation uses a rectangular footprint approximation.

Sample Inference Image

A sample image is included at:

demo/Oil_Spill_Segmentation/sample_image_for_inference/img_0814.jpg

This image can be used for testing the model and demo workflow.

Streamlit Demo

The repository also contains a standalone Streamlit application:

demo/Oil_Spill_Segmentation/

Run it from that directory using the project's Streamlit application entry point.

Training and Evaluation

Training and evaluation utilities are available under:

ml/training/

and:

demo/Oil_Spill_Segmentation/training/

The training modules include utilities for:

dataset loading

image preprocessing

model construction

training

inference

segmentation metrics

cross-validation metrics

exploratory data analysis

model summarization

Data

The repository does not contain the complete large SAR datasets.

The data/ directory is reserved for local datasets and generated data.

Recommended structure:

data/
├── raw/
├── processed/
├── database/
├── scenarios/
└── dartis-2019/

Large datasets should be obtained from their original sources and placed locally according to the relevant dataset documentation.

Datasets

The project uses or supports experimentation with SAR oil-spill datasets including:

DARTIS-2019

Sentinel-1 SAR oil-spill imagery with Pascal VOC-style XML annotations.

These annotations are primarily object/bounding-box annotations and should not be treated as dense semantic segmentation masks.

M4D Oil Spill Detection Dataset

A Sentinel-1 oil-spill dataset containing ground-truth segmentation masks and multiple semantic classes.

Dataset-specific terms, licensing, and redistribution requirements should be followed when obtaining or sharing the datasets.

Configuration

Backend configuration is located in:

backend/utils/config.py

The frontend API configuration is located in:

frontend/js/api.js

The default backend address used by the frontend is:

http://127.0.0.1:8000

Tests

Project test files include:

test_model.py
test_m4d_sample.py

Additional model and training tests are available under:

ml/training/

Documentation

Additional project documentation:

SRS.md — Software Requirements Specification

SDD.md — Software Design Description

Requirements.md — Project requirements

Current System Scope

The primary implemented analysis path is:

Sentinel-1 SAR
      ↓
DeepLabV3+ segmentation
      ↓
Oil spill mask
      ↓
Spill polygon
      ↓
Geographic coordinates
      ↓
Area / perimeter / center
      ↓
Interactive map

The repository also contains modular components for:

AIS data
Vessel attribution
Drift analysis
Characterisation
Preprocessing
API services

These modules provide the structure for extending the system into a broader marine oil-spill analysis platform.
