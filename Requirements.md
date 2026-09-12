# Software Requirements Specification (SRS)
## Leveraging Satellite Imagery for Oil Spill Detection and Vessel Attribution

**Problem Statement ID:** 26143
**Organization:** National Technical Research Organisation (NTRO)
**Theme:** Disaster Management

---

## 1. Project Overview

### 1.1 Background
Marine oil spills pose severe threats to marine ecosystems, coastal communities, and the maritime economy. Rapid detection and mitigation are critical. Furthermore, identifying the polluter is essential for enforcing maritime laws and deterring future incidents. Currently, this process relies heavily on manual analysis of disparate data sources. The National Technical Research Organisation (NTRO) has proposed an initiative to leverage modern remote sensing satellite data and AI/ML technologies to automate the detection of oil spills and accurately identify the responsible vessels.

### 1.2 Objectives
The primary objective of this project is to develop an intelligent automated pipeline that:
- Detects and characterizes oil spills using SAR and EO imagery.
- Utilizes oceanographic and meteorological data to trace the spill back to its origin and predict its future drift.
- Analyzes historic Automatic Identification System (AIS) data to attribute the spill to a specific vessel.
- Provides a comprehensive visual interface to manage, analyze, and report on these incidents.

### 1.3 Stakeholders
- **National Technical Research Organisation (NTRO):** Primary sponsor and end-user.
- **Coast Guard / Maritime Enforcement Agencies:** Responders and enforcers.
- **Environmental Protection Agencies:** Beneficiaries of environmental protection efforts.
- **System Administrators:** Responsible for maintaining the software pipeline.
- **Data Analysts/Scientists:** Users performing deep dives into spill incidents.

---

## 2. Business Requirements

### 2.1 Business Goals and Objectives
- **Goal 1:** Reduce the time to detect an oil spill by at least 60% compared to manual processes.
- **Goal 2:** Improve the accuracy of vessel attribution to >85% to support legal and enforcement actions.
- **Goal 3:** Create a scalable platform that can handle continuous data streams from multiple satellite constellations and AIS providers.
- **Goal 4:** Provide actionable intelligence through intuitive dashboards to facilitate rapid disaster response.

### 2.2 Success Criteria and KPIs
| KPI | Description | Target |
|---|---|---|
| Detection Accuracy | True positive rate for oil spill detection using SAR/EO data. | > 90% |
| False Alarm Rate | False positive rate in spill detection. | < 5% |
| Attribution Accuracy | Correct identification of the polluting vessel. | > 85% |
| Processing Latency | Time taken from data ingestion to actionable alert. | < 30 minutes |
| System Uptime | Availability of the dashboard and ingestion pipelines. | 99.9% |

---

## 3. Functional Requirements

### 3.1 Satellite Image Processing Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| FR-001 | The system shall ingest Level-1 SAR (Synthetic Aperture Radar) images automatically from configured sources. | High | Image Processing |
| FR-002 | The system shall ingest optical/EO imagery from Sentinel-2, Landsat, or equivalent. | Medium | Image Processing |
| FR-003 | The system shall perform radiometric calibration and speckle filtering on SAR imagery. | High | Image Processing |
| FR-004 | The system shall perform land masking to filter out coastal regions and islands from the analysis. | High | Image Processing |
| FR-005 | The system shall support image co-registration between SAR and EO data when available for the same location. | Low | Image Processing |

### 3.2 Oil Spill Detection Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| FR-006 | The system shall employ a machine learning model (e.g., CNN or semantic segmentation) to identify dark spots indicative of oil spills in SAR data. | High | ML / AI |
| FR-007 | The system shall differentiate oil spills from look-alikes (e.g., algal blooms, wind shadows, upwelling) using contextual data and ML classifiers. | High | ML / AI |
| FR-008 | The system shall process EO imagery to detect specific spectral signatures of oil slicks on the ocean surface. | Medium | ML / AI |
| FR-009 | The system shall assign a confidence score (0-100%) to every detected oil spill. | High | Reporting |

