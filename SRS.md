# Software Requirements Specification (SRS)
## OilTrace — Oil Spill Detection and Vessel Attribution System

**Problem Statement:** PS 26143 (NTRO — Disaster Management theme)
**Event:** Smart India Hackathon 2026 (internal round)
**Team size:** 5 · **Build window:** 2 days
**Document status:** Living document — reflects the prototype as implemented, distinguishing real behavior from planned/prototype behavior throughout.

---

## Table of contents

1. Introduction
2. Overall description
3. System features / functional requirements
4. External interface requirements
5. Data requirements
6. Non-functional requirements
7. Constraints
8. Assumptions and dependencies
9. Limitations
10. Future requirements
11. Acceptance criteria
12. Appendix A — Requirements traceability
13. Appendix B — Glossary

---

## 1. Introduction

### 1.1 Purpose

This SRS defines the functional and non-functional requirements for **OilTrace**, a prototype decision-support system that detects possible marine oil spills from satellite Synthetic Aperture Radar (SAR) imagery and provides a foundation for geographic characterization, vessel attribution, and drift analysis. It is the authoritative statement of *what* the system must do; **SDD.md** and **ARCHITECTURE.md** describe *how* it is built.

### 1.2 Document conventions

- Functional requirements are numbered `FR-XX`; non-functional requirements `NFR-XX`.
- Priority levels: **High** (needed for the core validated demo path), **Medium** (supports the demo but is not on the critical path).
- Code and file paths are shown in `monospace`.
- Statements marked **[prototype]** describe architecture/interfaces that exist in the codebase but are not part of the fully validated, live demonstration path — see §9, Limitations.

### 1.3 Intended audience and reading suggestions

- **Hackathon judges / evaluators** — read §1, §2, §9 (Limitations) and §11 (Acceptance criteria) for a fast, honest picture of what is real.
- **Development team** — read the full document, together with SDD.md and ARCHITECTURE.md.
- **New team members** — start with §2 (Overall description), then the project guide PDF's Quickstart section for hands-on setup.

### 1.4 Project scope

The current implementation focuses on the validated, end-to-end path:

```text
SAR image
  -> semantic segmentation
  -> oil mask
  -> spill polygon
  -> geographic characterization
  -> dashboard visualization
```

The larger system architecture additionally defines (but does not yet fully validate live) components for:

```text
AIS ingestion
Vessel attribution
Environmental / metocean data
Drift forecasting
Incident / scenario management
```

### 1.5 Intended users

- Disaster-management teams
- Maritime monitoring teams
- Environmental analysts
- Technical investigators
- Prototype/demo evaluators (hackathon judges)

### 1.6 References

- `README.md` — setup and orientation
- `SDD.md` — software design description
- `ARCHITECTURE.md` — system architecture
- OilTrace Complete Project Guide (PDF) — operational reference, API examples, viva Q&A

---

## 2. Overall description

### 2.1 Product perspective

OilTrace is a new, standalone prototype built specifically to address PS 26143. It is not a modification of an existing fielded product. It consists of a client-server web application (Leaflet dashboard + FastAPI backend) plus a set of ML, geoprocessing, and prototype investigative services.

```text
User
 |
 v
Web dashboard
 |
 v
FastAPI
 |
 +--> ML segmentation
 |
 +--> Geoprocessing
 |
 +--> AIS / Attribution / Drift modules [prototype / future integration]
```

### 2.2 Product functions (summary)

- Accept a SAR image and a user-supplied geographic footprint.
- Run a trained semantic segmentation model to classify every pixel into one of five classes.
- Isolate the oil-spill class and derive a clean spill mask.
- Convert the spill mask into geographic polygons, with area, perimeter, and center.
- Visualize the SAR-derived spill geometry on an interactive map.
- Provide an architectural foundation (data models and service stubs) for AIS ingestion, vessel attribution, and drift forecasting, to be completed in future iterations.

### 2.3 User classes and characteristics

