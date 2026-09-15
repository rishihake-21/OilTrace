# OilTrace — System Architecture

**Companion documents:** `SRS.md` (requirements), `SDD.md` (internal design), `README.md` (setup)

---

## Table of contents

1. High-level architecture
2. Frontend layer
3. Backend layer
4. ML layer
5. Geospatial layer
6. Data layer
7. Prototype vs. real data separation
8. Repository / module map
9. Technology stack
10. Deployment architecture
11. Design principles
12. Future / target system architecture

---

## 1. High-level architecture

```text
                    +--------------------------+
                    |        User / Judge      |
                    +------------+-------------+
                                 |
                                 v
                    +--------------------------+
                    |   Web Dashboard (Leaflet) |
                    |     frontend/index.html   |
                    +------------+-------------+
                                 |
                    HTTP POST /api/analyze
                                 |
                                 v
                    +--------------------------+
                    |      FastAPI Backend      |
                    |      backend/main.py      |
                    +------------+-------------+
                                 |
                  +--------------+--------------+
                  |                             |
                  v                             v
       +--------------------+        +--------------------+
       | Segmentation       |        | Geoprocessing      |
       | segmentation_      |        | geoprocessing_     |
       | service.py         |        | service.py         |
       +---------+----------+        +---------+----------+
                 |                             |
                 v                             v
       +--------------------+        +--------------------+
       | ResNet-50 Encoder  |        | Mask -> Polygon    |
       | + DeepLabV3+       |        | Pixel -> Geo       |
       +---------+----------+        | Area / Perimeter   |
                 |                   +--------------------+
                 v
       +--------------------+
       | 5-class mask       |
       | Sea/Oil/Look-alike |
       | Ship/Land          |
       +--------------------+
                 |
                 +---------------> JSON response
                                      |
                                      v
                              Dashboard visualization

Other modules:
AIS -> Attribution -> Drift -> Scenario analysis
(currently prototype/partially integrated)
```

**Design intent:** two independent processing branches — an ML/segmentation branch and a geoprocessing branch — share the same FastAPI request and converge into one JSON response. This keeps the ML model swappable without touching the geospatial math, and vice versa.

---

## 2. Frontend layer

Main files:

- `frontend/index.html`
- `frontend/js/app.js`
- `frontend/js/api.js`
- `frontend/js/data.js`
- `frontend/style.css`

Responsibilities:

- Dashboard UI shell.
- SAR image file selection.
- Footprint (N/S/E/W) input.
- Triggering the API call and handling the response.
- Map visualization (Leaflet) of the real, segmentation-derived spill layer.
- Display of segmentation-derived metrics (oil pixels, percentage, polygon count, area, perimeter, center).
- Prototype/demo layers for vessels, drift, and timeline, sourced from `data.js`.

`api.js` contains the backend integration function `analyzeSARImage(file, north, south, east, west)`, which posts a `FormData` request to `http://127.0.0.1:8000/api/analyze`.

---

## 3. Backend layer

### 3.1 FastAPI entry point

`backend/main.py` — creates the FastAPI application, enables CORS middleware, registers the analysis router, and exposes a root status endpoint (`GET /`).

### 3.2 Analysis route

`backend/api/routes_analysis.py` accepts:

- `file` — the SAR image
- `north`, `south`, `east`, `west` — footprint bounds

Processing sequence:

```text
Upload
  -> decode image
  -> model prediction
  -> oil mask
  -> polygon extraction
  -> geographic conversion
  -> area/perimeter/center
  -> JSON response
```

Field validation expects `north > south` and `east > west`; the service call is made through the singleton getter `get_segmentation_service()` rather than a directly exposed module-level variable, so model loading stays lazy and centralized.

---

## 4. ML layer

### 4.1 Model class

`ResNet50DeepLabV3Plus`, using:

- ResNet-50 encoder
- DeepLabV3+ segmentation decoder
- 5 semantic output classes

The output is resized back to the input image's original resolution.

### 4.2 Class mapping

```text
0 Sea Surface
1 Oil Spill
2 Look-alike
3 Ship
4 Land
```

### 4.3 Normalization

Recorded training/inference configuration:

```text
mean = 0.5185
std  = 0.197
```