### 3.3 Spill Characterisation Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| FR-010 | The system shall calculate the geometric properties of the detected spill (Area, Perimeter, Length, Width). | High | Analytics |
| FR-011 | The system shall extract the geographic coordinates (bounding box and centroid) of the spill. | High | Analytics |
| FR-012 | The system shall estimate the age of the spill (fresh vs. weathered) based on edge sharpness and SAR backscatter characteristics. | Medium | Analytics |
| FR-013 | The system shall estimate the volume of the spill if sufficient optical/thickness data is available. | Low | Analytics |

### 3.4 Drift Modeling Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| FR-014 | The system shall ingest real-time and historical oceanographic data (currents, wave heights). | High | Data Ingestion |
| FR-015 | The system shall ingest real-time and historical meteorological data (wind speed, wind direction). | High | Data Ingestion |
| FR-016 | The system shall run a hindcasting model to trace the oil slick back to its origin point in space and time. | High | Modeling |
| FR-017 | The system shall run a forecasting model to predict the trajectory of the spill for the next 24, 48, and 72 hours. | High | Modeling |
| FR-018 | The system shall output the predicted trajectories as GeoJSON or shapefiles for visualization. | High | Integration |

### 3.5 AIS Data Processing Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| FR-019 | The system shall ingest continuous historical and real-time AIS data (Vessel Name, MMSI, IMO, Lat, Lon, Speed, Course, Timestamp). | High | Data Ingestion |
| FR-020 | The system shall clean and interpolate AIS data to fill missing gaps in vessel trajectories. | Medium | Data Processing |
| FR-021 | The system shall store AIS data in an optimized spatial database for rapid spatio-temporal querying. | High | Data Management |

### 3.6 Vessel Attribution Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| FR-022 | The system shall query the AIS database to reconstruct vessel traffic around the hindcasted origin point and time window. | High | Analytics |
| FR-023 | The system shall filter out irrelevant traffic (e.g., small fishing boats if the spill volume is massive) based on vessel type. | Medium | Analytics |
| FR-024 | The system shall score potential suspect vessels based on proximity to the spill origin. | High | ML / AI |
| FR-025 | The system shall analyze vessel trajectory and behavioral anomalies (e.g., sudden changes in speed, loitering, turning off AIS transponders) as part of the scoring mechanism. | High | ML / AI |
| FR-026 | The system shall rank the top N suspected vessels and present them to the user with attribution confidence scores. | High | Analytics |

### 3.7 Dashboard & UI Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| FR-027 | The system shall provide a web-based geographic information system (GIS) interface. | High | UI/UX |
| FR-028 | The UI shall overlay SAR/EO imagery, detected spill polygons, and vessel AIS tracks on an interactive map. | High | UI/UX |
| FR-029 | The UI shall allow users to toggle layers (wind, currents, predicted drift path, vessel tracks). | High | UI/UX |
| FR-030 | The UI shall display a ranked list of suspect vessels for a selected spill incident. | High | UI/UX |
| FR-031 | The UI shall provide a timeline view to playback the evolution of the spill and vessel movements. | Medium | UI/UX |

### 3.8 Reporting & Alert Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| FR-032 | The system shall generate automated PDF/HTML reports for each detected spill incident, including imagery, metadata, and suspect vessels. | Medium | Reporting |
| FR-033 | The system shall trigger email and SMS alerts to designated personnel upon the high-confidence detection of a new oil spill. | High | Alerts |
| FR-034 | The system shall allow users to manually approve, reject, or annotate automated detections. | High | Workflow |

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| NFR-001 | The system must process a standard 250km x 250km SAR scene within 15 minutes of ingestion. | High | Performance |
| NFR-002 | Dashboard map rendering and layer toggling shall occur in under 2 seconds. | High | Performance |
| NFR-003 | The hindcasting model must compute the origin point within 5 minutes. | Medium | Performance |

### 4.2 Scalability Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| NFR-004 | The system architecture must be horizontally scalable to support concurrent processing of images from multiple satellite constellations. | High | Scalability |
| NFR-005 | The spatial database must support the ingestion and querying of at least 50 million AIS records per day. | High | Scalability |

