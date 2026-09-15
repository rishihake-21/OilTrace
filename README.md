# OilTrace — Oil Spill Detection and Vessel Attribution System

**Smart India Hackathon 2026 (Internal) — Problem Statement 26143**
**Theme:** Disaster Management · **Organization:** NTRO (National Technical Research Organisation)
**Team size:** 5 · **Build window:** 2-day internal hackathon sprint

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Current implementation status](#2-current-implementation-status)
3. [Repository structure](#3-repository-structure)
4. [Technology stack](#4-technology-stack)
5. [Prerequisites](#5-prerequisites)
6. [Clone the repository](#6-clone-the-repository)
7. [Python environment setup](#7-python-environment-setup)
8. [Start the backend](#8-start-the-backend)
9. [Start the frontend](#9-start-the-frontend)
10. [Demo workflow](#10-demo-workflow)
11. [Accuracy / presentation note](#11-accuracy--presentation-note)
12. [The segmentation model](#12-the-segmentation-model)
13. [API summary](#13-api-summary)
14. [Datasets](#14-datasets)
15. [Suggested team roles](#15-suggested-team-roles-for-presentation)
16. [Quick troubleshooting](#16-quick-troubleshooting)
17. [Reproducibility checklist](#17-reproducibility-checklist)
18. [Project documentation set](#18-project-documentation-set)
19. [Known limitations](#19-known-limitations)
20. [Roadmap](#20-roadmap)

---

## 1. Project overview

OilTrace is a prototype decision-support system for detecting potential marine oil spills from Sentinel-1 SAR (Synthetic Aperture Radar) imagery and preparing the result for downstream geospatial, vessel-attribution, and drift-analysis workflows. It was built for PS 26143 (NTRO, Disaster Management theme) of an internal Smart India Hackathon 2026 round, by a five-person team over a two-day build window.

The repository combines:

- A **FastAPI** backend for SAR image analysis.
- A real **DeepLabV3+ segmentation model with a ResNet-50 encoder**.
- A browser-based **Leaflet** dashboard.
- Geospatial conversion of predicted spill pixels to latitude/longitude using a supplied image footprint.
- Prototype services/modules for AIS, vessel attribution, drift, and related system components.
- A **Streamlit** inference/demo application.
- Training and evaluation utilities for the segmentation model.
- Sample SAR imagery for demonstration.

## 2. Current implementation status

Judges and reviewers should be told exactly what is real and what is illustrative. The team commits to this distinction throughout every presentation and document in this repository.

### ✅ Real / implemented

- SAR image upload to FastAPI.
- ResNet-50 + DeepLabV3+ inference.
- Five-class semantic segmentation (Sea Surface, Oil Spill, Look-alike, Ship, Land).
- Oil-pixel extraction from the predicted mask.
- Spill polygon extraction from the predicted oil mask.
- Pixel-to-geographic conversion using a manually supplied image footprint (north/south/east/west).
- Approximate spill area, perimeter, and center calculation.
- Frontend display of the returned, segmentation-derived spill information.

### 🧪 Prototype / demo behavior (not live data)

- Some vessel, AIS, drift, environmental, confidence, timeline, and scenario values shown on the dashboard are demo/synthetic data (`frontend/js/data.js`).
- The repository does not currently derive true per-image geolocation automatically from Sentinel-1 metadata — the user supplies the footprint.
- The full DARTIS-2019 dataset is not stored in the Git repository; large datasets are shared separately (see [Datasets](#14-datasets)).

## 3. Repository structure

```text
OilTrace/
├── backend/
│   ├── api/
│   │   └── routes_analysis.py       # POST /api/analyze endpoint
│   ├── schemas/
│   │   └── analysis.py              # API schema definitions
│   ├── services/
│   │   ├── segmentation_service.py  # ML inference (SegmentationService)
│   │   ├── geoprocessing_service.py # mask -> polygon -> geographic metrics
│   │   ├── ais_service.py           # prototype: AIS ingestion
│   │   ├── attribution_service.py   # prototype: vessel attribution
│   │   └── drift_service.py         # prototype: drift forecasting
│   ├── utils/
│   │   └── config.py
│   └── main.py                      # FastAPI application entry point
│
├── demo/
│   └── Oil_Spill_Segmentation/
│       ├── app.py                   # Streamlit demo application
│       ├── sample_image_for_inference/
│       │   └── img_0814.jpg
│       └── training/
│
├── frontend/
│   ├── index.html
│   ├── js/
│   │   ├── api.js                   # backend integration (analyzeSARImage)
│   │   ├── app.js                   # UI logic
│   │   └── data.js                  # demo/synthetic dashboard data
│   └── style.css
│
├── ml/
│   ├── models/
│   │   └── resnet_50_deeplab_v3+/
│   │       └── oil_spill_seg_resnet_50_deeplab_v3+_80.pt   # Git LFS
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
│   └── .gitkeep                     # actual datasets are stored separately
│
├── tests / test_*.py
├── requirements.txt
├── SRS.md
├── SDD.md
├── ARCHITECTURE.md
├── Requirements.md
├── .gitignore
└── .gitattributes
```

## 4. Technology stack

| Layer | Technology |
|---|---|
| Backend API | Python, FastAPI, Uvicorn |
| ML inference | PyTorch, ResNet-50 encoder, DeepLabV3+ decoder |
| Geoprocessing | Contour/polygon extraction, linear pixel↔geo interpolation |
| Frontend | HTML, CSS, JavaScript, Leaflet.js |
| Demo / prototyping | Streamlit |
| Model storage | Git LFS |
| Target data sources | Sentinel-1 SAR (DARTIS-2019, M4D), AIS feeds, metocean data |

## 5. Prerequisites

Recommended for the current prototype:

- Windows 10/11, Linux, or macOS
- Python 3.10+ (match the version already used by the team where possible)
- Git
- Git LFS
- Internet access to install Python packages and obtain the large datasets if required

GPU is helpful for faster inference/training but is **not required** for a basic CPU demonstration.

## 6. Clone the repository

```powershell
git lfs install
git clone https://github.com/rishihake-21/OilTrace.git
cd OilTrace
git lfs pull
```

Verify the model downloaded correctly (not just an LFS pointer file):

```powershell
git lfs ls-files
```

The trained model should appear at:

```text
ml/models/resnet_50_deeplab_v3+/oil_spill_seg_resnet_50_deeplab_v3+_80.pt
```

## 7. Python environment setup

```powershell
python -m venv mlvenv
.\mlvenv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\mlvenv\Scripts\Activate.ps1
```

## 8. Start the backend

From the repository root:

```powershell
uvicorn backend.main:app --reload --port 8000
```

Expected URLs:

- API root: `http://127.0.0.1:8000/`
- Swagger UI: `http://127.0.0.1:8000/docs`

The root endpoint reports that the OilTrace API is running.

## 9. Start the frontend

Open a **second** terminal in the repository:

```powershell
cd frontend
python -m http.server 5500
```

Open in a browser:

```text
http://localhost:5500
```


## 10. Demo workflow

1. Start the FastAPI backend.
2. Start the frontend static server.
3. Open the dashboard.
4. Select a Sentinel-1 SAR image.
5. Provide the image footprint: North, South, East, West.
6. Run analysis.
7. The frontend sends the image + footprint to `/api/analyze`.
8. The backend loads the DeepLabV3+ model.
9. The model predicts five classes per pixel.
10. The oil class is isolated into a binary oil mask.
11. The binary mask is converted into polygons.
12. Pixel coordinates are converted to geographic coordinates using the supplied footprint.
13. Area, perimeter, and center are calculated.
14. The frontend displays the real, segmentation-derived spill information.

## 11. Accuracy

For a real image, the geographic result is only as good as the supplied image footprint. The current implementation uses the footprint supplied by the user and maps pixel coordinates **linearly** into that bounding box.

## 12. The segmentation model

```text
Input SAR image
      |
      v
ResNet-50 encoder
      |
      v
DeepLabV3+ decoder
      |
      v
5-class logits
      |
      v
Argmax / predicted mask
```

| ID | Class | Notes |
|---:|---|---|
| 0 | Sea Surface | Background class |
| 1 | Oil Spill | Isolated into the binary oil mask used downstream |
| 2 | Look-alike | Dark SAR features that resemble oil but are not — reduces false positives |
| 3 | Ship | Vessel returns |
| 4 | Land | Landmass |

Normalization statistics used at inference: `mean = 0.5185`, `std = 0.197`. The checked-in checkpoint is stored with Git LFS at `ml/models/resnet_50_deeplab_v3+/oil_spill_seg_resnet_50_deeplab_v3+_80.pt`.

## 13. API summary

```text
POST /api/analyze
```

Multipart form fields: `file` (SAR image), `north`, `south`, `east`, `west` (floats, with `north > south` and `east > west`).

```bash
curl -X POST "http://127.0.0.1:8000/api/analyze" \
  -F "file=@sample.jpg" \
  -F "north=18" \
  -F "south=17" \
  -F "east=72" \
  -F "west=71"
```

Full request/response schema, field-by-field documentation, and a worked example are in **ARCHITECTURE.md** and the project guide PDF.

## 14. Datasets

The Git repository intentionally does **not** contain the complete large training datasets — only a small sample inference image at `demo/Oil_Spill_Segmentation/sample_image_for_inference/img_0814.jpg`, plus an empty `data/.gitkeep` placeholder.

| Dataset | Type | Best used for |
|---|---|---|
| DARTIS-2019 | Sentinel-1 imagery + Pascal VOC XML bounding boxes | Object/localization-style oil detection experiments — **not** pixel-level segmentation |
| M4D | Sentinel-1 imagery + ground-truth segmentation masks, multiple classes | Direct match for the current five-class segmentation formulation |

Datasets are shared with the team via the institution's shared storage, never committed to Git and never accompanied by credentials in source code. See the project guide PDF's Data & Dataset Handoff sections for the full checklist.

## 15. Suggested team roles for presentation

- **Problem & motivation** — why rapid spill detection matters.
- **ML / detection** — model architecture, preprocessing, segmentation output.
- **Backend** — API, geoprocessing, geographic conversion.
- **Frontend** — Leaflet dashboard and user workflow.
- **Integration / limitations** — distinguish real implementation from prototype/demo components.

## 16. Quick troubleshooting

| Symptom | Fix |
|---|---|
| Model file is a tiny pointer, not the real weights | `git lfs install && git lfs pull` |
| `ModuleNotFoundError` | Activate `mlvenv` then `pip install -r requirements.txt` |
| Backend import error | Run `uvicorn backend.main:app --reload --port 8000` **from the repository root** |
| Frontend can't call the API | Confirm backend is on port 8000, frontend served via `python -m http.server 5500` (not `file://`), and `frontend/js/api.js` points to `http://127.0.0.1:8000` |
| Dataset missing | Datasets are intentionally excluded from Git — obtain from shared team storage |

The full troubleshooting reference (9 scenarios) is in the project guide PDF.

## 17. Reproducibility checklist

Before presenting, verify:

- [ ] Git LFS model downloaded
- [ ] `pip install -r requirements.txt` completed
- [ ] Backend starts
- [ ] Swagger opens
- [ ] Frontend opens
- [ ] Sample SAR image is available
- [ ] Footprint values are prepared
- [ ] One successful oil-positive analysis has been tested
- [ ] Team knows which dashboard elements are real ML output and which are prototype/demo data

## 18. Project documentation set

| Document | Purpose |
|---|---|
| `README.md` | This file — orientation, setup, and quick reference |
| `SRS.md` | Software Requirements Specification — what the system must do |
| `SDD.md` | Software Design Description — how the system is built internally |
| `ARCHITECTURE.md` | System architecture — components, layers, data flow, deployment |
| **OilTrace — Complete Project Guide (PDF)** | Consolidated operational guide: quickstart, full setup, API reference, data & model guide, workflow deep-dive, troubleshooting, presentation runbook, and viva Q&A |

## 19. Known limitations

1. Exact Sentinel-1 metadata georeferencing is not automatically derived in the current API.
2. Vessel attribution is not proven as a complete live AIS-to-incident pipeline.
3. Drift/environmental layers are not all backed by live external data.
4. Some dashboard values remain synthetic/demo values.
5. Geographic area depends strongly on footprint quality and the linear approximation used.
6. The trained model is one fixed checkpoint; the repository does not automatically retrain it.
7. Large datasets remain outside Git for size, licensing, and reproducibility reasons.

## 20. Roadmap

```text
Current:
SAR segmentation + geospatial characterization

Next:
automatic Sentinel-1 metadata georeferencing
        +
live AIS fusion
        +
environmental drift prediction
        +
incident evidence / alerts
```

See **ARCHITECTURE.md §12 (Future / target architecture)** for the full end-to-end conceptual pipeline.
