// src/utils/dataProcessing.js

export const countOccurrences = (arr) => {
    const counts = {};
    arr.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
    });
    return counts;
};

export const calculateSignalGroupSummary = (metrics) => {
    // Skip if no metrics
    if (!metrics || metrics.length === 0) {
        return {
            distanceRange: { min: 0, max: 0 },
            speedRange: { min: 0, max: 0, avg: 0 },
            glosaAdvice: {},
            clearanceTypes: {},
            // Add default for new summary field
            greenIntervalChangesDetected: 0,
        };
    }

    const summary = {
        distanceRange: {
            min: Math.min(...metrics.map(m => m.distance)),
            max: Math.max(...metrics.map(m => m.distance)),
        },
        speedRange: {
            min: Math.min(...metrics.map(m => m.speed)),
            max: Math.max(...metrics.map(m => m.speed)),
            avg: metrics.reduce((sum, m) => sum + m.speed, 0) / metrics.length,
        },
        glosaAdvice: countOccurrences(metrics.filter(m => m.glosaAdvice).map(m => m.glosaAdvice)),
        clearanceTypes: countOccurrences(metrics.filter(m => m.clearanceCalType).map(m => m.clearanceCalType)),
        // Count how many metrics detected a change from the previous one
        greenIntervalChangesDetected: metrics.filter(m => m.greenIntervalChanged).length,
    };

    return summary;
};

