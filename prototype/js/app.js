// app.js - OSDVAS Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
    const data = window.OSDVAS_DATA;
    if (!data) {
        console.error("OSDVAS_DATA not found. Ensure data.js is loaded first.");
        return;
    }

    // 1. Initialize Map
    const CARTO_KEY = 'cb1_30zx_1_29883dacf4d9ac7332b5460f';
    const map = L.map('map').setView(data.spill.center, 10);
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`, {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Layer Groups
    const layers = {
        spill: L.layerGroup().addTo(map),
        vessels: L.layerGroup().addTo(map),
        hindcast: L.layerGroup().addTo(map),
        forecast: L.layerGroup().addTo(map),
        origin: L.layerGroup().addTo(map)
    };

    // 2. Create Map Layers
    // Spill Layer
    const spillPolygon = L.polygon(data.spill.polygon, {
        fillColor: '#ff4757',
        fillOpacity: 0.4,
        color: '#ff6b81',
        weight: 2
    }).addTo(layers.spill);

    // Pulsing animation for spill polygon
    setInterval(() => {
        const currentOpacity = spillPolygon.options.fillOpacity;
        spillPolygon.setStyle({ fillOpacity: currentOpacity === 0.4 ? 0.3 : 0.4 });
    }, 2000);

    // Hindcast
    const hindcastCoords = data.drift.hindcast.map(p => p.position);
    L.polyline(hindcastCoords, { color: '#ffa502', dashArray: '5, 10', weight: 2 }).addTo(layers.hindcast);
    
    // Forecast
    const forecastCoords = data.drift.forecast.map(p => p.position);
    L.polyline(forecastCoords, { color: '#1e90ff', dashArray: '5, 10', weight: 2 }).addTo(layers.forecast);

    // Origin
    L.circleMarker(data.origin.position, {
        color: '#ff4757',
        fillColor: '#ff4757',
        fillOpacity: 0.8,
        radius: 8,
        className: 'pulsing-marker'
    }).addTo(layers.origin);
    
    L.circle(data.origin.position, {
        radius: data.origin.uncertaintyRadius * 1000,
        color: '#ff4757',
        weight: 1,
        dashArray: '5, 5',
        fill: false
    }).addTo(layers.origin);

    // Vessel Colors
    const vesselColors = ['#2ed573', '#ffd32a', '#ff6348', '#7158e2', '#3ae374', '#17c0eb', '#ff9ff3'];
    const vesselMarkers = {};
    const vesselPaths = {};

    data.vessels.forEach((v, idx) => {
        const color = vesselColors[idx % vesselColors.length];
        const trackCoords = v.track.map(p => [p.lat, p.lng]);
        
        vesselPaths[v.mmsi] = L.polyline(trackCoords, { color: color, weight: 2, opacity: 0.6 }).addTo(layers.vessels);
        
        // Initial marker at first point
        const firstPoint = v.track[0];
        vesselMarkers[v.mmsi] = L.marker([firstPoint.lat, firstPoint.lng], {
            icon: L.divIcon({
                className: 'ship-marker',
                html: `<div class="ship-icon" style="transform: rotate(${firstPoint.heading || 0}deg); color: ${color}"><i class="fas fa-location-arrow"></i></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).bindPopup(`<b>${v.name}</b><br/>Speed: ${firstPoint.speed.toFixed(1)} kn`).addTo(layers.vessels);
    });

    // 3. Populate Spill Metrics
    const animateValue = (id, start, end, duration) => {
        let current = start;
        const range = end - start;
        const increment = end > start ? (range / (duration / 10)) : -1;
        const stepTime = Math.abs(Math.floor(duration / (range || 1)));
        const obj = document.getElementById(id);
        if (!obj) return;
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            obj.innerHTML = current % 1 !== 0 ? current.toFixed(1) : Math.floor(current);
        }, 10); // Run more smoothly
    };

    if(document.getElementById('spill-area')) animateValue('spill-area', 0, data.spill.area, 1000);
    if(document.getElementById('spill-perimeter')) animateValue('spill-perimeter', 0, data.spill.perimeter, 1000);
    if(document.getElementById('spill-age')) animateValue('spill-age', 0, data.spill.estimatedAge, 1000);
    if(document.getElementById('spill-confidence')) animateValue('spill-confidence', 0, data.spill.confidence, 1000);
    
    if(document.getElementById('spill-center')) document.getElementById('spill-center').textContent = `${data.spill.center[0].toFixed(4)}°N, ${data.spill.center[1].toFixed(4)}°E`;
    if(document.getElementById('detection-time')) document.getElementById('detection-time').textContent = new Date(data.spill.detectionTime).toLocaleString();

    // 4. Build Suspect Vessel List
    const suspectList = document.getElementById('suspect-list');
    if (suspectList) {
        data.vessels.sort((a, b) => b.attribution.score - a.attribution.score).forEach(v => {
            const scoreColor = v.attribution.score > 70 ? '#ff4757' : (v.attribution.score > 40 ? '#ffa502' : '#2ed573');
            
            const card = document.createElement('div');
            card.className = 'vessel-card';
            card.dataset.mmsi = v.mmsi;
            
            let anomaliesHtml = '';
            if (v.attribution.anomalies.length > 0) {
                anomaliesHtml = v.attribution.anomalies.map(a => `<span class="anomaly-tag">${a}</span>`).join('');
            }

            card.innerHTML = `
                <div class="vessel-card-header">
                    <div class="vessel-info">
                        <span class="vessel-name">${v.name}</span>
                        <span class="vessel-type">${v.type} • ${v.flag}</span>
                        <span class="vessel-mmsi">MMSI: ${v.mmsi}</span>
                    </div>
                    <div class="vessel-score" style="color: ${scoreColor}">
                        <span class="score-value">${v.attribution.score}</span>
                        <span class="score-label">%</span>
                    </div>
                </div>
                <div class="score-bar"><div class="score-fill" style="width:${v.attribution.score}%; background:${scoreColor}"></div></div>
                <div class="vessel-factors">${anomaliesHtml}</div>
            `;
            
            card.addEventListener('click', () => showVesselDetails(v));
            suspectList.appendChild(card);
        });
    }

    // 5. Layer Toggle Handlers
    const setupToggle = (id, layerGrp) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                if (e.target.checked) map.addLayer(layerGrp);
                else map.removeLayer(layerGrp);
            });
        }
    };

    setupToggle('layer-spill', layers.spill);
    setupToggle('layer-vessels', layers.vessels);
    setupToggle('layer-hindcast', layers.hindcast);
    setupToggle('layer-forecast', layers.forecast);
    setupToggle('layer-origin', layers.origin);

    // 6. Timeline Functionality
    const slider = document.getElementById('timeline-slider');
    const playBtn = document.getElementById('play-btn');
    const timeDisplay = document.getElementById('time-display');
    let playInterval;

    const startTime = new Date(data.timeline.start).getTime();
    const endTime = new Date(data.timeline.end).getTime();
    const totalDuration = endTime - startTime;

    const updateTimeline = () => {
        if (!slider) return;
        const progress = slider.value / 100;
        const currentTime = startTime + (totalDuration * progress);
        
        if (timeDisplay) {
            const dateObj = new Date(currentTime);
            timeDisplay.textContent = dateObj.toLocaleString();
        }

        // Update vessels
        data.vessels.forEach((v, idx) => {
            const color = vesselColors[idx % vesselColors.length];
            // Find closest track point
            let closestPt = v.track[0];
            for (let i = 0; i < v.track.length - 1; i++) {
                const ptTime = new Date(v.track[i].timestamp).getTime();
                const nextPtTime = new Date(v.track[i+1].timestamp).getTime();
                if (currentTime >= ptTime && currentTime <= nextPtTime) {
                    // Interpolate
                    const ratio = (currentTime - ptTime) / (nextPtTime - ptTime);
                    closestPt = {
                        lat: v.track[i].lat + (v.track[i+1].lat - v.track[i].lat) * ratio,
                        lng: v.track[i].lng + (v.track[i+1].lng - v.track[i].lng) * ratio,
                        heading: v.track[i].heading,
                        speed: v.track[i].speed
                    };
                    break;
                } else if (currentTime > nextPtTime) {
                    closestPt = v.track[i+1];
                }
            }

            const marker = vesselMarkers[v.mmsi];
            if (marker) {
                marker.setLatLng([closestPt.lat, closestPt.lng]);
                const iconHtml = `<div class="ship-icon" style="transform: rotate(${closestPt.heading || 0}deg); color: ${color}"><i class="fas fa-location-arrow"></i></div>`;
                marker.setIcon(L.divIcon({ className: 'ship-marker', html: iconHtml, iconSize: [24,24], iconAnchor:[12,12] }));
                marker.setPopupContent(`<b>${v.name}</b><br/>Speed: ${(closestPt.speed||0).toFixed(1)} kn`);
            }
        });
    };

    if (slider) {
        slider.addEventListener('input', updateTimeline);
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (playInterval) {
                clearInterval(playInterval);
                playInterval = null;
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            } else {
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                playInterval = setInterval(() => {
                    if (slider) {
                        let val = parseFloat(slider.value);
                        val += 0.5; // speed
                        if (val > 100) {
                            val = 100;
                            clearInterval(playInterval);
                            playInterval = null;
                            playBtn.innerHTML = '<i class="fas fa-play"></i>';
                        }
                        slider.value = val;
                        updateTimeline();
                    }
                }, 100);
            }
        });
    }

    // 7. Map Controls
    const zoomBtn = document.getElementById('zoom-to-spill');
    if (zoomBtn) {
        zoomBtn.addEventListener('click', () => {
            map.fitBounds(spillPolygon.getBounds(), { padding: [50, 50] });
        });
    }

    // 8. Vessel Detail Panel
    function showVesselDetails(v) {
        const panel = document.getElementById('vessel-detail-panel');
        const content = document.getElementById('vessel-detail-content');
        if (!panel || !content) return;

        // Reset other paths
        Object.values(vesselPaths).forEach(p => p.setStyle({ weight: 2, opacity: 0.6 }));
        
        // Highlight this one
        if (vesselPaths[v.mmsi]) {
            vesselPaths[v.mmsi].setStyle({ weight: 4, opacity: 1 });
            vesselPaths[v.mmsi].bringToFront();
            map.fitBounds(vesselPaths[v.mmsi].getBounds());
        }

        content.innerHTML = `
            <h3>${v.name}</h3>
            <p>${v.type} | Flag: ${v.flag} | Length: ${v.length}m</p>
            <p>IMO: ${v.imo} | MMSI: ${v.mmsi}</p>
            <hr/>
            <h4>Attribution Factors</h4>
            <ul>
                <li>Proximity: ${v.attribution.factors.proximity}/100</li>
                <li>Temporal Correlation: ${v.attribution.factors.temporalCorrelation}/100</li>
                <li>Trajectory Alignment: ${v.attribution.factors.trajectoryAlignment}/100</li>
                <li>Behavioral Anomaly: ${v.attribution.factors.behavioralAnomaly}/100</li>
            </ul>
            <p><strong>Min Distance to Origin:</strong> ${v.attribution.minDistanceToOrigin} km</p>
            <p><strong>Time at Closest Approach:</strong> ${new Date(v.attribution.timeAtClosestApproach).toLocaleString()}</p>
        `;
        
        panel.style.display = 'block';
    }

    const closePanel = document.getElementById('close-vessel-detail');
    if (closePanel) {
        closePanel.addEventListener('click', () => {
            document.getElementById('vessel-detail-panel').style.display = 'none';
            // Reset weights
            Object.values(vesselPaths).forEach(p => p.setStyle({ weight: 2, opacity: 0.6 }));
        });
    }

    // 9. Notifications
    function showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        
        container.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 500);
        }, 5000);
    }

    // 10. Clock Update
    const clock = document.getElementById('current-datetime');
    if (clock) {
        setInterval(() => {
            clock.textContent = new Date().toLocaleString();
        }, 1000);
    }

    // 11. Startup Sequence
    setTimeout(() => {
        showNotification('OSDVAS initialized. 1 active spill detection loaded.', 'success');
        updateTimeline(); // Init timeline
    }, 500);

    setTimeout(() => {
        showNotification('Vessel attribution analysis in progress...', 'info');
    }, 2500);

    setTimeout(() => {
        showNotification('Attribution complete. 7 vessels analyzed. Primary suspect: MT Oceanic Fortune (87%)', 'warning');
        
        // Trigger simulated analysis UI update
        const runBtn = document.getElementById('run-analysis');
        if (runBtn) runBtn.classList.add('completed');
    }, 7500);
});
