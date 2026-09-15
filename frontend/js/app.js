// ============================================================
// OSDVAS - Oil Spill Detection & Vessel Attribution System
// app.js
//
// CURRENT IMPLEMENTATION
// ----------------------
// 1. Existing dashboard / Leaflet map
// 2. Existing demo vessel tracks
// 3. Existing demo drift layers
// 4. Existing timeline
// 5. REAL SAR -> FastAPI -> DeepLabV3+ ML analysis
// 6. Real ML results displayed in dashboard
//
// NOT YET IMPLEMENTED
// -------------------
// - Geographic georeferencing
// - Real spill lat/lon
// - Real spill area in km²
// - Real AIS processing
// - Real drift modelling
// - Real vessel attribution
//
// IMPORTANT:
// The backend currently returns spill polygons in IMAGE PIXEL
// coordinates. Do NOT draw them directly on the geographic map.
// ============================================================


document.addEventListener('DOMContentLoaded', () => {


    // ============================================================
    // 0. LOAD DEMO DATA
    // ============================================================

    const data = window.OSDVAS_DATA;

    if (!data) {

        console.error(
            "OSDVAS_DATA not found. " +
            "Ensure data.js is loaded before app.js."
        );

        return;
    }


    // ============================================================
    // 1. INITIALIZE MAP
    // ============================================================

    const CARTO_KEY =
        'cb1_30zx_1_29883dacf4d9ac7332b5460f';


    const map =
        L.map('map').setView(
            data.spill.center,
            10
        );


    L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
        {
            attribution:
                '&copy; <a href="https://carto.com/">CARTO</a>',

            subdomains:
                'abcd',

            maxZoom:
                19
        }
    ).addTo(map);


    // ============================================================
    // 2. LAYER GROUPS
    // ============================================================

    const layers = {

        spill:
            L.layerGroup().addTo(map),

        vessels:
            L.layerGroup().addTo(map),

        hindcast:
            L.layerGroup().addTo(map),

        forecast:
            L.layerGroup().addTo(map),

        origin:
            L.layerGroup().addTo(map)

    };


    // ============================================================
    // 3. EXISTING DEMO SPILL
    // ============================================================

    const spillPolygon =
        L.polygon(
            data.spill.polygon,
            {
                fillColor:
                    '#ff4757',

                fillOpacity:
                    0.4,

                color:
                    '#ff6b81',

                weight:
                    2
            }
        ).addTo(
            layers.spill
        );


    // Pulsing animation
    setInterval(
        () => {

            const currentOpacity =
                spillPolygon.options.fillOpacity;


            spillPolygon.setStyle({

                fillOpacity:
                    currentOpacity === 0.4
                        ? 0.3
                        : 0.4

            });

        },
        2000
    );


    // ============================================================
    // 4. EXISTING DEMO HINDCAST
    // ============================================================

    const hindcastCoords =
        data.drift.hindcast.map(
            p => p.position
        );


    L.polyline(
        hindcastCoords,
        {
            color:
                '#ffa502',

            dashArray:
                '5, 10',

            weight:
                2
        }
    ).addTo(
        layers.hindcast
    );


    // ============================================================
    // 5. EXISTING DEMO FORECAST
    // ============================================================

    const forecastCoords =
        data.drift.forecast.map(
            p => p.position
        );


    L.polyline(
        forecastCoords,
        {
            color:
                '#1e90ff',

            dashArray:
                '5, 10',

            weight:
                2
        }
    ).addTo(
        layers.forecast
    );


    // ============================================================
    // 6. EXISTING DEMO ORIGIN
    // ============================================================

    L.circleMarker(
        data.origin.position,
        {
            color:
                '#ff4757',

            fillColor:
                '#ff4757',

            fillOpacity:
                0.8,

            radius:
                8,

            className:
                'pulsing-marker'
        }
    ).addTo(
        layers.origin
    );


    L.circle(
        data.origin.position,
        {
            radius:
                data.origin.uncertaintyRadius * 1000,

            color:
                '#ff4757',

            weight:
                1,

            dashArray:
                '5, 5',

            fill:
                false
        }
    ).addTo(
        layers.origin
    );


    // ============================================================
    // 7. VESSEL COLORS
    // ============================================================

    const vesselColors = [

        '#2ed573',
        '#ffd32a',
        '#ff6348',
        '#7158e2',
        '#3ae374',
        '#17c0eb',
        '#ff9ff3'

    ];


    const vesselMarkers = {};
    const vesselPaths = {};


    // ============================================================
    // 8. EXISTING DEMO VESSELS
    // ============================================================

    data.vessels.forEach(
        (v, idx) => {

            const color =
                vesselColors[
                    idx % vesselColors.length
                ];


            const trackCoords =
                v.track.map(
                    p => [
                        p.lat,
                        p.lng
                    ]
                );


            vesselPaths[v.mmsi] =
                L.polyline(
                    trackCoords,
                    {
                        color:
                            color,

                        weight:
                            2,

                        opacity:
                            0.6
                    }
                ).addTo(
                    layers.vessels
                );


            const firstPoint =
                v.track[0];


            vesselMarkers[v.mmsi] =
                L.marker(
                    [
                        firstPoint.lat,
                        firstPoint.lng
                    ],
                    {

                        icon:
                            L.divIcon({

                                className:
                                    'ship-marker',

                                html:
                                    `<div class="ship-icon"
                                    style="transform: rotate(${firstPoint.heading || 0}deg);
                                    color: ${color}">
                                    <i class="fas fa-location-arrow"></i>
                                    </div>`,

                                iconSize:
                                    [24, 24],

                                iconAnchor:
                                    [12, 12]

                            })

                    }
                )
                .bindPopup(

                    `<b>${v.name}</b><br/>` +
                    `Speed: ${firstPoint.speed.toFixed(1)} kn`

                )
                .addTo(
                    layers.vessels
                );

        }
    );


    // ============================================================
    // 9. EXISTING DEMO METRIC ANIMATION
    // ============================================================

    const animateValue =
        (
            id,
            start,
            end,
            duration
        ) => {

            let current =
                start;


            const range =
                end - start;


            const increment =
                end > start
                    ? range / (duration / 10)
                    : -1;


            const obj =
                document.getElementById(
                    id
                );


            if (!obj) {
                return;
            }


            const timer =
                setInterval(
                    () => {

                        current +=
                            increment;


                        if (
                            (
                                increment > 0 &&
                                current >= end
                            ) ||
                            (
                                increment < 0 &&
                                current <= end
                            )
                        ) {

                            current =
                                end;

                            clearInterval(
                                timer
                            );
                        }


                        obj.innerHTML =
                            current % 1 !== 0
                                ? current.toFixed(1)
                                : Math.floor(current);

                    },
                    10
                );
        };


    // Existing demo values are displayed at startup.
    // They will be replaced with '--' after a real ML run
    // because area/perimeter/age are not yet georeferenced.


    if (
        document.getElementById(
            'spill-area'
        )
    ) {

        animateValue(
            'spill-area',
            0,
            data.spill.area,
            1000
        );

    }


    if (
        document.getElementById(
            'spill-perimeter'
        )
    ) {

        animateValue(
            'spill-perimeter',
            0,
            data.spill.perimeter,
            1000
        );

    }


    if (
        document.getElementById(
            'spill-age'
        )
    ) {

        animateValue(
            'spill-age',
            0,
            data.spill.estimatedAge,
            1000
        );

    }


    if (
        document.getElementById(
            'spill-confidence'
        )
    ) {

        animateValue(
            'spill-confidence',
            0,
            data.spill.confidence,
            1000
        );

    }


    const initialCenter =
        document.getElementById(
            'spill-center'
        );


    if (initialCenter) {

        initialCenter.textContent =
            `${data.spill.center[0].toFixed(4)}°N, ` +
            `${data.spill.center[1].toFixed(4)}°E`;

    }


    const initialDetectionTime =
        document.getElementById(
            'detection-time'
        );


    if (initialDetectionTime) {

        initialDetectionTime.textContent =
            new Date(
                data.spill.detectionTime
            ).toLocaleString();

    }


    // ============================================================
    // 10. EXISTING DEMO SUSPECT VESSEL LIST
    // ============================================================

    const suspectList =
        document.getElementById(
            'suspect-list'
        );


    if (suspectList) {

        data.vessels
            .sort(
                (a, b) =>
                    b.attribution.score -
                    a.attribution.score
            )
            .forEach(
                v => {

                    const scoreColor =
                        v.attribution.score > 70
                            ? '#ff4757'
                            : (
                                v.attribution.score > 40
                                    ? '#ffa502'
                                    : '#2ed573'
                            );


                    const card =
                        document.createElement(
                            'div'
                        );


                    card.className =
                        'vessel-card';


                    card.dataset.mmsi =
                        v.mmsi;


                    let anomaliesHtml =
                        '';


                    if (
                        v.attribution.anomalies.length > 0
                    ) {

                        anomaliesHtml =
                            v.attribution.anomalies
                                .map(
                                    a =>
                                        `<span class="anomaly-tag">${a}</span>`
                                )
                                .join('');

                    }


                    card.innerHTML = `

                        <div class="vessel-card-header">

                            <div class="vessel-info">

                                <span class="vessel-name">
                                    ${v.name}
                                </span>

                                <span class="vessel-type">
                                    ${v.type} • ${v.flag}
                                </span>

                                <span class="vessel-mmsi">
                                    MMSI: ${v.mmsi}
                                </span>

                            </div>


                            <div
                                class="vessel-score"
                                style="color:${scoreColor}"
                            >

                                <span class="score-value">
                                    ${v.attribution.score}
                                </span>

                                <span class="score-label">
                                    %
                                </span>

                            </div>

                        </div>


                        <div class="score-bar">

                            <div
                                class="score-fill"
                                style="
                                    width:${v.attribution.score}%;
                                    background:${scoreColor}
                                "
                            ></div>

                        </div>


                        <div class="vessel-factors">

                            ${anomaliesHtml}

                        </div>

                    `;


                    card.addEventListener(
                        'click',
                        () =>
                            showVesselDetails(v)
                    );


                    suspectList.appendChild(
                        card
                    );

                }
            );

    }


    // ============================================================
    // 11. LAYER TOGGLE HANDLERS
    // ============================================================

    const setupToggle =
        (
            id,
            layerGrp
        ) => {

            const el =
                document.getElementById(
                    id
                );


            if (!el) {
                return;
            }


            el.addEventListener(
                'change',
                e => {

                    if (e.target.checked) {

                        map.addLayer(
                            layerGrp
                        );

                    } else {

                        map.removeLayer(
                            layerGrp
                        );

                    }

                }
            );

        };


    setupToggle(
        'layer-spill',
        layers.spill
    );


    setupToggle(
        'layer-vessels',
        layers.vessels
    );


    setupToggle(
        'layer-hindcast',
        layers.hindcast
    );


    setupToggle(
        'layer-forecast',
        layers.forecast
    );


    setupToggle(
        'layer-origin',
        layers.origin
    );


    // ============================================================
    // 12. TIMELINE
    // ============================================================

    const slider =
        document.getElementById(
            'timeline-slider'
        );


    const playBtn =
        document.getElementById(
            'play-btn'
        );


    const timeDisplay =
        document.getElementById(
            'time-display'
        );


    let playInterval;


    const startTime =
        new Date(
            data.timeline.start
        ).getTime();


    const endTime =
        new Date(
            data.timeline.end
        ).getTime();


    const totalDuration =
        endTime -
        startTime;


    const updateTimeline =
        () => {

            if (!slider) {
                return;
            }


            const progress =
                slider.value / 100;


            const currentTime =
                startTime +
                (
                    totalDuration *
                    progress
                );


            if (timeDisplay) {

                const dateObj =
                    new Date(
                        currentTime
                    );


                timeDisplay.textContent =
                    dateObj.toLocaleString();

            }


            // Update vessel positions
            data.vessels.forEach(
                (v, idx) => {

                    const color =
                        vesselColors[
                            idx %
                            vesselColors.length
                        ];


                    let closestPt =
                        v.track[0];


                    for (
                        let i = 0;
                        i < v.track.length - 1;
                        i++
                    ) {

                        const ptTime =
                            new Date(
                                v.track[i].timestamp
                            ).getTime();


                        const nextPtTime =
                            new Date(
                                v.track[i + 1].timestamp
                            ).getTime();


                        if (
                            currentTime >= ptTime &&
                            currentTime <= nextPtTime
                        ) {

                            const ratio =
                                (
                                    currentTime -
                                    ptTime
                                ) /
                                (
                                    nextPtTime -
                                    ptTime
                                );


                            closestPt = {

                                lat:
                                    v.track[i].lat +
                                    (
                                        v.track[i + 1].lat -
                                        v.track[i].lat
                                    ) *
                                    ratio,


                                lng:
                                    v.track[i].lng +
                                    (
                                        v.track[i + 1].lng -
                                        v.track[i].lng
                                    ) *
                                    ratio,


                                heading:
                                    v.track[i].heading,


                                speed:
                                    v.track[i].speed

                            };


                            break;

                        } else if (
                            currentTime >
                            nextPtTime
                        ) {

                            closestPt =
                                v.track[
                                    i + 1
                                ];

                        }

                    }


                    const marker =
                        vesselMarkers[
                            v.mmsi
                        ];


                    if (marker) {

                        marker.setLatLng(
                            [
                                closestPt.lat,
                                closestPt.lng
                            ]
                        );


                        const iconHtml =
                            `<div class="ship-icon"
                            style="transform: rotate(${closestPt.heading || 0}deg);
                            color: ${color}">
                            <i class="fas fa-location-arrow"></i>
                            </div>`;


                        marker.setIcon(
                            L.divIcon({

                                className:
                                    'ship-marker',

                                html:
                                    iconHtml,

                                iconSize:
                                    [24, 24],

                                iconAnchor:
                                    [12, 12]

                            })
                        );


                        marker.setPopupContent(

                            `<b>${v.name}</b><br/>` +
                            `Speed: ${(closestPt.speed || 0).toFixed(1)} kn`

                        );

                    }

                }
            );

        };


    if (slider) {

        slider.addEventListener(
            'input',
            updateTimeline
        );

    }


    if (playBtn) {

        playBtn.addEventListener(
            'click',
            () => {

                if (playInterval) {

                    clearInterval(
                        playInterval
                    );


                    playInterval =
                        null;


                    playBtn.innerHTML =
                        '<i class="fas fa-play"></i>';

                } else {

                    playBtn.innerHTML =
                        '<i class="fas fa-pause"></i>';


                    playInterval =
                        setInterval(
                            () => {

                                if (!slider) {
                                    return;
                                }


                                let val =
                                    parseFloat(
                                        slider.value
                                    );


                                val += 0.5;


                                if (val > 100) {

                                    val =
                                        100;


                                    clearInterval(
                                        playInterval
                                    );


                                    playInterval =
                                        null;


                                    playBtn.innerHTML =
                                        '<i class="fas fa-play"></i>';

                                }


                                slider.value =
                                    val;


                                updateTimeline();

                            },
                            100
                        );

                }

            }
        );

    }


    // ============================================================
    // 13. MAP CONTROLS
    // ============================================================

    const zoomBtn =
        document.getElementById(
            'zoom-to-spill'
        );


    if (zoomBtn) {

        zoomBtn.addEventListener(
            'click',
            () => {

                map.fitBounds(
                    spillPolygon.getBounds(),
                    {
                        padding:
                            [50, 50]
                    }
                );

            }
        );

    }


    // ============================================================
    // 14. VESSEL DETAIL PANEL
    // ============================================================

    function showVesselDetails(v) {

        const panel =
            document.getElementById(
                'vessel-detail-panel'
            );


        const content =
            document.getElementById(
                'vessel-detail-content'
            );


        if (!panel || !content) {
            return;
        }


        // Reset vessel paths
        Object.values(
            vesselPaths
        ).forEach(
            p =>
                p.setStyle({

                    weight:
                        2,

                    opacity:
                        0.6

                })
        );


        // Highlight selected vessel
        if (
            vesselPaths[v.mmsi]
        ) {

            vesselPaths[
                v.mmsi
            ].setStyle({

                weight:
                    4,

                opacity:
                    1

            });


            vesselPaths[
                v.mmsi
            ].bringToFront();


            map.fitBounds(
                vesselPaths[
                    v.mmsi
                ].getBounds()
            );

        }


        content.innerHTML = `

            <h3>
                ${v.name}
            </h3>


            <p>
                ${v.type}
                |
                Flag: ${v.flag}
                |
                Length: ${v.length}m
            </p>


            <p>
                IMO: ${v.imo}
                |
                MMSI: ${v.mmsi}
            </p>


            <hr/>


            <h4>
                Attribution Factors
            </h4>


            <ul>

                <li>
                    Proximity:
                    ${v.attribution.factors.proximity}/100
                </li>

                <li>
                    Temporal Correlation:
                    ${v.attribution.factors.temporalCorrelation}/100
                </li>

                <li>
                    Trajectory Alignment:
                    ${v.attribution.factors.trajectoryAlignment}/100
                </li>

                <li>
                    Behavioral Anomaly:
                    ${v.attribution.factors.behavioralAnomaly}/100
                </li>

            </ul>


            <p>

                <strong>
                    Min Distance to Origin:
                </strong>

                ${v.attribution.minDistanceToOrigin}
                km

            </p>


            <p>

                <strong>
                    Time at Closest Approach:
                </strong>

                ${
                    new Date(
                        v.attribution.timeAtClosestApproach
                    ).toLocaleString()
                }

            </p>

        `;


        panel.style.display =
            'block';

    }


    const closePanel =
        document.getElementById(
            'close-vessel-detail'
        );


    if (closePanel) {

        closePanel.addEventListener(
            'click',
            () => {

                const panel =
                    document.getElementById(
                        'vessel-detail-panel'
                    );


                if (panel) {

                    panel.style.display =
                        'none';

                }


                Object.values(
                    vesselPaths
                ).forEach(
                    p =>
                        p.setStyle({

                            weight:
                                2,

                            opacity:
                                0.6

                        })
                );

            }
        );

    }


    // ============================================================
    // 15. NOTIFICATION SYSTEM
    // ============================================================

    function showNotification(
        message,
        type = 'info'
    ) {

        const container =
            document.getElementById(
                'notification-container'
            );


        if (!container) {
            return;
        }


        const notif =
            document.createElement(
                'div'
            );


        notif.className =
            `notification ${type}`;


        notif.textContent =
            message;


        container.appendChild(
            notif
        );


        setTimeout(
            () => {

                notif.style.opacity =
                    '0';


                setTimeout(
                    () => {

                        notif.remove();

                    },
                    500
                );

            },
            5000
        );

    }


    // ============================================================
    // 16. REAL ML ANALYSIS
    // ============================================================

    const runAnalysisButton =
        document.getElementById(
            'run-analysis'
        );


    const sarImageInput =
        document.getElementById(
            'sar-image'
        );


    const analysisStatus =
        document.getElementById(
            'analysis-status'
        );


    // ------------------------------------------------------------
    // Helper: status text
    // ------------------------------------------------------------

    function setAnalysisStatus(
        message
    ) {

        if (analysisStatus) {

            analysisStatus.textContent =
                message;

        }

    }


    // ------------------------------------------------------------
    // Helper: pipeline status
    // ------------------------------------------------------------

    function setPipelineStep(
        index,
        state,
        timeText
    ) {

        const steps =
            document.querySelectorAll(
                '#pipeline-steps .pipeline-step'
            );


        const step =
            steps[index];


        if (!step) {
            return;
        }


        step.classList.remove(
            'completed',
            'active'
        );


        const icon =
            step.querySelector(
                '.step-icon'
            );


        const time =
            step.querySelector(
                '.step-time'
            );


        if (
            state ===
            'completed'
        ) {

            step.classList.add(
                'completed'
            );


            if (icon) {

                icon.innerHTML =
                    '<i class="fas fa-check"></i>';

            }

        } else if (
            state ===
            'active'
        ) {

            step.classList.add(
                'active'
            );


            if (icon) {

                icon.innerHTML =
                    '<i class="fas fa-spinner fa-spin"></i>';

            }

        } else {

            if (icon) {

                icon.innerHTML =
                    '<i class="fas fa-circle"></i>';

            }

        }


        if (
            time &&
            timeText
        ) {

            time.textContent =
                timeText;

        }

    }


    // ------------------------------------------------------------
    // Update dashboard from real ML result
    // ------------------------------------------------------------

    function updateDashboardFromML(
        result
    ) {

        const segmentation =
            result.segmentation;


        const spill =
            result.spill;


        // ========================================================
        // Detection count
        // ========================================================

        const detectionCount =
            document.getElementById(
                'stat-detections'
            );


        if (detectionCount) {

            detectionCount.textContent =
                spill.detected
                    ? '1'
                    : '0';

        }


        // ========================================================
        // Source
        // ========================================================

        const source =
            document.getElementById(
                'detection-source'
            );


        if (source) {

            source.textContent =
                'Sentinel-1 SAR + DeepLabV3+';

        }


        // ========================================================
        // Center
        //
        // Current backend does NOT have georeferencing.
        // ========================================================

        const center =
            document.getElementById(
                'spill-center'
            );


        if (center) {

            center.textContent =
                'Awaiting georeferencing';

        }


        // ========================================================
        // Area
        //
        // Cannot calculate km² without geographic transform.
        // ========================================================

        const area =
            document.getElementById(
                'spill-area'
            );


        if (area) {

            area.textContent =
                '--';

        }


        // ========================================================
        // Perimeter
        // ========================================================

        const perimeter =
            document.getElementById(
                'spill-perimeter'
            );


        if (perimeter) {

            perimeter.textContent =
                '--';

        }


        // ========================================================
        // Estimated age
        // ========================================================

        const age =
            document.getElementById(
                'spill-age'
            );


        if (age) {

            age.textContent =
                '--';

        }


        // ========================================================
        // Confidence
        //
        // Oil percentage != confidence.
        // Don't misuse the value.
        // ========================================================

        const confidence =
            document.getElementById(
                'spill-confidence'
            );


        if (confidence) {

            confidence.textContent =
                '--';

        }


        // ========================================================
        // Detection status
        // ========================================================

        if (
            spill.detected
        ) {

            setAnalysisStatus(

                `Oil detected — ` +
                `${segmentation.oil_pixels} pixels | ` +
                `${segmentation.oil_percentage}% coverage | ` +
                `${spill.polygon_count} region(s)`

            );

        } else {

            setAnalysisStatus(
                'No oil-spill pixels detected.'
            );

        }


        // ========================================================
        // Save result globally
        //
        // Future georeferencing / AIS / drift modules can use this.
        // ========================================================

        window.OSDVAS_ML_RESULT =
            result;


        console.log(
            'Latest real ML result:',
            window.OSDVAS_ML_RESULT
        );

    }


    // ============================================================
    // 17. RUN ANALYSIS BUTTON
    // ============================================================

    if (
        runAnalysisButton &&
        sarImageInput
    ) {

        runAnalysisButton.addEventListener(
            'click',
            async () => {


                // ==================================================
                // Check file
                // ==================================================

                const file =
                    sarImageInput.files[0];


                if (!file) {

                    setAnalysisStatus(
                        'Select a Sentinel-1 SAR image first.'
                    );


                    showNotification(
                        'Please select a SAR image before running analysis.',
                        'warning'
                    );


                    return;
                }


                try {

                    // ==================================================
                    // START UI
                    // ==================================================

                    runAnalysisButton.disabled =
                        true;


                    runAnalysisButton.innerHTML =
                        '<i class="fas fa-spinner fa-spin"></i>';


                    setAnalysisStatus(
                        'Uploading SAR image...'
                    );


                    // Image ingestion
                    setPipelineStep(
                        0,
                        'active',
                        'Running...'
                    );


                    // Reset remaining steps
                    setPipelineStep(
                        1,
                        'pending',
                        'Waiting'
                    );


                    setPipelineStep(
                        2,
                        'pending',
                        'Pending'
                    );


                    setPipelineStep(
                        3,
                        'pending',
                        'Pending'
                    );


                    setPipelineStep(
                        4,
                        'pending',
                        'Pending'
                    );


                    setPipelineStep(
                        5,
                        'pending',
                        'Pending'
                    );


                    console.log(
                        '======================================'
                    );


                    console.log(
                        'OSDVAS REAL ML ANALYSIS'
                    );


                    console.log(
                        '======================================'
                    );


                    console.log(
                        'Filename:',
                        file.name
                    );


                    console.log(
                        'Size:',
                        file.size,
                        'bytes'
                    );


                    console.log(
                        'Type:',
                        file.type
                    );


                    // ==================================================
                    // CALL FASTAPI
                    // ==================================================

                    setAnalysisStatus(
                        'Running ResNet-50 + DeepLabV3+...'
                    );


                                // ==================================================
            // GET IMAGE FOOTPRINT
            // ==================================================

            const north =
                document.getElementById('footprint-north').value;

            const south =
                document.getElementById('footprint-south').value;

            const east =
                document.getElementById('footprint-east').value;

            const west =
                document.getElementById('footprint-west').value;


                // ==================================================
                // VALIDATE FOOTPRINT
                // ==================================================

        if (
            north === '' ||
            south === '' ||
            east === '' ||
            west === ''
        ) {
            throw new Error(
                'Please enter North, South, East and West coordinates.'
            );
        }


        if (Number(north) <= Number(south)) {
            throw new Error(
                'North must be greater than South.'
            );
        }


        if (Number(east) <= Number(west)) {
            throw new Error(
                'East must be greater than West.'
            );
        }


        // ==================================================
        // CALL FASTAPI
        // ==================================================

        setAnalysisStatus(
            'Running ResNet-50 + DeepLabV3+...'
        );


        const start =
            performance.now();


        const result =
            await analyzeSARImage(
                file,
                north,
                south,
                east,
                west
            );


        const elapsed =
            (
                performance.now() -
                start
            ) / 1000;



                        console.log(
                            'Backend result:',
                            result
                         );


                    // ==================================================
                    // IMAGE INGESTION COMPLETE
                    // ==================================================

                    setPipelineStep(
                        0,
                        'completed',
                        `${elapsed.toFixed(1)}s`
                    );


                    // ==================================================
                    // ML DETECTION COMPLETE
                    // ==================================================

                    setPipelineStep(
                        1,
                        'completed',
                        `${elapsed.toFixed(1)}s`
                    );


                    // ==================================================
                    // FUTURE MODULES
                    // ==================================================

                    setPipelineStep(
                        2,
                        'pending',
                        'Pending'
                    );


                    setPipelineStep(
                        3,
                        'pending',
                        'Pending'
                    );


                    setPipelineStep(
                        4,
                        'pending',
                        'Pending'
                    );


                    setPipelineStep(
                        5,
                        'pending',
                        'Pending'
                    );


                    // ==================================================
                    // PROCESS RESULT
                    // ==================================================

                    if (
                        result &&
                        result.success
                    ) {

                        updateDashboardFromML(
                            result
                        );


                        if (
                            result.spill.detected
                        ) {

                            showNotification(
                                'ML analysis complete — oil-spill region detected.',
                                'warning'
                            );

                        } else {

                            showNotification(
                                'ML analysis complete — no oil-spill region detected.',
                                'info'
                            );

                        }


                        showNotification(
                            'Geographic placement requires georeferencing.',
                            'info'
                        );


                    } else {

                        throw new Error(
                            'Backend returned an unsuccessful result.'
                        );

                    }


                } catch (error) {


                    // ==================================================
                    // ERROR
                    // ==================================================

                    console.error(
                        'OSDVAS ML analysis failed:',
                        error
                    );


                    setAnalysisStatus(
                        'Analysis failed — check backend.'
                    );


                    showNotification(
                        `Analysis failed: ${error.message}`,
                        'warning'
                    );


                    // Reset pipeline
                    setPipelineStep(
                        0,
                        'pending',
                        'Failed'
                    );


                    setPipelineStep(
                        1,
                        'pending',
                        'Failed'
                    );


                } finally {


                    // ==================================================
                    // RESTORE BUTTON
                    // ==================================================

                    runAnalysisButton.disabled =
                        false;


                    runAnalysisButton.innerHTML =
                        '<i class="fas fa-play-circle"></i>';

                }

            }
        );

    } else {

        console.warn(
            'Real ML analysis controls not found. ' +
            'Check that index.html contains ' +
            '#run-analysis and #sar-image.'
        );

    }


    // ============================================================
    // 18. CLOCK
    // ============================================================

    const clock =
        document.getElementById(
            'current-datetime'
        );


    if (clock) {

        const updateClock =
            () => {

                clock.textContent =
                    new Date().toLocaleString();

            };


        updateClock();


        setInterval(
            updateClock,
            1000
        );

    }


    // ============================================================
    // 19. STARTUP
    // ============================================================

    setTimeout(
        () => {

            showNotification(
                'OSDVAS initialized. Dashboard ready for SAR analysis.',
                'success'
            );


            updateTimeline();

        },
        500
    );


});