// --- Updated processPassThrough with Green Interval Change Detection ---
export const processPassThrough = (events, passIndex) => {
    const uuid = events[0]?.uuid || `pass-${passIndex}`;
    const firstTimestamp = events[0]?.dt ? new Date(events[0].dt) : new Date();

    const signalGroupsData = {};
    let foundAnySignalGroup = false;
    let significantGreenIntervalChangeOccurred = false; // Flag for the entire pass
    const previousSignalGroupGreenIntervals = {}; // Track previous { start, end, timestamp } per SG

    // Sort events by timestamp to ensure sequential processing
    const sortedEvents = [...events].sort((a, b) => new Date(a.dt) - new Date(b.dt));

    sortedEvents.forEach((event, eventIndex) => {
        const currentTimestamp = new Date(event.dt);
        if (!event.trafficLightsStatus?.signalGroup) return;

        event.trafficLightsStatus.signalGroup.forEach(sg => {
            const sgName = sg.name;
            if (!sgName) return;

            foundAnySignalGroup = true;

            // Initialize signal group data if first time seeing it
            if (!signalGroupsData[sgName]) {
                signalGroupsData[sgName] = {
                    name: sgName,
                    metrics: [],
                    hasMovementEvents: false,
                    allMovementEventsUnavailable: true,
                };
            }

            // --- Movement Event Availability Check (as before) ---
            const movementEventsRaw = sg.movementEvent || [];
            if (movementEventsRaw.length > 0) {
                signalGroupsData[sgName].hasMovementEvents = true;
                const hasAvailableMovementEvent = movementEventsRaw.some(
                    me => me.state && me.state !== "unavailable"
                );
                if (hasAvailableMovementEvent) {
                    signalGroupsData[sgName].allMovementEventsUnavailable = false;
                }
            }


            // --- Prepare Metric Data ---
            const metric = {
                timestamp: currentTimestamp,
                distance: event.intersectionPass?.intPassInfo?.distance ?? 0,
                speed: (event.posData?.sp?.value ?? 0) * 3.6,
                lat: event.posData?.geoPos?.lat ?? 0,
                lng: event.posData?.geoPos?.lng ?? 0,
                heading: event.posData?.head?.value ?? 0,
                movementEventsAvailable: signalGroupsData[sgName].hasMovementEvents && !signalGroupsData[sgName].allMovementEventsUnavailable,
                movementEvents: movementEventsRaw.map(me => ({ // Keep detailed movement events for display
                    state: me.state || 'unknown',
                    startTime: me.startTime && me.startTime !== "1970-01-01T00:00:00Z" ? new Date(me.startTime) : null,
                    minEndTime: me.minEndTime ? new Date(me.minEndTime) : null,
                    maxEndTime: me.maxEndTime ? new Date(me.maxEndTime) : null,
                    likelyTime: me.likelyTime && me.likelyTime !== "1970-01-01T00:00:00Z" ? new Date(me.likelyTime) : null,
                    nextTime: me.nextTime && me.nextTime !== "1970-01-01T00:00:00Z" ? new Date(me.nextTime) : null,
                    timeConfidence: me.timeConfidence ?? null
                })),
                // Initialize change flag for this specific metric
                greenIntervalChanged: false
            };

            // Extract GLOSA data and Green Interval
            let currentGreenStart = null;
            let currentGreenEnd = null;
            if (sg.glosa) {
                metric.glosaAdvice = sg.glosa.advice || null;
                metric.glosaSpeedKph = sg.glosa.speedKph !== null ? sg.glosa.speedKph : null;
                metric.timeToGreen = sg.glosa.timeToGreen !== null ? sg.glosa.timeToGreen : null;

                if (sg.glosa.internalInfo) {
                    const info = sg.glosa.internalInfo;
                    metric.distanceToStop = info.distanceToStop || null;
                    metric.minTravelTime = info.minimalTravelTime || null;
                    metric.maxTravelTime = info.maximalTravelTime || null;
                    metric.secondsToGreen = info.secondsToGreenStart || null;
                    metric.clearanceTime = info.clearanceTime || null;
                    metric.clearanceCalType = info.clearanceCalType || null;
                    // Store these for comparison
                    currentGreenStart = info.greenStartTime !== null ? Number(info.greenStartTime) : null;
                    currentGreenEnd = info.greenEndTime !== null ? Number(info.greenEndTime) : null;
                    metric.greenStartTime = currentGreenStart; // Also add to metric for display
                    metric.greenEndTime = currentGreenEnd;     // Also add to metric for display
                }
            }

            // --- Green Interval Change Detection Logic ---
            const previousIntervalData = previousSignalGroupGreenIntervals[sgName];

            if (eventIndex > 0 && previousIntervalData) { // Can only compare if not the first event and previous data exists
                const timeDiffSeconds = (currentTimestamp.getTime() - previousIntervalData.timestamp.getTime()) / 1000;
                const bufferSeconds = 2.0;
                // Threshold allows for time passage + buffer
                const threshold = Math.max(0, timeDiffSeconds) + bufferSeconds; // Ensure threshold is non-negative

                const prevStart = previousIntervalData.start;
                const prevEnd = previousIntervalData.end;

                let startChanged = false;
                let endChanged = false;

                // Check start time change
                if (currentGreenStart === null && prevStart !== null) {
                    startChanged = true; // Disappeared
                } else if (currentGreenStart !== null && prevStart === null) {
                    startChanged = true; // Appeared
                } else if (currentGreenStart !== null && prevStart !== null) {
                    if (Math.abs(currentGreenStart - prevStart) > threshold) {
                        startChanged = true;
                    }
                }

                // Check end time change
                if (currentGreenEnd === null && prevEnd !== null) {
                    endChanged = true; // Disappeared
                } else if (currentGreenEnd !== null && prevEnd === null) {
                    endChanged = true; // Appeared
                } else if (currentGreenEnd !== null && prevEnd !== null) {
                    if (Math.abs(currentGreenEnd - prevEnd) > threshold) {
                        endChanged = true;
                    }
                }

                if (startChanged || endChanged) {
                    metric.greenIntervalChanged = true; // Mark this metric
                    significantGreenIntervalChangeOccurred = true; // Mark the whole pass
                    // Optional console log for debugging:
                    // console.log(`Change detected for SG ${sgName} at ${currentTimestamp.toISOString()}`);
                    // console.log(`  Prev: [${prevStart}, ${prevEnd}] @ ${previousIntervalData.timestamp.toISOString()}`);
                    // console.log(`  Curr: [${currentGreenStart}, ${currentGreenEnd}] @ ${currentTimestamp.toISOString()}`);
                    // console.log(`  Diff: ${timeDiffSeconds.toFixed(1)}s, Threshold: ${threshold.toFixed(1)}s`);
                    // console.log(`  Start Changed: ${startChanged}, End Changed: ${endChanged}`);
                }
            }

            // Store current interval data for the next comparison for this SG
            // Only store if we actually have some interval data
            if (currentGreenStart !== null || currentGreenEnd !== null) {
                previousSignalGroupGreenIntervals[sgName] = {
                    start: currentGreenStart,
                    end: currentGreenEnd,
                    timestamp: currentTimestamp
                };
            } else {
                // If current interval is null, remove previous data to avoid false change detection on next non-null
                delete previousSignalGroupGreenIntervals[sgName];
            }


            // Add the processed metric to the signal group
            signalGroupsData[sgName].metrics.push(metric);
        });
    });

    // Handle case where no signal groups were found at all
    if (!foundAnySignalGroup && sortedEvents.length > 0) {
        signalGroupsData['default'] = {
            name: 'No Signal Groups',
            metrics: [{
                timestamp: firstTimestamp,
                distance: sortedEvents[0].intersectionPass?.intPassInfo?.distance ?? 0,
                speed: (sortedEvents[0].posData?.sp?.value ?? 0) * 3.6,
                movementEventsAvailable: false,
                glosaAdvice: 'none',
                movementEvents: [],
                greenIntervalChanged: false, // Default for dummy metric
                greenStartTime: null,
                greenEndTime: null,
            }],
            hasMovementEvents: false,
            allMovementEventsUnavailable: true
        };
    }
    // Analyze the last 3 messages to predict which signal groups were used for passage
    const predictedSignalGroupsUsed = [];
    const greenFoundInRecentEvents = {}; // Track which signal groups had green in last 3 events

    // Check up to last 3 events
    const eventsToCheck = Math.min(3, sortedEvents.length);
    let foundGreenInLastEvent = false;
    let foundGreenInPreviousEvents = false;

    for (let i = 0; i < eventsToCheck; i++) {
        const eventIndex = sortedEvents.length - 1 - i;
        const event = sortedEvents[eventIndex];

        if (event.trafficLightsStatus?.signalGroup) {
            event.trafficLightsStatus.signalGroup.forEach(sg => {
                const sgName = sg.name;
                if (!sgName) return;

                const greenStartTime = sg.glosa?.internalInfo?.greenStartTime;
                const greenEndTime = sg.glosa?.internalInfo?.greenEndTime;

                const hasCurrentGreen = (
                    greenStartTime !== null &&
                    greenEndTime !== null &&
                    greenStartTime === 0 &&
                    greenEndTime > 0
                );

                if (hasCurrentGreen) {
                    if (!greenFoundInRecentEvents[sgName]) {
                        greenFoundInRecentEvents[sgName] = {
                            foundInEvents: [],
                            lastGreenInterval: [greenStartTime, greenEndTime]
                        };
                    }
                    greenFoundInRecentEvents[sgName].foundInEvents.push(eventsToCheck - i);

                    // If this is the last event (i === 0), add to predictions
                    if (i === 0) {
                        predictedSignalGroupsUsed.push({
                            signalGroup: sgName,
                            reason: `Green phase active (interval: [0, ${greenEndTime}])`
                        });
                        foundGreenInLastEvent = true;
                    } else {
                        foundGreenInPreviousEvents = true;
                    }
                }
            });
        }
    }

    // Determine the warning level
    const allSignalGroupsHaveAvailableEvents = Object.values(signalGroupsData).every(sg =>
        sg.hasMovementEvents && !sg.allMovementEventsUnavailable
    );

    const hasNoPredictedGreensWithAvailableEvents = allSignalGroupsHaveAvailableEvents &&
        predictedSignalGroupsUsed.length === 0 &&
        Object.keys(signalGroupsData).length > 0;


    // New flag to indicate possible GPS mismatch
    const possibleGPSMismatch = hasNoPredictedGreensWithAvailableEvents && foundGreenInPreviousEvents;

    // Update the summary object
    const summary = {
        eventCount: sortedEvents.length,
        timeRange: {
            start: sortedEvents.length > 0 ? new Date(Math.min(...sortedEvents.map(e => new Date(e.dt)))) : new Date(),
            end: sortedEvents.length > 0 ? new Date(Math.max(...sortedEvents.map(e => new Date(e.dt)))) : new Date()
        },
        anySignalGroupHasMovementEvents: Object.values(signalGroupsData).some(sg => sg.hasMovementEvents),
        allMovementEventsUnavailable: Object.values(signalGroupsData).every(sg =>
            !sg.hasMovementEvents || sg.allMovementEventsUnavailable
        ),
        significantGreenIntervalChangeOccurred: significantGreenIntervalChangeOccurred,
        predictedSignalGroupsUsed: predictedSignalGroupsUsed,
        hasNoPredictedGreensWithAvailableEvents: hasNoPredictedGreensWithAvailableEvents,
        // Add new flags
        greenFoundInRecentEvents: greenFoundInRecentEvents,
        possibleGPSMismatch: possibleGPSMismatch
    };

    // Calculate summary statistics for each signal group (will include change count)
    Object.values(signalGroupsData).forEach(sg => {
        sg.summary = calculateSignalGroupSummary(sg.metrics);
    });

    const finalSignalGroups = Object.keys(signalGroupsData).length > 0 ? signalGroupsData : {};

    return {
        passIndex,
        uuid,
        timestamp: firstTimestamp,
        signalGroups: finalSignalGroups,
        summary // Contains the new significantGreenIntervalChangeOccurred flag
    };
};