The model/inference code applies these normalization statistics; the original training pipeline also applies project-specific image padding. The current backend implementation is treated as the authoritative runtime path when demonstrating the integrated API — do not substitute a different, ad hoc normalization scheme.

Checkpoint location (Git LFS):

```text
ml/models/resnet_50_deeplab_v3+/oil_spill_seg_resnet_50_deeplab_v3+_80.pt
```

---

## 5. Geospatial layer

### 5.1 Pixel-to-geographic conversion

Given:

```text
image_width, image_height
north, south, east, west
```

The implementation maps:

```text
longitude = west + (x / image_width) * (east - west)
latitude  = north - (y / image_height) * (north - south)
```

This is a simple linear/equirectangular-style approximation.

### 5.2 Area and perimeter

The backend converts polygon coordinates into approximate geographic distance/area calculations. These values should be described as prototype geospatial estimates unless footprint accuracy and projection validity are independently confirmed for the target imagery.

### 5.3 API contract (reference)

```text
POST /api/analyze
Content-Type: multipart/form-data

file:   <SAR image>
north:  <float>
south:  <float>
east:   <float>
west:   <float>
```

Representative response:

```json
{
  "success": true,
  "filename": "image.jpg",
  "image": { "width": 640, "height": 640 },
  "footprint": { "north": 18.0, "south": 17.0, "east": 72.0, "west": 71.0 },
  "segmentation": {
    "classes": {
      "Sea Surface": 341535,
      "Oil Spill": 260,
      "Look-alike": 43323,
      "Ship": 132,
      "Land": 24350
    },
    "oil_pixels": 260,
    "oil_percentage": 0.0635
  },
  "spill": {
    "detected": true,
    "polygon_count": 1,
    "center": { "lat": 17.724753289473686, "lon": 71.56488486842106 },
    "area_km2": 6.455251,
    "perimeter_km": 7.968605,
    "polygons": []
  }
}
```

Example call:

```bash
curl -X POST "http://127.0.0.1:8000/api/analyze" \
  -F "file=@sample.jpg" \
  -F "north=18" -F "south=17" -F "east=72" -F "west=71"
```

The values above are from a previously executed test with a demo footprint and should not be interpreted as any image's true coordinates.

---

## 6. Data layer

The Git repository intentionally contains:

- code
- configuration
- documentation
- a small sample SAR image (`demo/Oil_Spill_Segmentation/sample_image_for_inference/img_0814.jpg`)

The large training datasets are kept outside Git (`data/` exists only via `.gitkeep`). Expected external dataset categories include:

- **DARTIS-2019** — Sentinel-1 oil-spill imagery with Pascal VOC XML bounding-box annotations.
- **M4D** — Oil Spill Detection Dataset with segmentation masks.
- Other SAR datasets used during experimentation.

Not every dataset is suitable for the same task:

- DARTIS-2019 is primarily useful for object/bounding-box style oil detection.
- M4D contains semantic segmentation labels and is more directly aligned with the current segmentation formulation.
- A classification-only (oil / no-oil) dataset is not equivalent to a segmentation dataset.

---

## 7. Prototype vs. real data separation

`frontend/js/data.js` currently supports a demo experience with synthetic:

- vessels
- drift
- timeline
- confidence / scenario context

These values are **not** the same as live AIS/environmental measurements, and the architecture keeps them in a clearly separate file precisely so the real and synthetic data paths never merge silently.

For judging, the architecture should be explained honestly as:

```text
Real SAR -> ML segmentation -> geospatial spill geometry
                     |
                     +-> future integration:
                         AIS -> vessel attribution
                         metocean -> drift forecast
```

---

## 8. Repository / module map

