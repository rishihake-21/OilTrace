// data.js - Synthetic Data for OSDVAS Prototype
// Location: Arabian Sea, west of Maharashtra coast (near Ratnagiri), India.

(function() {
    // Helper function to generate an irregular polygon
    function generateSpillPolygon(centerLat, centerLng, radiusLat, radiusLng, numPoints) {
        const polygon = [];
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI;
            // Add some randomness to radius for organic shape
            const rOffset = 0.5 + Math.random() * 0.5;
            // Elongate along NW-SE axis (roughly 135/315 degrees)
            const elongation = Math.sin(angle - Math.PI / 4) * 0.5 + 1;
            
            const lat = centerLat + Math.cos(angle) * radiusLat * rOffset * elongation;
            const lng = centerLng + Math.sin(angle) * radiusLng * rOffset * elongation;
            polygon.push([lat, lng]);
        }
        return polygon;
    }

    const baseTime = new Date('2026-09-07T14:30:00Z').getTime();

    // Helper to generate a curved path
    function generatePath(start, end, numPoints, curveFactor, startTime, hoursTotal) {
        const path = [];
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            // Linear interpolation
            let lat = start[0] + (end[0] - start[0]) * t;
            let lng = start[1] + (end[1] - start[1]) * t;
            
            // Add curve
            const curve = Math.sin(t * Math.PI) * curveFactor;
            lat += curve;
            lng -= curve;

            const time = new Date(startTime + (hoursTotal * 3600000 * t));
            path.push({
                position: [lat, lng],
                timestamp: time.toISOString(),
                hours: (hoursTotal * t) - (hoursTotal > 0 ? 0 : Math.abs(hoursTotal))
            });
        }
        return path;
    }

    // Generate AIS track
    function generateTrack(start, end, numPoints, startTime, endTime, anomalies = {}) {
        const track = [];
        const duration = endTime - startTime;
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            let lat = start[0] + (end[0] - start[0]) * t;
            let lng = start[1] + (end[1] - start[1]) * t;
            
            // Add some noise to track
            lat += (Math.random() - 0.5) * 0.02;
            lng += (Math.random() - 0.5) * 0.02;

            let time = startTime + duration * t;
            let speed = 10 + Math.random() * 4;
            let course = Math.atan2(end[1] - start[1], end[0] - start[0]) * (180 / Math.PI);
            if (course < 0) course += 360;

            // Apply anomalies
            if (anomalies.speedDrop && t > 0.4 && t < 0.6) speed = 4;
            if (anomalies.gap && t > 0.45 && t < 0.5) continue;

            track.push({
                lat: lat,
                lng: lng,
                timestamp: new Date(time).toISOString(),
                speed: speed,
                course: course,
                heading: course
            });
        }
        return track;
    }

    const startSpill = [17.92, 71.28];
    const currentSpill = [17.85, 71.20];
    const forecastSpill = [17.75, 71.10];

    window.OSDVAS_DATA = {
        spill: {
            id: 'SPILL-2026-0847',
            detectionTime: '2026-09-07T14:30:00Z',
            source: 'Sentinel-1A SAR',
            confidence: 94.2,
            area: 12.7,
            perimeter: 18.3,
            estimatedAge: 14,
            center: currentSpill,
            polygon: generateSpillPolygon(currentSpill[0], currentSpill[1], 0.02, 0.03, 24)
        },
        origin: {
            position: startSpill,
            estimatedTime: '2026-09-07T00:30:00Z',
            uncertaintyRadius: 2.5
        },
        drift: {
            hindcast: generatePath(startSpill, currentSpill, 20, 0.01, baseTime - (14 * 3600000), 14),
            forecast: generatePath(currentSpill, forecastSpill, 24, -0.01, baseTime, 24),
            uncertaintyCone: generateSpillPolygon(startSpill[0], startSpill[1], 0.025, 0.025, 12)
        },
        vessels: [
            {
                mmsi: 356789012,
                imo: 'IMO9123456',
                name: 'MT Oceanic Fortune',
                type: 'Oil Tanker',
                flag: 'PA',
                length: 250,
                track: generateTrack([18.5, 70.8], [17.0, 71.8], 30, baseTime - (48 * 3600000), baseTime + (24 * 3600000), { speedDrop: true, gap: true }),
                attribution: {
                    score: 87,
                    rank: 1,
                    factors: { proximity: 95, temporalCorrelation: 90, trajectoryAlignment: 85, behavioralAnomaly: 78 },
                    anomalies: ['Speed reduction from 12kn to 4kn near origin', 'AIS gap of 18 minutes', 'Course deviation of 15°'],
                    minDistanceToOrigin: 0.8,
                    timeAtClosestApproach: '2026-09-07T00:25:00Z'
                }
            },
            {
                mmsi: 563456789,
                imo: 'IMO9234567',
                name: 'MV Pacific Voyager',
                type: 'Cargo',
                flag: 'SG',
                length: 180,
                track: generateTrack([17.0, 71.0], [18.5, 71.5], 30, baseTime - (48 * 3600000), baseTime + (24 * 3600000)),
                attribution: {
                    score: 62,
                    rank: 2,
                    factors: { proximity: 60, temporalCorrelation: 70, trajectoryAlignment: 50, behavioralAnomaly: 68 },
                    anomalies: ['Passed within 4.2km of origin', 'Slight speed variation'],
                    minDistanceToOrigin: 4.2,
                    timeAtClosestApproach: '2026-09-07T01:10:00Z'
                }
            },
            {
                mmsi: 636012345,
                imo: 'IMO9345678',
                name: 'MT Arabian Dawn',
                type: 'Chemical Tanker',
                flag: 'LR',
                length: 160,
                track: generateTrack([18.2, 71.8], [17.5, 70.5], 25, baseTime - (48 * 3600000), baseTime + (24 * 3600000)),
                attribution: {
                    score: 48,
                    rank: 3,
                    factors: { proximity: 40, temporalCorrelation: 55, trajectoryAlignment: 40, behavioralAnomaly: 57 },
                    anomalies: ['Chemical tanker in vicinity'],
                    minDistanceToOrigin: 8.5,
                    timeAtClosestApproach: '2026-09-07T03:00:00Z'
                }
            },
            {
                mmsi: 477234567,
                imo: 'IMO9456789',
                name: 'MV Blue Horizon',
                type: 'Container',
                flag: 'HK',
                length: 300,
                track: generateTrack([17.2, 71.9], [18.8, 70.2], 30, baseTime - (48 * 3600000), baseTime + (24 * 3600000)),
                attribution: {
                    score: 31,
                    rank: 4,
                    factors: { proximity: 25, temporalCorrelation: 30, trajectoryAlignment: 35, behavioralAnomaly: 34 },
                    anomalies: [],
                    minDistanceToOrigin: 12.1,
                    timeAtClosestApproach: '2026-09-06T22:00:00Z'
                }
            },
            {
                mmsi: 419876543,
                imo: 'IMO9567890',
                name: 'FV Sea Harvest',
                type: 'Fishing',
                flag: 'IN',
                length: 35,
                track: generateTrack([17.7, 71.1], [17.8, 71.3], 40, baseTime - (48 * 3600000), baseTime + (24 * 3600000)), // Erratic in reality
                attribution: {
                    score: 22,
                    rank: 5,
                    factors: { proximity: 40, temporalCorrelation: 20, trajectoryAlignment: 10, behavioralAnomaly: 18 },
                    anomalies: [],
                    minDistanceToOrigin: 6.0,
                    timeAtClosestApproach: '2026-09-07T05:00:00Z'
                }
            },
            {
                mmsi: 538006789,
                imo: 'IMO9678901',
                name: 'MV Delta Spirit',
                type: 'Bulk Carrier',
                flag: 'MH',
                length: 220,
                track: generateTrack([18.9, 71.1], [17.1, 71.9], 25, baseTime - (48 * 3600000), baseTime + (24 * 3600000)),
                attribution: {
                    score: 15,
                    rank: 6,
                    factors: { proximity: 10, temporalCorrelation: 15, trajectoryAlignment: 10, behavioralAnomaly: 25 },
                    anomalies: [],
                    minDistanceToOrigin: 20.4,
                    timeAtClosestApproach: '2026-09-06T18:00:00Z'
                }
            },
            {
                mmsi: 419001234,
                imo: 'IMO9789012',
                name: 'CG Samudra Prahari',
                type: 'Coast Guard',
                flag: 'IN',
                length: 90,
                track: generateTrack([17.0, 72.0], currentSpill, 25, baseTime, baseTime + (12 * 3600000)), // Arrives after
                attribution: {
                    score: 3,
                    rank: 7,
                    factors: { proximity: 0, temporalCorrelation: 0, trajectoryAlignment: 0, behavioralAnomaly: 12 },
                    anomalies: [],
                    minDistanceToOrigin: 35.0,
                    timeAtClosestApproach: '2026-09-07T18:00:00Z'
                }
            }
        ],
        environment: {
            wind: { speed: 12.4, direction: 315, unit: 'knots' },
            current: { speed: 0.8, direction: 142, unit: 'knots' },
            waveHeight: { value: 1.2, period: 6.5 },
            sst: 28.3,
            visibility: 'Good'
        },
        timeline: {
            start: '2026-09-06T00:00:00Z',
            end: '2026-09-08T14:30:00Z',
            detectionTime: '2026-09-07T14:30:00Z',
            originTime: '2026-09-07T00:30:00Z',
            totalHours: 86
        }
    };
})();