export const calculateIntersectionSummary = (intersection) => {
    if (!intersection || !intersection.passThroughs || intersection.passThroughs.length === 0) {
        return {
            totalPassThroughs: 0,
            timeRange: { start: null, end: null },
            distancePatterns: [],
            speedPatterns: [],
            stopLocations: [],
            signalGroupAnalysis: {}
        };
    }

    const passThroughs = intersection.passThroughs;
    const summary = {
        totalPassThroughs: passThroughs.length,
        timeRange: {
            start: new Date(Math.min(...passThroughs.map(p => p.timestamp.getTime()))),
            end: new Date(Math.max(...passThroughs.map(p => p.timestamp.getTime())))
        },
        signalGroupAnalysis: {},
        distancePatterns: [],
        speedPatterns: [],
        stopLocations: [],
        greenIntervalChanges: 0
    };

    // Analyze patterns across all pass-throughs
    const allMetrics = [];
    const distanceBuckets = new Map(); // For identifying common stopping distances
    const speedsBySGAndDistance = new Map(); // Key: "signalGroup-distanceRange", Value: [speeds]
    const passThroughStops = new Map(); // Track stops per pass-through: Key: "passIndex-distanceBucket", Value: [{ signalGroups, timestamp }]

    passThroughs.forEach((passThrough, passIndex) => {
        // Count green interval changes
        if (passThrough.summary?.significantGreenIntervalChangeOccurred) {
            summary.greenIntervalChanges++;
        }

        Object.entries(passThrough.signalGroups || {}).forEach(([sgName, sgData]) => {
            if (!summary.signalGroupAnalysis[sgName]) {
                summary.signalGroupAnalysis[sgName] = {
                    totalOccurrences: 0,
                    glosaAdviceStats: {},
                    movementEventAvailability: { available: 0, unavailable: 0, none: 0 },
                    distanceRange: { min: Infinity, max: -Infinity },
                    speedRange: { min: Infinity, max: -Infinity },
                    greenIntervalChanges: 0
                };
            }

            const sgAnalysis = summary.signalGroupAnalysis[sgName];
            sgAnalysis.totalOccurrences++;

            // Track movement event availability
            if (sgData.hasMovementEvents) {
                if (sgData.allMovementEventsUnavailable) {
                    sgAnalysis.movementEventAvailability.unavailable++;
                } else {
                    sgAnalysis.movementEventAvailability.available++;
                }
            } else {
                sgAnalysis.movementEventAvailability.none++;
            }

            // Analyze metrics
            sgData.metrics.forEach(metric => {
                allMetrics.push({ ...metric, signalGroup: sgName });

                // Update distance range
                sgAnalysis.distanceRange.min = Math.min(sgAnalysis.distanceRange.min, metric.distance);
                sgAnalysis.distanceRange.max = Math.max(sgAnalysis.distanceRange.max, metric.distance);

                // Update speed range
                sgAnalysis.speedRange.min = Math.min(sgAnalysis.speedRange.min, metric.speed);
                sgAnalysis.speedRange.max = Math.max(sgAnalysis.speedRange.max, metric.speed);

                // Count green interval changes
                if (metric.greenIntervalChanged) {
                    sgAnalysis.greenIntervalChanges++;
                }

                // Detect potential stops (speed < 2 km/h)
                if (metric.speed < 2) {
                    const distanceBucket = Math.round(metric.distance / 5) * 5; // 5m buckets
                    const passStopKey = `${passIndex}-${distanceBucket}`;

                    // Track unique stops per pass-through
                    if (!passThroughStops.has(passStopKey)) {
                        passThroughStops.set(passStopKey, {
                            signalGroups: new Set(),
                            timestamp: metric.timestamp,
                            distance: metric.distance
                        });
                    }
                    passThroughStops.get(passStopKey).signalGroups.add(sgName);

                    // Also track by signal group for pattern analysis
                    const sgKey = `${sgName}-${distanceBucket}`;
                    if (!distanceBuckets.has(sgKey)) {
                        distanceBuckets.set(sgKey, []);
                    }
                    distanceBuckets.get(sgKey).push({
                        distance: metric.distance,
                        timestamp: metric.timestamp,
                        signalGroup: sgName,
                        passIndex
                    });
                }

                // Track speeds by distance ranges
                const distanceRange = Math.floor(metric.distance / 10) * 10; // 10m ranges
                const speedKey = `${sgName}-${distanceRange}`;
                if (!speedsBySGAndDistance.has(speedKey)) {
                    speedsBySGAndDistance.set(speedKey, []);
                }
                speedsBySGAndDistance.get(speedKey).push(metric.speed);
            });

            // Aggregate GLOSA advice
            Object.entries(sgData.summary.glosaAdvice || {}).forEach(([advice, count]) => {
                if (!sgAnalysis.glosaAdviceStats[advice]) {
                    sgAnalysis.glosaAdviceStats[advice] = 0;
                }
                sgAnalysis.glosaAdviceStats[advice] += count;
            });
        });
    });

    // Analyze stop locations for patterns - Count unique stops per distance bucket
    const stopsByDistance = new Map(); // Key: distanceBucket, Value: Set of passIndexes
    passThroughStops.forEach((stopInfo, key) => {
        const [passIndex, distanceBucket] = key.split('-');

        if (!stopsByDistance.has(distanceBucket)) {
            stopsByDistance.set(distanceBucket, {
                passes: new Set(),
                signalGroups: new Set(),
                distances: []
            });
        }

        const bucketInfo = stopsByDistance.get(distanceBucket);
        bucketInfo.passes.add(passIndex);
        stopInfo.signalGroups.forEach(sg => bucketInfo.signalGroups.add(sg));
        bucketInfo.distances.push(stopInfo.distance);
    });

    // Create stop locations with proper percentage calculation
    stopsByDistance.forEach((info, distanceBucket) => {
        const uniqueStopCount = info.passes.size;
        if (uniqueStopCount >= Math.max(2, passThroughs.length * 0.3)) { // At least 30% of passes or 2
            summary.stopLocations.push({
                signalGroup: Array.from(info.signalGroups).join(', '),
                distanceRange: `${distanceBucket}-${parseInt(distanceBucket) + 5}m`,
                occurrences: uniqueStopCount,
                percentage: (uniqueStopCount / passThroughs.length * 100).toFixed(1),
                averageDistance: info.distances.reduce((sum, d) => sum + d, 0) / info.distances.length
            });
        }
    });

    // Sort stop locations by distance
    summary.stopLocations.sort((a, b) =>
        parseFloat(a.averageDistance) - parseFloat(b.averageDistance)
    );

    // Analyze speed patterns by distance
    speedsBySGAndDistance.forEach((speeds, key) => {
        if (speeds.length >= 2) {
            const [signalGroup, distanceRange] = key.split('-');
            const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
            const minSpeed = Math.min(...speeds);
            const maxSpeed = Math.max(...speeds);

            summary.speedPatterns.push({
                signalGroup,
                distanceRange: `${distanceRange}-${parseInt(distanceRange) + 10}m`,
                averageSpeed: avgSpeed,
                minSpeed,
                maxSpeed,
                samples: speeds.length
            });
        }
    });

    // Sort speed patterns by distance
    summary.speedPatterns.sort((a, b) =>
        parseInt(a.distanceRange) - parseInt(b.distanceRange)
    );

    return summary;
};



// Add this to processRawData function after creating intersectionMap
export const processRawData = (jsonData) => {
    const intersectionMap = {};
    const passes = Array.isArray(jsonData) ? jsonData : [jsonData];

    passes.forEach((passData, passIndex) => {
        const events = passData.events || [];
        if (!events || events.length === 0) return;

        const firstEvent = events[0];
        const intersectionInfo = firstEvent.intersectionPass?.intersection;
        if (!intersectionInfo || !intersectionInfo.name) return;

        const intersectionName = intersectionInfo.name;
        const intersectionId = `${intersectionInfo.operatorId}-${intersectionInfo.intId}`;

        if (!intersectionMap[intersectionId]) {
            intersectionMap[intersectionId] = {
                id: intersectionId,
                name: intersectionName,
                operatorId: intersectionInfo.operatorId,
                intId: intersectionInfo.intId,
                passThroughs: []
            };
        }

        const processedPass = processPassThrough(events, passIndex);
        intersectionMap[intersectionId].passThroughs.push(processedPass);
    });

    // Calculate intersection summaries
    Object.values(intersectionMap).forEach(intersection => {
        intersection.summary = calculateIntersectionSummary(intersection);
    });

    return intersectionMap;
};