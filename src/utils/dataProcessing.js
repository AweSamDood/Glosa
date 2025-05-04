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

    // Calculate summary statistics for each signal group (will include change count)
    Object.values(signalGroupsData).forEach(sg => {
        sg.summary = calculateSignalGroupSummary(sg.metrics);
    });

    // Calculate overall summary for the pass, including the global change flag
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
        // Add the new flag to the summary
        significantGreenIntervalChangeOccurred: significantGreenIntervalChangeOccurred
    };

    const finalSignalGroups = Object.keys(signalGroupsData).length > 0 ? signalGroupsData : {};

    return {
        passIndex,
        uuid,
        timestamp: firstTimestamp,
        signalGroups: finalSignalGroups,
        summary // Contains the new significantGreenIntervalChangeOccurred flag
    };
};

// --- processRawData (No changes needed here, it calls the updated processPassThrough) ---
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

        // Calls the *updated* processPassThrough
        const processedPass = processPassThrough(events, passIndex);
        intersectionMap[intersectionId].passThroughs.push(processedPass);
    });

    return intersectionMap;
};