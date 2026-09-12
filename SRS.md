# Software Requirements Specification (SRS)
## For Oil Spill Detection and Vessel Attribution System (OSDVAS)
**Prepared for:** National Technical Research Organisation (NTRO)  
**SIH 2026 Problem Statement ID:** 26143  
**Theme:** Disaster Management  

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Specific Requirements](#3-specific-requirements)
4. [System Models](#4-system-models)
5. [Appendices](#5-appendices)

---

## 1. Introduction

### 1.1 Purpose
The purpose of this Software Requirements Specification (SRS) document is to detail the software requirements for the Oil Spill Detection and Vessel Attribution System (OSDVAS). This document aims to define the system's architecture, features, constraints, and operational environment based on the IEEE 830 standard. It will serve as a foundational guide for the development team, project managers, and stakeholders from the National Technical Research Organisation (NTRO) to ensure that the developed pipeline effectively identifies oil spills at sea, hindcasts/forecasts drift patterns, and attributes the incident to culpable vessels using AIS and remote sensing data.

### 1.2 Scope
The OSDVAS is an intelligent automated software pipeline designed to:
- Detect oil spills using Synthetic-Aperture Radar (SAR) and Electro-Optical (EO) imagery from remote sensing satellites (e.g., Sentinel-1, Sentinel-2).
- Characterize the detected spill by calculating geometric properties (area, perimeter, thickness approximation) and estimating its age.
- Integrate oceanographic and meteorological data (wind, waves, ocean currents) to perform hindcasting (tracing the slick back to its origin in time and space) and forecasting (predicting future drift).
- Process Automatic Identification System (AIS) data (historical and real-time/synthetic) to reconstruct maritime traffic around the origin point.
- Filter irrelevant traffic and rank potential suspect vessels based on spatio-temporal correlation, behavioral anomalies, proximity, and trajectory.
- Provide a comprehensive, interactive Visual Interface (Dashboard) for operators to visualize the spill, drift models, vessel traffic, and attribution scores.

This system facilitates swift environmental disaster response and legal accountability for maritime pollution.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term / Acronym | Definition |
|----------------|------------|
| **AIS**        | Automatic Identification System; a tracking system used on ships. |
| **API**        | Application Programming Interface. |
| **EO**         | Electro-Optical imagery. |
| **GUI**        | Graphical User Interface. |
| **Hindcasting**| The process of running models backward in time to determine the origin of a spill. |
| **ML/AI**      | Machine Learning / Artificial Intelligence. |
| **NTRO**       | National Technical Research Organisation (Organization proposing the problem). |
| **OSDVAS**     | Oil Spill Detection and Vessel Attribution System (The Product). |
| **SAR**        | Synthetic-Aperture Radar; used to create images of landscapes, highly effective for oil spill detection on water surfaces. |
| **SIH**        | Smart India Hackathon. |
| **UI/UX**      | User Interface / User Experience. |

### 1.4 References
- IEEE Std 830-1998, IEEE Recommended Practice for Software Requirements Specifications.
- Copernicus Open Access Hub (for Sentinel-1/2 data access).
- MarineCadastre (for sample AIS data formats).
- Oceanographic Data APIs (e.g., NOAA, INCOIS).

### 1.5 Overview
The rest of this document is organized as follows:
- **Section 2** provides a general overview of the product, including its perspective, primary functions, user characteristics, and constraints.
- **Section 3** specifies the functional, non-functional, external interface, and data requirements in detail.
- **Section 4** describes the system models, including use cases and data flows.
- **Section 5** contains appendices with supplementary information.

---

## 2. Overall Description

### 2.1 Product Perspective
OSDVAS is an independent software platform operating primarily as a web-based or desktop enterprise application. It functions as an integration hub that aggregates data from external satellite imagery providers, meteorological databases, and AIS data repositories. It employs a microservices or modular architecture where the ML processing engine for imagery, the oceanographic drift modeling engine, and the AIS big-data processing engine work in tandem. The system provides a unified front-end dashboard for operators.

### 2.2 Product Functions
The core capabilities of the system include:
- **Imagery Ingestion & Processing:** Automated fetching and preprocessing of SAR/EO satellite imagery.
- **Spill Detection & Characterization:** AI-driven identification of oil slicks and calculation of area, spread, and age.
- **Drift Simulation:** Forward and backward tracking of the oil slick based on environmental data.
- **Maritime Traffic Reconstruction:** Ingesting and decoding AIS data to map ship movements.
- **Attribution Engine:** Cross-referencing drift origins with ship trajectories, applying anomaly detection, and generating a ranked list of suspects.
- **Visualization & Reporting:** Interactive maps, layers, and automated report generation.

### 2.3 User Characteristics
The system is intended for use by:
1. **Environmental Analysts / Scientists:** Users with domain knowledge in oceanography and remote sensing who will interpret the drift models and imagery analysis. They require deep data insights.
2. **NTRO / Coast Guard Operators:** Primary operational users investigating incidents. They require clear dashboards, ranked suspect lists, and actionable intelligence.
3. **System Administrators:** Responsible for configuring data sources, API keys, and managing user roles.

Users are expected to have a basic understanding of GIS (Geographic Information Systems) and maritime operations, but the UI must abstract complex ML configurations behind intuitive controls.

### 2.4 Constraints
- **Data Availability:** The system heavily relies on the timely availability of satellite passes (SAR/EO) over the affected region. Cloud cover may affect EO data (though SAR remains unaffected).
- **Processing Power:** Processing large volumes of satellite imagery and running complex hydrodynamic models requires significant computational resources (GPUs for ML inference).
- **AIS Data Quality:** Historical AIS data may have gaps, noise, or spoofing that the system must handle.
- **Regulatory Compliance:** The system must handle data securely, especially if dealing with sensitive vessel information or proprietary satellite feeds.

### 2.5 Assumptions and Dependencies
- Relevant APIs for Sentinel-1/2, meteorological data (wind/currents), and AIS data are accessible and provide data in standard formats.
- Sample AIS data (or synthetic data) will be provided or generated for the Hackathon demonstration.
- Oceanographic data used for drift modeling is reasonably accurate for the region of interest.

---

## 3. Specific Requirements

### 3.1 Functional Requirements

#### 3.1.1 FR1: Oil Spill Detection
- **FR1.1 Data Ingestion:** The system shall fetch SAR and EO imagery via API based on user-defined spatial and temporal parameters or automated triggers.
- **FR1.2 Preprocessing:** The system shall apply necessary radiometric and geometric corrections to the imagery.
- **FR1.3 ML Inference:** The system shall utilize a trained Machine Learning model (e.g., CNN or U-Net architecture) to segment and detect potential oil slicks from the ocean background.
- **FR1.4 Look-alike Filtering:** The system shall distinguish actual oil spills from "look-alikes" (e.g., wind slicks, biogenic films, internal waves) with a minimum accuracy of 85%.

#### 3.1.2 FR2: Spill Characterization
- **FR2.1 Geometric Analysis:** The system shall calculate the surface area (in sq. km) and perimeter of the detected spill.
- **FR2.2 Shape Extraction:** The system shall extract the centroid and boundary polygon of the slick.
- **FR2.3 Age Estimation:** The system shall attempt to estimate the age of the spill based on dispersion patterns, edge crispness, and weathering characteristics inferred from the imagery.

#### 3.1.3 FR3: Drift Modeling & Hindcasting
- **FR3.1 Environmental Data Ingestion:** The system shall retrieve real-time and historical wind velocity, wave height, and ocean surface currents for the given bounding box and timestamp.
- **FR3.2 Hindcasting (Backward Tracing):** The system shall simulate the backward trajectory of the oil slick particles from the time of detection to a calculated point of origin within a user-defined time window (e.g., past 24-72 hours).
- **FR3.3 Forecasting (Forward Tracing):** The system shall simulate the predicted future drift of the slick to aid in containment efforts.
- **FR3.4 Uncertainty Mapping:** The system shall display a probabilistic cone or heat map representing the uncertainty in the origin point calculation.

#### 3.1.4 FR4: AIS Data Processing
- **FR4.1 AIS Parsing:** The system shall parse historical or real-time AIS data formats (e.g., NMEA strings, CSVs from MarineCadastre).
- **FR4.2 Traffic Filtering:** The system shall filter out irrelevant traffic by bounding the data to the spatio-temporal window derived from the hindcast origin point (e.g., a 50 km radius around the origin point during the estimated spill time).
- **FR4.3 Trajectory Interpolation:** The system shall interpolate missing AIS positions to reconstruct continuous vessel tracks.

#### 3.1.5 FR5: Vessel Attribution & Scoring
- **FR5.1 Spatio-temporal Correlation:** The system shall cross-reference the vessel tracks against the calculated spill origin point and time window.
- **FR5.2 Behavioral Analysis:** The system shall detect anomalous vessel behaviors such as sudden speed changes, erratic maneuvers, or disabling of the AIS transponder near the origin point.
- **FR5.3 Scoring Algorithm:** The system shall assign a "Culprit Probability Score" (0 to 100) to each candidate vessel based on:
  - Minimum distance to the slick origin.
  - Time of closest approach relative to estimated spill time.
  - Speed/heading alignment with the spill axis.
  - Presence of behavioral anomalies.
- **FR5.4 Ranking:** The system shall output a ranked list of top suspect vessels.

#### 3.1.6 FR6: Visual Interface/Dashboard
- **FR6.1 Map Integration:** The system shall feature an interactive geographic map (e.g., Leaflet, Mapbox) as the primary interface.
- **FR6.2 Layer Toggling:** The user shall be able to overlay satellite imagery, detected slick polygons, drift trajectories (hindcast/forecast), and AIS vessel tracks.
- **FR6.3 Time Slider:** The system shall provide a timeline slider to animate vessel movements and spill drift over time.
- **FR6.4 Suspect Panel:** The dashboard shall display a side panel with the ranked list of suspects, their IMO/MMSI numbers, vessel type, and attribution scores.
- **FR6.5 Report Generation:** The system shall allow the user to export a comprehensive PDF report containing map screenshots, spill metrics, and vessel analysis.

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance
- Imagery processing and ML detection for a standard Sentinel-1 tile (e.g., 250x250 km) shall complete within 5 minutes.
- The drift simulation and vessel attribution query should return results within 2 minutes of initiation.
- The web dashboard map shall render at 60 FPS under normal loads.

#### 3.2.2 Reliability and Availability
- The system shall handle missing or corrupted data (e.g., incomplete AIS packets or partial imagery) gracefully without crashing, logging the error and interpolating where possible.
- The system should maintain a 99% uptime during operational periods.

#### 3.2.3 Security
- Access to the dashboard shall be secured via role-based access control (RBAC) and standard authentication mechanisms (e.g., OAuth 2.0 or JWT).
- Any sensitive AIS data or proprietary algorithms shall be encrypted at rest and in transit (HTTPS/TLS 1.2+).

#### 3.2.4 Scalability
- The architecture shall support horizontal scaling for the ML processing nodes to handle multiple concurrent spill analyses.
- The database shall be optimized (e.g., using PostGIS or spatial indexing) to query millions of AIS records rapidly.

#### 3.2.5 Usability
- The interface shall follow standard UI/UX heuristics. Tooltips, legends, and help documentation must be available within the dashboard.
- Color coding (e.g., red for high-probability suspects, blue for drift paths) shall be accessible and clear.

### 3.3 External Interface Requirements

#### 3.3.1 User Interfaces
- A responsive Web Application accessible via modern browsers (Chrome, Firefox, Edge).
- The layout will consist of a central map view, a left sidebar for configuration (date, region), and a right sidebar for analysis results (suspects, metrics).

#### 3.3.2 Hardware Interfaces
- No custom hardware interfaces required. The system will run on standard cloud infrastructure (AWS/GCP/Azure) or on-premise servers equipped with GPUs (NVIDIA CUDA compatible) for ML model execution.

#### 3.3.3 Software Interfaces
- **OS / Environment:** Linux-based OS for server deployment; Docker containers for microservices.
- **Database:** PostgreSQL with PostGIS extension for spatial data storage and querying.
- **Web Server:** Nginx or Apache acting as a reverse proxy to application servers (e.g., Python FastAPI/Django or Node.js).

#### 3.3.4 Communication Interfaces
- RESTful APIs for communication between the frontend client and backend services.
- HTTP/HTTPS protocols for fetching data from external APIs (Copernicus API, NOAA APIs).

### 3.4 Data Requirements
- **Inputs:**
  - Satellite Images: `.tiff`, `.jp2`, or NetCDF formats.
  - AIS Data: `.csv` or NMEA datastreams containing MMSI, Timestamp, Latitude, Longitude, SOG (Speed Over Ground), COG (Course Over Ground), Heading.
  - MetOcean Data: NetCDF or GRIB formats for wind (u, v components) and ocean currents.
- **Outputs:**
  - GeoJSON/Shapefiles for slick polygons and drift tracks.
  - JSON objects for ranked suspect lists.

---

## 4. System Models

### 4.1 Use Case Descriptions

**Use Case 1: Run Full Pipeline Analysis**
- **Actor:** Operator / Analyst
- **Trigger:** Operator selects a region and date range suspected of containing an oil spill.
- **Precondition:** Operator is logged in; external data sources are accessible.
- **Normal Flow:**
  1. Operator inputs bounding box and date range.
  2. System fetches available SAR/EO imagery.
  3. System runs ML detection and highlights the spill.
  4. Operator confirms the detection to proceed.
  5. System retrieves MetOcean data and runs the hindcast model.
  6. System fetches historical AIS data for the origin region.
  7. System cross-references AIS tracks with the origin point.
  8. System displays the ranked suspect list and map overlays.
- **Postcondition:** A detailed incident workspace is saved and available for report generation.

**Use Case 2: Investigate Suspect Vessel**
- **Actor:** Operator
- **Trigger:** Operator clicks on a specific vessel in the ranked suspect list.
- **Normal Flow:**
  1. System highlights the vessel's complete track on the map.
  2. System opens a detail view showing the vessel's details, IMO number, and breakdown of its probability score.
  3. System highlights points on the track where anomalies (e.g., speed drop, AIS off) were detected.

### 4.2 Data Flow Descriptions

1. **Level 0 (Context):** The Operator sends commands to the OSDVAS. OSDVAS requests data from Satellite APIs, MetOcean Databases, and AIS Repositories. OSDVAS returns visualizations and reports to the Operator.
2. **Level 1 (Core Processes):**
   - **Process 1 (Image Processing):** Raw Image -> Preprocessor -> ML Model -> Slick Polygon & Metrics.
   - **Process 2 (Drift Modeling):** Slick Polygon + MetOcean Data -> Hydrodynamic Model -> Origin Point & Time Window.
   - **Process 3 (AIS Processing):** Raw AIS -> Parser & Filter -> Cleaned Vessel Tracks.
   - **Process 4 (Correlation Engine):** Origin Point + Cleaned Vessel Tracks -> Scoring Algorithm -> Ranked Suspects.
   - **Process 5 (Presentation):** Slick Polygon + Drift Paths + Vessel Tracks + Suspects -> UI Rendering Engine -> Dashboard view.

---

## 5. Appendices

### Appendix A: Scoring Logic Draft
The initial heuristic for the "Culprit Probability Score" $S$ can be modeled as a weighted sum:
$S = (W_1 \times P_{dist}) + (W_2 \times P_{time}) + (W_3 \times P_{anom})$
Where:
- $P_{dist}$ is a normalized score inversely proportional to the closest point of approach to the spill origin.
- $P_{time}$ is a normalized score based on the time difference between vessel presence and estimated spill time.
- $P_{anom}$ is a binary or graded score denoting suspicious behavior (e.g., a sudden drop in speed indicating discharge).
- $W_1, W_2, W_3$ are tunable weights based on empirical testing.

### Appendix B: Technology Stack Recommendation
- **Frontend:** React.js, Deck.gl / Leaflet for mapping.
- **Backend:** Python (FastAPI), Celery for task queueing.
- **ML Framework:** PyTorch or TensorFlow.
- **Geospatial Processing:** GDAL, Rasterio, Shapely.
- **Drift Modeling:** OpenDrift (Python-based trajectory modeling framework).
- **Database:** PostgreSQL + PostGIS.

### Appendix C: Revision History
| Version | Date | Description |
|---------|------|-------------|
| 1.0     | 2026-09-12 | Initial draft of SRS for SIH problem statement 26143. |

---
*End of Document*