| User class | Characteristics | Primary needs |
|---|---|---|
| Disaster-management analyst | Domain expert, not necessarily technical | Fast, visual identification of spill location and extent |
| Maritime monitoring operator | Familiar with AIS/vessel tracking concepts | Eventual vessel attribution and drift context |
| Environmental analyst | Interested in spill extent and movement | Area/perimeter metrics, future drift forecasts |
| Technical investigator / judge | Evaluates system correctness and honesty | Clear separation of real vs. prototype behavior, reproducible demo |

### 2.4 Operating environment

- Server: any machine capable of running Python 3.10+ and PyTorch (CPU sufficient; GPU optional and faster).
- Client: any modern desktop web browser (dashboard is browser-based, served over HTTP, not `file://`).
- OS: Windows 10/11, Linux, or macOS.
- Network: localhost by default for the demo (`127.0.0.1:8000` backend, `localhost:5500` frontend); no external network dependency for the core segmentation path once the model and dependencies are installed.

### 2.5 Design and implementation constraints

- The backend must be started from the repository root so relative imports resolve (`uvicorn backend.main:app`).
- The trained model checkpoint is distributed via Git LFS and must be pulled explicitly.
- The frontend must be served through an HTTP server (e.g., `python -m http.server`), not opened as a local file, due to CORS restrictions.
- Preprocessing (padding, resizing, normalization with `mean=0.5185`, `std=0.197`) must remain consistent with what the model was trained with; ad hoc substitution (e.g., a generic `/255` normalization) is not equivalent and is disallowed.
- Large datasets and local virtual environments must not be committed to Git.

### 2.6 Assumptions and dependencies

See §8.

---

## 3. System features / functional requirements

| ID | Requirement | Description | Priority |
|---|---|---|---|
| FR-01 | SAR image upload | The system shall allow the user to select/upload a SAR image through the dashboard. | High |
| FR-02 | Footprint input | The system shall accept north, south, east, and west bounds describing the image footprint. | High |
| FR-03 | ML inference | The backend shall invoke the trained ResNet-50 + DeepLabV3+ segmentation model on the uploaded image. | High |
| FR-04 | Five-class segmentation | The system shall classify every pixel into one of: Sea Surface, Oil Spill, Look-alike, Ship, Land. | High |
| FR-05 | Oil mask generation | The backend shall extract a binary mask of pixels predicted as Oil Spill. | High |
| FR-06 | Polygon generation | The backend shall convert the oil mask into polygonal spill geometries (cleanup, contour detection, contour approximation, minimum-area filtering). | High |
| FR-07 | Geographic conversion | The backend shall convert image-space polygon vertices into geographic coordinates using the supplied footprint. | High |
| FR-08 | Spill metrics | The backend shall compute oil-pixel count, oil percentage, spill polygon count, approximate area (km²), approximate perimeter (km), and approximate center (lat/lon). | High |
| FR-09 | Visualization | The frontend shall render the returned spill geometry as a layer on an interactive (Leaflet) map. | High |
| FR-10 | API documentation | The backend shall expose interactive API documentation via FastAPI/Swagger at `/docs`. | Medium |
| FR-11 | Reproducible local setup | The project shall provide a repeatable, documented local workflow for setup and demonstration. | High |
| FR-12 | Future AIS/attribution/drift integration | The architecture shall accommodate future integration of AIS ingestion, vessel attribution, and drift forecasting without redesigning the core segmentation/geoprocessing path. | Medium |

---

## 4. External interface requirements

### 4.1 User interfaces

A browser-based Leaflet dashboard (`frontend/index.html`) providing: SAR image selection, footprint entry (N/S/E/W), an "analyze" action, and a map view that renders the returned spill polygon(s) along with segmentation-derived metrics. Some dashboard panels (vessels, drift, timeline, confidence/scenario context) currently render prototype/demo data sourced from `frontend/js/data.js` — see §9.

### 4.2 API interfaces

```text
GET  /                → API status
POST /api/analyze     → run segmentation + geospatial characterization
```

`POST /api/analyze` accepts `multipart/form-data` with fields `file` (image), `north`, `south`, `east`, `west` (floats; validation requires `north > south` and `east > west`) and returns a JSON payload containing image dimensions, footprint echo, per-class pixel counts, oil pixel count/percentage, and spill geometry (detected flag, polygon count, center, area, perimeter, polygon list). Full field-by-field documentation and a worked example are in the project guide PDF and ARCHITECTURE.md §5.