```text
OilTrace/
├── backend/
│   ├── api/routes_analysis.py       # /api/analyze endpoint
│   ├── schemas/analysis.py          # API schema definitions
│   ├── services/
│   │   ├── segmentation_service.py  # ML inference
│   │   ├── geoprocessing_service.py # mask -> polygon -> geographic metrics
│   │   ├── ais_service.py           # [prototype]
│   │   ├── attribution_service.py   # [prototype]
│   │   └── drift_service.py         # [prototype]
│   ├── utils/config.py
│   └── main.py                      # FastAPI application
│
├── demo/Oil_Spill_Segmentation/
│   ├── app.py                       # Streamlit demo
│   ├── sample_image_for_inference/
│   └── training/
│
├── frontend/
│   ├── index.html
│   ├── js/{api.js, app.js, data.js}
│   └── style.css
│
├── ml/
│   ├── models/resnet_50_deeplab_v3+/oil_spill_seg_resnet_50_deeplab_v3+_80.pt
│   └── training/
│
├── src/                              # broader, future-facing architecture mirror
│   ├── ais/  ├── api/  ├── attribution/  ├── characterisation/
│   ├── detection/  ├── drift/  ├── preprocessing/  └── utils/
│
├── data/.gitkeep                     # datasets stored externally
├── tests / test_*.py
├── requirements.txt
├── SRS.md / SDD.md / ARCHITECTURE.md / Requirements.md
├── .gitignore / .gitattributes
```

---

## 9. Technology stack

| Concern | Technology |
|---|---|
| Backend web framework | FastAPI + Uvicorn (Python) |
| ML framework | PyTorch |
| Segmentation model | ResNet-50 encoder + DeepLabV3+ decoder, 5 classes |
| Geoprocessing | Contour extraction, polygon approximation, linear pixel↔geo mapping |
| Frontend | HTML / CSS / vanilla JS |
| Mapping | Leaflet.js |
| Standalone demo | Streamlit |
| Model artifact storage | Git LFS |
| Target external data | Sentinel-1 SAR (DARTIS-2019, M4D), AIS feeds, metocean data |

---

## 10. Deployment architecture

### 10.1 Local demo (current)

```text
Browser : http://localhost:5500   (python -m http.server)
FastAPI : http://127.0.0.1:8000   (uvicorn backend.main:app --reload)
Model   : local filesystem / Git LFS
```

Two terminal processes, run side by side, no containerization.

### 10.2 Future / target deployment

```text
Browser
   |
Reverse proxy
   |
FastAPI
   |
GPU/CPU inference service
   |
Model storage
```

Would add TLS termination, authenticated routing, horizontally scalable inference, and versioned model storage.

---

## 11. Design principles

- **Modularity** — presentation, API, ML, and geoprocessing concerns are separated into independent files/services so any one can be replaced without touching the others.
- **Honesty by construction** — prototype/demo data (`data.js`, AIS/attribution/drift service stubs) is physically separated from the real, validated segmentation/geoprocessing path, not just documented as separate.
- **Simplicity for the build window** — the inference path is kept as simple as the two-day hackathon timeline allows, while still being a real, working ML pipeline rather than a mock.
- **Extensibility** — service boundaries for AIS, attribution, and drift are reserved in both `backend/services/` and the broader `src/` tree so future work has a clear home.
- **Data hygiene** — large datasets and local environments are kept outside source control by design (`data/.gitkeep`, `.gitignore`).

---

## 12. Future / target system architecture

```text
                 Sentinel-1 SAR
                       |
                       v
                Oil spill detection
                       |
                       v
              Semantic segmentation
                       |
                       v
                Spill characterization
                 /        |        \
                /         |         \
               v          v          v
          Geometry     Location    Confidence
               |
               v
         Candidate incident
               |
       +-------+--------+
       |                |
       v                v
    Vessel AIS       Environmental data
       |                |
       v                v
 Attribution       Drift forecast
       \                /
        \              /
         +------------+
              |
              v
       Decision support
```

Fully expanded target production pipeline (see SDD.md §11 for the design-level view):

```text
Sentinel-1 SAFE / metadata
        |
        v
Automatic georeferencing
        |
        v
Radiometric / speckle preprocessing
        |
        v
Model inference
        |
        v
Spill polygon
        |
        +----> AIS track matching
        |
        +----> Metocean drift model
        |
        +----> Confidence / uncertainty
        |
        v
Incident report + map + alert
```

The currently validated path (SAR → segmentation → geospatial geometry → dashboard) forms the top of this pipeline; AIS fusion, drift forecasting, and incident reporting are the next architectural milestones, per `SRS.md §10 (Future requirements)`.