### 4.3 Security Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| NFR-006 | The system shall implement Role-Based Access Control (RBAC). | High | Security |
| NFR-007 | All data in transit (API calls, UI traffic) must be encrypted using TLS 1.2 or higher. | High | Security |
| NFR-008 | User passwords must be hashed using bcrypt or Argon2 algorithms. | High | Security |

### 4.4 Usability Requirements
| ID | Description | Priority | Category |
|---|---|---|---|
| NFR-009 | The user interface shall conform to WCAG 2.1 AA accessibility standards. | Medium | Usability |
| NFR-010 | The application must be responsive and functional on modern desktop browsers (Chrome, Firefox, Edge). | High | Usability |

### 4.5 Reliability & Availability
| ID | Description | Priority | Category |
|---|---|---|---|
| NFR-011 | The system shall ensure 99.9% uptime for the critical detection and alerting modules. | High | Reliability |
| NFR-012 | The system shall perform automated daily backups of the database and configuration files. | High | Reliability |

### 4.6 Compliance & Regulatory
| ID | Description | Priority | Category |
|---|---|---|---|
| NFR-013 | The system shall log all user actions (audit trail) for compliance with NTRO security policies. | High | Compliance |
| NFR-014 | The handling of maritime data shall comply with local maritime authority regulations. | Medium | Compliance |

---

## 5. Data Requirements

### 5.1 Input Data Sources
- **SAR Imagery:** Sentinel-1 (C-band), NISAR, or commercial SAR providers (e.g., ICEYE, Capella).
- **EO Imagery:** Sentinel-2, Landsat-8/9.
- **AIS Data:** Terrestrial and Satellite AIS feeds (e.g., Spire, ExactEarth).
- **Oceanographic Data:** Copernicus Marine Service (CMEMS) for ocean currents and wave data.
- **Meteorological Data:** ECMWF or GFS for wind data.

### 5.2 Data Formats and Standards
- **Imagery:** GeoTIFF, NetCDF, SAFE format.
- **AIS Data:** NMEA format or JSON APIs.
- **Vector Data:** GeoJSON, Shapefiles.
- **MetOcean Data:** GRIB2, NetCDF.

### 5.3 Data Storage and Retention
- Raw satellite imagery will be retained in a hot-storage object bucket (e.g., S3) for 30 days, then moved to cold storage.
- Extracted spill metadata and vessel tracks associated with an incident will be retained indefinitely.
- Raw AIS data will be retained for 1 year to allow for historical analysis.

---

## 6. Technical Requirements

### 6.1 Hardware Requirements
- **Inference Nodes:** GPU-enabled servers (e.g., NVIDIA T4 or A10G) for rapid ML model inference.
- **Database Servers:** High IOPS SSD storage for the spatial database to handle continuous AIS ingestion and rapid querying.
- **Storage:** Petabyte-scale object storage for raw satellite data.

### 6.2 Software/Technology Stack (Proposed)
- **Frontend:** React.js, Deck.gl / Mapbox GL JS for spatial visualization.
- **Backend:** Python (FastAPI or Django) for API and pipeline orchestration.
- **Machine Learning:** PyTorch or TensorFlow, Rasterio, GDAL.
- **Drift Modeling:** OpenDrift (Python-based open-source framework).
- **Database:** PostgreSQL with PostGIS extension, Redis for caching.
- **Infrastructure:** Docker, Kubernetes for orchestration, CI/CD pipelines via GitHub Actions/GitLab CI.

### 6.3 Integration Requirements
- Seamless integration with satellite data hubs (e.g., Copernicus Open Access Hub).
- Integration with third-party AIS streaming APIs.
- Webhooks for integration with existing NTRO command and control systems.

### 6.4 API Requirements
- RESTful or GraphQL API exposing endpoints for:
  - Incident retrieval and creation.
  - Suspect vessel ranking.
  - Initiating manual drift model runs.
- APIs must be secured via OAuth2 or API keys with rate limiting.