### 4.3 ML model interface

- **Input:** a preprocessed image tensor (padded/resized per the training pipeline, normalized with `mean=0.5185`, `std=0.197`).
- **Output:** five-class segmentation logits, argmax'd to a predicted per-pixel class mask, resized back to the original input resolution.

### 4.4 Hardware interfaces

None required beyond a standard CPU; an available CUDA GPU is used opportunistically for faster inference where supported by the local PyTorch/CUDA installation, but is not a hard requirement.

### 4.5 Software interfaces

- **Git LFS** for the trained model checkpoint.
- **PyTorch** runtime for model inference.
- **FastAPI/Uvicorn** for the backend HTTP service.
- **Streamlit** for a separate standalone inference/demo application (`demo/Oil_Spill_Segmentation/app.py`).

### 4.6 Communications interfaces

Localhost HTTP between the frontend (port 5500) and backend (port 8000) for the demo; CORS is enabled on the backend for this purpose. No authentication is implemented in the current prototype (see §9 and Security considerations in SDD.md §9).

---

## 5. Data requirements

### 5.1 Inputs

- SAR image (e.g., Sentinel-1 derived raster, JPEG/PNG as accepted by the upload endpoint).
- Geographic footprint (north, south, east, west), supplied by the user.

### 5.2 Outputs

- Per-class pixel counts (five classes).
- Binary oil mask.
- Spill polygon(s), in both pixel and geographic coordinates.
- Approximate geographic metrics: area (km²), perimeter (km), center (lat/lon).

### 5.3 External / training data

The architecture allows for the following external data sources, none of which are stored in Git:

| Source | Description | Fit |
|---|---|---|
| DARTIS-2019 | SAR imagery with Pascal VOC XML object/bounding-box annotations | Object/localization-style detection — **not** a segmentation-mask dataset |
| M4D | Sentinel-1 imagery with ground-truth segmentation masks, multiple classes | Direct match for the current five-class segmentation formulation |
| AIS data | Vessel position/track feeds | Future vessel-attribution input **[prototype]** |
| Environmental / metocean data | Wind, current, and related data | Future drift-forecasting input **[prototype]** |

Large datasets are shared through the team's authorized shared storage, never through Git and never alongside credentials.

---

## 6. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Reproducibility | The repository shall document setup and runtime commands sufficient for a new team member or judge to reproduce the demo. |
| NFR-02 | Maintainability | ML, API, geoprocessing, frontend, and supporting (AIS/attribution/drift) services shall remain modular and independently replaceable. |
| NFR-03 | Performance | The system shall provide feedback quickly enough for an interactive, live demonstration on a standard presentation machine; inference should complete in a practical amount of time on CPU. |
| NFR-04 | Reliability / robustness | The system shall return structured error responses for failed requests (e.g., malformed image, invalid footprint ordering) rather than crashing the frontend. |
| NFR-05 | Portability | The system shall run in a standard Python 3.10+ environment without requiring the original developer's specific virtual environment. |
| NFR-06 | Security | Secrets, credentials, local environments, and large raw datasets shall not be stored in source control; production deployments require authentication and restricted CORS before exposing incident data (see SDD.md §9). |
| NFR-07 | Scalability | The architecture shall permit future AIS, environmental, drift, and attribution integrations without a fundamental redesign of the core segmentation/geoprocessing path. |

---

## 7. Constraints

- Current geographic conversion uses a footprint supplied by the user, not automatic sensor georeferencing.
- Large datasets are external to Git for size and licensing reasons.
- Some dashboard elements are prototype/demo data and must be presented honestly as such.
- The checked-in model is a single trained checkpoint, not a live training/retraining service.
- Model accuracy depends on training data quality, preprocessing consistency, and scene conditions.

---

## 8. Assumptions and dependencies

