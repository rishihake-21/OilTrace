# Software Design Description (SDD)
## OilTrace — Oil Spill Detection and Vessel Attribution System

**Companion documents:** `SRS.md` (requirements), `ARCHITECTURE.md` (system architecture), `README.md` (setup)

---

## Table of contents

1. Design goals
2. Logical components (layered view)
3. Component / service responsibilities
4. Detailed analysis sequence
5. Data structures
6. Geospatial algorithm design
7. Model design detail
8. Error handling design
9. Security considerations
10. Deployment design
11. Future architecture
12. Appendix — Module dependency summary

---

## 1. Design goals

- Separate UI, API, ML, geoprocessing, and supporting services into independent, swappable modules.
- Keep the inference path simple enough to build and demo within a two-day hackathon window, without sacrificing correctness of the validated path.
- Allow later integration of AIS, attribution, and drift services without redesigning the segmentation/geoprocessing core.
- Keep large datasets and local runtime environments outside source control.
- Make the boundary between "real, validated" behavior and "prototype/demo" behavior explicit in the design itself (separate service modules, separate demo data file), not just in documentation.

---

## 2. Logical components (layered view)

### Presentation layer

```text
frontend/
├── index.html
├── js/{api.js, app.js, data.js}
└── style.css
```

### API layer

```text
backend/main.py
backend/api/routes_analysis.py
backend/schemas/analysis.py
```

### Service layer

```text
backend/services/
├── segmentation_service.py
├── geoprocessing_service.py
├── ais_service.py            [prototype]
├── attribution_service.py    [prototype]
└── drift_service.py          [prototype]
```

### ML layer

```text
ml/training/
ml/models/resnet_50_deeplab_v3+/
```

### Legacy / extended architecture layer

```text
src/
├── ais/
├── api/
├── attribution/
├── characterisation/
├── detection/
├── drift/
├── preprocessing/
└── utils/
```

This tree represents the broader intended system architecture (object-oriented modules mirroring the future production pipeline described in §11); it coexists with the leaner `backend/`-centric implementation actually exercised by the live demo.

### Demo layer

```text
demo/Oil_Spill_Segmentation/
├── app.py               # Streamlit inference demo
├── sample_image_for_inference/
└── training/
```

---

## 3. Component / service responsibilities

### 3.1 SegmentationService

File: `backend/services/segmentation_service.py`

Responsibilities:

1. Load the trained model checkpoint (`ml/models/resnet_50_deeplab_v3+/oil_spill_seg_resnet_50_deeplab_v3+_80.pt`).
2. Select CPU/GPU according to the available local PyTorch/CUDA installation.
3. Preprocess the input image (padding/resizing consistent with the training pipeline, normalization with `mean=0.5185`, `std=0.197`).
4. Run model inference (forward pass).
5. Convert output logits to a predicted per-pixel class map via argmax.
6. Count pixels per class (five classes).
7. Extract a binary oil mask (class `1`).
8. Calculate oil percentage.
9. Return the mask, class counts, and image dimensions to the downstream geoprocessing stage.

Access pattern: the route layer obtains the service through a singleton getter, `get_segmentation_service()` — there is intentionally no module-level `segmentation_service` variable exposed directly. This keeps model loading lazy and centralized.

### 3.2 GeoprocessingService

File: `backend/services/geoprocessing_service.py`

Responsibilities:

- `mask_to_polygon` — binarize the oil mask, apply morphological cleanup, detect contours, approximate contours to polygons, and filter by minimum area. Input: binary oil mask. Output: pixel-space polygon(s).
- `pixel_to_geo` — convert a single `(x, y)` pixel coordinate to `(latitude, longitude)` using image dimensions and the user-supplied footprint.
- `pixel_polygons_to_geo` — apply `pixel_to_geo` to every vertex of every polygon.
- `calculate_geo_area_km2` — compute an approximate geographic area for a polygon.
- `calculate_geo_perimeter_km` — compute an approximate geographic perimeter for a polygon.
- `calculate_polygon_center` — return `{"lat": ..., "lon": ...}` for a polygon's approximate center.