---

## 7. User Requirements

### 7.1 User Personas
1. **Analyst:** Uses the system daily to monitor for spills. Needs detailed tools to verify ML detections, run custom drift models, and analyze vessel tracks. Requires high-fidelity map tools.
2. **Administrator:** Manages system configurations, user access, API keys for data sources, and monitors system health.
3. **Field Officer/Commander:** Consumes the end reports. Needs high-level summaries, clear alerts, and actionable intelligence to deploy Coast Guard assets.

---

## 8. Constraints and Assumptions

### Constraints
- The solution must rely primarily on open-source intelligence and commercially available satellite data unless provided directly by NTRO.
- Processing must be optimized to run within constrained operational budgets for cloud computing.
- Satellite revisit times dictate the temporal resolution of detections (e.g., Sentinel-1 provides a new image every few days depending on the orbit).

### Assumptions
- NTRO will facilitate access to necessary commercial AIS data streams if free sources are insufficient.
- Oceanographic and meteorological data services will remain publicly accessible and reliable.
- Vessels involved in illegal dumping will have their AIS turned on at some point before or after the incident, or their 'dark' periods can be correlated with the spill time.

---

## 9. Dependencies
- **External Data Providers:** Dependency on the uptime and data availability of Copernicus (ESA), AIS providers, and weather data services.
- **Third-Party Libraries:** Reliance on open-source libraries like GDAL, PostGIS, and OpenDrift.
- **Cloud Infrastructure:** Dependency on AWS/GCP/Azure for scalable compute and storage resources.

---

## 10. Acceptance Criteria
- The ML model successfully identifies at least 90% of verified oil spills in a test dataset of SAR images.
- The system demonstrates the ability to ingest a SAR image, detect a spill, run a hindcast model, and generate a ranked list of vessels within 30 minutes.
- The UI displays all required layers accurately on the map without lagging.
- The drift model's predicted origin point falls within an acceptable radius (e.g., 5km) of the actual known origin in test scenarios.
- Security audits confirm the implementation of RBAC and data encryption.

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|---|---|---|---|
| ML Model False Positives due to look-alikes | High | Medium | Incorporate wind speed thresholding (spills aren't visible at high winds, look-alikes are common at low winds) and multi-modal data. |
| AIS Data Spoofing/Missing | Medium | High | Implement anomaly detection for AIS tracks and flag 'dark vessels' (transponder turned off) in the vicinity. |
| High Processing Costs | Medium | Medium | Optimize ML inference, implement auto-scaling to spin down GPU nodes when idle, and optimize spatial queries. |
| Data Provider Outage | Low | High | Implement robust error handling and fallback mechanisms to secondary data sources where possible. |
| Integration Challenges with Legacy Systems | Medium | Medium | Provide standard REST APIs and Webhooks to maximize compatibility. |

---

## 12. Traceability Matrix

| Requirement ID | Module / Feature | Testing Method | Status |
|---|---|---|---|
| FR-001 - FR-005 | Image Ingestion & Preprocessing | Automated Unit/Integration Tests | Pending |
| FR-006 - FR-009 | ML Detection Module | Model Evaluation (Precision/Recall) | Pending |
| FR-010 - FR-013 | Spill Analytics | Unit Tests | Pending |
| FR-014 - FR-018 | Drift Modeling Pipeline | System Integration Tests | Pending |
| FR-019 - FR-021 | AIS Ingestion Pipeline | Load Testing / Data Validation | Pending |
| FR-022 - FR-026 | Vessel Attribution Engine | Accuracy Evaluation against Ground Truth | Pending |
| FR-027 - FR-031 | Web UI / Dashboard | End-to-End (E2E) UI Tests | Pending |
| FR-032 - FR-034 | Alerting System | Integration Tests | Pending |
| NFR-001 - NFR-003| Performance | Stress/Load Testing | Pending |
| NFR-004 - NFR-005| Scalability | Load Testing | Pending |
| NFR-006 - NFR-008| Security | Penetration Testing / Code Scanning | Pending |