- The user can supply a valid, reasonably accurate image footprint.
- The trained model checkpoint is present locally via Git LFS before the backend starts.
- Required Python dependencies (`requirements.txt`) can be installed in the target environment.
- The bundled sample SAR image is available for demonstration.
- The supplied footprint is a reasonable rectangular representation of the image's geographic coverage (the system does not verify this independently).

---

## 9. Limitations

This SRS does not claim complete live AIS attribution or automatic Sentinel-1 metadata georeferencing, because those capabilities are not fully implemented end-to-end in the current repository. Specifically:

1. Exact Sentinel-1 metadata georeferencing is not automatically derived by the current API — the user supplies the footprint.
2. Vessel attribution is not proven as a complete, live AIS-to-incident pipeline; it exists as an architectural/service stub.
3. Drift and environmental layers are not all backed by live external data.
4. Some dashboard values (vessels, drift, timeline, confidence/scenario) remain synthetic/demo values from `frontend/js/data.js`.
5. Geographic area/perimeter/center depend strongly on footprint accuracy and the linear (equirectangular-style) approximation used — they are not survey-grade measurements.
6. The trained model is one fixed checkpoint; the system does not automatically retrain or version models.
7. Large datasets remain outside Git for size, licensing, and reproducibility reasons.

The team commits to describing the system according to this real-vs-prototype distinction in every presentation, per the project guide PDF's presentation guidance.

---

## 10. Future requirements

Planned extensions beyond the current validated prototype:

- Automatic Sentinel-1 metadata (SAFE product) georeferencing.
- Real AIS ingestion pipeline.
- Vessel-track matching and attribution scoring (spatial proximity + time alignment + movement analysis).
- Real ocean-current/wind (metocean) data ingestion.
- Physics- and/or data-driven drift forecasting.
- Confidence and uncertainty calibration for segmentation and attribution outputs.
- Persistent incident database.
- Role-based access control and authentication.
- Model version management and retraining pipeline.

---

## 11. Acceptance criteria

A demonstration is considered functional when all of the following hold:

1. The repository can be cloned.
2. The Git LFS model can be downloaded.
3. Dependencies install successfully.
4. The backend starts without error.
5. Swagger UI (`/docs`) is accessible.
6. The frontend starts and is reachable in a browser.
7. A SAR image can be submitted with a valid footprint.
8. The model returns a five-class segmentation.
9. An oil mask is produced (empty or non-empty, without error).
10. Geographic spill geometry (when detected) is displayed correctly on the dashboard map.

---

## 12. Appendix A — Requirements traceability

| Requirement | Primary component(s) | Related design section |
|---|---|---|
| FR-01, FR-02 | `frontend/index.html`, `frontend/js/api.js` | SDD.md §2 Presentation layer |
| FR-03, FR-04 | `SegmentationService`, `ResNet50DeepLabV3Plus` | SDD.md §3, ARCHITECTURE.md §4 |
| FR-05, FR-06, FR-07, FR-08 | `GeoprocessingService` | SDD.md §3, §6; ARCHITECTURE.md §5 |
| FR-09 | `frontend/js/app.js` (Leaflet layer) | ARCHITECTURE.md §2 |
| FR-10 | FastAPI auto-generated docs | ARCHITECTURE.md §3 |
| FR-11 | `README.md`, project guide PDF | — |
| FR-12 | `ais_service.py`, `attribution_service.py`, `drift_service.py` | SDD.md §3, §10; ARCHITECTURE.md §7 |

---

## 13. Appendix B — Glossary

| Term | Meaning |
|---|---|
| SAR | Synthetic Aperture Radar — a satellite imaging technique usable day/night and in most weather |
| AIS | Automatic Identification System — vessel-broadcast tracking data |
| Look-alike | A SAR feature that visually resembles an oil slick but is caused by something else (e.g., biogenic films, wind shadow) |
| Footprint | The geographic bounding box (north/south/east/west) describing the coverage of an image |
| DARTIS-2019 | A SAR oil-spill dataset with object/bounding-box (Pascal VOC XML) annotations |
| M4D | A Sentinel-1 oil-spill dataset with pixel-level segmentation masks |
| Metocean | Meteorological and oceanographic (wind, current) data used for drift forecasting |