See §6 for the exact geospatial formulas.

### 3.3 AIS service **[prototype]**

File: `backend/services/ais_service.py`

Intended responsibility: ingest and prepare vessel track information for correlation with detected spills.

Current status: prototype module; not a proven, live AIS pipeline in the current presentation workflow.

### 3.4 Attribution service **[prototype]**

File: `backend/services/attribution_service.py`

Intended responsibility: associate candidate vessels with a spill event using spatial proximity, time alignment, and movement analysis.

Current status: prototype/architecture component.

### 3.5 Drift service **[prototype]**

File: `backend/services/drift_service.py`

Intended responsibility: forecast the likely movement of a detected spill using metocean (wind/current) data.

Current status: prototype/architecture component.

---

## 4. Detailed analysis sequence

```text
HTTP request (POST /api/analyze)
  |
  v
FastAPI route (routes_analysis.py)
  |
  v
Validate footprint (north > south, east > west)
  |
  v
Decode uploaded image
  |
  v
SegmentationService.predict()
  |
  +--> preprocess (pad/resize, normalize mean=0.5185 std=0.197)
  |
  +--> model.forward()  [ResNet-50 encoder -> DeepLabV3+ decoder]
  |
  +--> argmax -> predicted 5-class mask
  |
  +--> per-class pixel counts
  |
  +--> binary oil mask (class 1)
  |
  v
GeoprocessingService.mask_to_polygon()
  |
  v
GeoprocessingService.pixel_polygons_to_geo()
  |
  v
area / perimeter / center calculation
  |
  v
Assemble JSON response
  |
  v
HTTP response -> frontend renders map layer + metrics
```

---

## 5. Data structures

### 5.1 Segmentation result (conceptual)

```text
mask            # full per-pixel class map
oil_mask        # binary mask, class 1 only
class_counts    # {class_name: pixel_count} for all 5 classes
oil_pixels      # int
oil_percentage  # float
width           # int, image width in pixels
height          # int, image height in pixels
```

### 5.2 Spill result (conceptual)

```text
detected        # bool
polygon_count   # int
center          # {lat: float, lon: float}
area_km2        # float
perimeter_km    # float
polygons        # [ { points: [{lat, lon}, ...], area_km2, perimeter_km }, ... ]
```

Each polygon carries its own geographic coordinates plus per-polygon metrics; the top-level `center`/`area_km2`/`perimeter_km` summarize the overall detection.

### 5.3 API response envelope (representative)

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

These numeric values are from a previously executed test with a demo footprint; they document the schema and are not to be interpreted as the true geolocation of any particular image.

---

## 6. Geospatial algorithm design

### 6.1 Pixel-to-geographic mapping

```python
longitude = west + (x / image_width) * (east - west)
latitude  = north - (y / image_height) * (north - south)
```

This is a simple linear/equirectangular-style approximation, not a full map-projection engine. It assumes the supplied footprint is a reasonably accurate rectangular representation of the image's geographic coverage.

### 6.2 Area and perimeter

The backend converts polygon vertex coordinates (now in lat/lon) into approximate geographic distance/area calculations. These values should be described as **prototype geospatial estimates** unless the footprint and projection accuracy have been independently validated for the target imagery.

### 6.3 Why the footprint is required at all

The ML model predicts in **image-space** (pixel) coordinates only; a segmentation mask by itself carries no geographic latitude/longitude information. The current prototype therefore asks the user to supply the image footprint, enabling the approximate transformation pipeline:

```text
pixel coordinate -> linear geographic interpolation -> latitude / longitude
```

A production-grade system should instead derive georeferencing from the original Sentinel-1 product metadata (SAFE format) and/or a true sensor-geometry / map-projection pipeline — see §11.

---

## 7. Model design detail

### 7.1 Model class

```python
class ResNet50DeepLabV3Plus:
    ...
```

Conceptual structure:

```text
Input
  |
  v
ResNet-50 encoder
  |
  +--> intermediate feature(s)
  |
  v
DeepLabV3+ decoder
  |
  v
5-class segmentation map
  |
  v
resize to original input size
```

### 7.2 Class definitions

```text
0 = Sea Surface
1 = Oil Spill
2 = Look-alike
3 = Ship
4 = Land
```

The application currently extracts only class `1` for the binary oil mask used by downstream geoprocessing.

### 7.3 Inference preprocessing statistics

```text
mean = 0.5185
std  = 0.197
```

These statistics are applied as part of image normalization and must remain consistent with what the model was trained with. **Preprocessing correctness is a hard design constraint**: do not casually replace this project's preprocessing with a generic `/255` normalization and assume equivalent model behavior — the original training code also applies project-specific image padding, and the current backend implementation is the authoritative runtime path for the integrated API demo.

---

## 8. Error handling design

Representative failure conditions the design must account for:

- Unsupported or malformed image upload.
- Invalid footprint (fails `north > south` / `east > west` validation).
- Model checkpoint file missing (e.g., Git LFS not pulled).
- Missing Python dependency.
- Backend unreachable from the frontend (wrong port, CORS/file-origin issue).
- Empty oil mask (no spill detected) — a valid, non-error outcome; the API returns a structured "not detected" response rather than treating it as a failure.

The API is designed to return a structured failure payload in all of these cases rather than allowing the frontend to crash or hang.

---

## 9. Security considerations

- Never commit secrets to the repository.
- Do not hard-code private API credentials.
- Restrict CORS to known origins before any production/public deployment (the current demo enables permissive CORS for localhost convenience only).
- Validate all uploads (type, structure) before passing them to the model.
- Add file-size and file-type restrictions before production use.
- Add authentication and authorization before exposing sensitive incident data — the current prototype has none, by design, for hackathon demo simplicity.

---

## 10. Deployment design

### 10.1 Local demo (current)

```text
Browser : http://localhost:5500   (static file server)
FastAPI : http://127.0.0.1:8000   (uvicorn)
Model   : local filesystem, retrieved via Git LFS
```

Two terminal processes are required side by side; there is no containerization or process manager in the current prototype.

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

A production deployment would add TLS termination and routing at the reverse-proxy layer, horizontally scalable inference workers, and versioned model storage — none of which are implemented in the current prototype.

---

## 11. Future architecture

```text
             Sentinel-1
                 |
                 v
        Geospatial preprocessing
                 |
                 v
           ML segmentation
                 |
                 v
        Spill characterization
            /          \
           /            \
          v              v
       AIS data      Metocean data
          |              |
          v              v
   Vessel attribution  Drift model
           \            /
            \          /
             v        v
           Incident fusion
                 |
                 v
          Analyst dashboard
                 |
                 v
        Alert / report / evidence
```

This target design keeps the currently validated SAR-segmentation-to-geometry path unchanged at the top of the pipeline and adds live AIS ingestion, vessel attribution, metocean-driven drift forecasting, and incident fusion beneath it — the same service boundaries (`ais_service`, `attribution_service`, `drift_service`) already reserved in `backend/services/` and mirrored under `src/`.

---

## 12. Appendix — Module dependency summary

| Module | Depends on | Consumed by |
|---|---|---|
| `backend/main.py` | `backend/api/routes_analysis.py` | Uvicorn process entry point |
| `routes_analysis.py` | `SegmentationService`, `GeoprocessingService`, `schemas/analysis.py` | HTTP clients (frontend, Swagger, curl) |
| `SegmentationService` | `ml/models/resnet_50_deeplab_v3+/*.pt`, PyTorch | `routes_analysis.py` |
| `GeoprocessingService` | Output of `SegmentationService` | `routes_analysis.py` |
| `ais_service.py`, `attribution_service.py`, `drift_service.py` | (future) AIS/metocean data sources | (future) `routes_analysis.py` extensions |
| `frontend/js/api.js` | Backend `/api/analyze` endpoint | `frontend/js/app.js` |
| `frontend/js/app.js` | `api.js`, Leaflet, `data.js` (demo layers) | `frontend/index.html` |