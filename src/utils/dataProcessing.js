// src/utils/dataProcessing.js - Updated for green interval change magnitude tracking

export const countOccurrences = (arr) => {
    const counts = {};
    arr.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
    });
    return counts;
};

// Add this function at the top level of the file
function checkGreenIntervalStability(datapoint1Events, datapoint2Events) {
    if (!datapoint1Events || !datapoint2Events ||
        datapoint1Events.length === 0 || datapoint2Events.length === 0) {
        return {isStable: false, reason: "insufficient_data"};
    }

    // Extract phase types and end times from both datapoints
    const extractPhaseInfo = (events) => {
        return events.map(event => ({
            phase: event.state,
            endTime: event.likelyTime || event.minEndTime
        }));
    };

    const dp1Phases = extractPhaseInfo(datapoint1Events);
    const dp2Phases = extractPhaseInfo(datapoint2Events);

    // Case 1: Check if phases have same sequence
    let sameSequence = true;
    if (dp1Phases.length === dp2Phases.length) {
        for (let i = 0; i < dp1Phases.length; i++) {
            if (dp1Phases[i].phase !== dp2Phases[i].phase) {
                sameSequence = false;
                break;
            }
        }

        if (sameSequence) {
            // Compare timing of corresponding phases
            let timingDifferences = [];
            for (let i = 0; i < dp1Phases.length; i++) {
                if (dp1Phases[i].endTime && dp2Phases[i].endTime) {
                    const timeDiff = Math.abs(
                        new Date(dp2Phases[i].endTime) - new Date(dp1Phases[i].endTime)
                    ) / 1000; // in seconds

                    timingDifferences.push(timeDiff);
                }
            }

            // If any significant differences in timing, it's not stable
            const maxDiff = Math.max(...timingDifferences);
            if (maxDiff > 2) { // 2-second threshold for significant change
                return {isStable: false, reason: "timing_shifted", maxDifference: maxDiff};
            }

            return {isStable: true, reason: "same_sequence_and_timing"};
        }
    }

    // Case 2: Check if phases are shifted by one
    let shiftedByOne = true;
    if (dp1Phases.length > 0 && dp2Phases.length > 0) {
        for (let i = 0; i < Math.min(dp1Phases.length, dp2Phases.length - 1); i++) {
            if (dp1Phases[i].phase !== dp2Phases[i + 1].phase) {
                shiftedByOne = false;
                break;
            }
        }

        if (shiftedByOne) {
            // This is a natural phase progression
            return {isStable: true, reason: "natural_phase_progression"};
        }
    }

    // Case 3: Check if phases are shifted by one in the other direction
    let shiftedByOneReverse = true;
    if (dp1Phases.length > 1 && dp2Phases.length > 0) {
        for (let i = 0; i < Math.min(dp1Phases.length - 1, dp2Phases.length); i++) {
            if (dp1Phases[i + 1].phase !== dp2Phases[i].phase) {
                shiftedByOneReverse = false;
                break;
            }
        }

        if (shiftedByOneReverse) {
            // This is a natural phase progression in reverse
            return {isStable: true, reason: "natural_phase_progression_reverse"};
        }
    }

    // If we get here, the phases don't match in any expected pattern
    return {isStable: false, reason: "pattern_mismatch"};
}

// Updated to store green change magnitudes
export const calculateSignalGroupSummary = (metrics) => {
    // Skip if no metrics
    if (!metrics || metrics.length === 0) {
        return {
            distanceRange: {min: 0, max: 0},
            speedRange: {min: 0, max: 0, avg: 0},
            glosaAdvice: {},
            clearanceTypes: {},
            greenIntervalChangesDetected: 0,
            // Add new fields for change types and magnitudes
            greenChangeTypes: {
                lostGreen: 0,
                gotGreen: 0
            },
            greenChangeMagnitudes: {
                earlierGreenStart: [],
                extendedGreenEnd: [],
                laterGreenStart: [],
                shortenedGreenEnd: []
            }
        };
    }

    // Track green change types
    const greenChangeTypes = {
        earlierGreenStart: 0, // Positive: Green starts earlier
        extendedGreenEnd: 0,  // Positive: Green ends later
        laterGreenStart: 0,   // Negative: Green starts later
        shortenedGreenEnd: 0  // Negative: Green ends earlier
    };

    // Track the magnitudes of changes for histogram
    const greenChangeMagnitudes = {
        earlierGreenStart: [],
        extendedGreenEnd: [],
        laterGreenStart: [],
        shortenedGreenEnd: []
    };

    // Calculate changes by type and collect magnitudes
    metrics.filter(m => m.greenIntervalChanged).forEach(m => {
        if (m.greenChangeType && greenChangeTypes[m.greenChangeType] !== undefined) {
            greenChangeTypes[m.greenChangeType]++;

            // Store the change magnitude if available
            if (m.greenChangeMagnitude !== undefined &&
                greenChangeMagnitudes[m.greenChangeType]) {
                greenChangeMagnitudes[m.greenChangeType].push(m.greenChangeMagnitude);
                console.log(`Added magnitude ${m.greenChangeMagnitude} to ${m.greenChangeType}`);
            } else {
                console.log(`No magnitude data for ${m.greenChangeType} change`);
            }
        }
    });

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
        // Add the green change types to the summary
        greenChangeTypes: greenChangeTypes,
        // Add the magnitudes of changes
        greenChangeMagnitudes: greenChangeMagnitudes
    };

    return summary;
};

// --- Updated processPassThrough with Enhanced Green Interval Change Detection and Magnitude Tracking ---
export const processPassThrough = (events, passIndex) => {
    const uuid = events[0]?.uuid || `pass-${passIndex}`;
    const firstTimestamp = events[0]?.dt ? new Date(events[0].dt) : new Date();

    const signalGroupsData = {};
    let foundAnySignalGroup = false;
    let significantGreenIntervalChangeOccurred = false; // Flag for the entire pass
    const previousSignalGroupGreenIntervals = {}; // Track previous { start, end, timestamp } per SG
    const previousSignalGroupMovementEvents = {};


    // New tracking for change types
    const greenChangeTypes = {
        earlierGreenStart: 0,
        extendedGreenEnd: 0,
        laterGreenStart: 0,
        shortenedGreenEnd: 0
    };

    // Track magnitudes of changes for histogram
    const greenChangeMagnitudes = {
        earlierGreenStart: [],
        extendedGreenEnd: [],
        laterGreenStart: [],
        shortenedGreenEnd: []
    };

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
                    // Add tracking for green change types per signal group
                    greenChangeTypes: {
                        earlierGreenStart: 0,
                        extendedGreenEnd: 0,
                        laterGreenStart: 0,
                        shortenedGreenEnd: 0
                    },
                    // Add tracking for green change magnitudes
                    greenChangeMagnitudes: {
                        earlierGreenStart: [],
                        extendedGreenEnd: [],
                        laterGreenStart: [],
                        shortenedGreenEnd: []
                    }
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
                // Initialize change flag and type for this specific metric
                greenIntervalChanged: false,
                greenChangeType: null,
                greenChangeMagnitude: null, // NEW: Add field to store the magnitude of change in seconds
                // Store the raw event for reference
                _rawEvent: event
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
                const bufferSeconds = 3.0; // Buffer to account for normal timing fluctuations
                // Threshold allows for time passage + buffer
                const threshold = Math.max(0, timeDiffSeconds) + bufferSeconds; // Ensure threshold is non-negative

                const prevStart = previousIntervalData.start;
                const prevEnd = previousIntervalData.end;

                let startChanged = false;
                let endChanged = false;
                let changeType = null; // Track the specific type of change
                let changeMagnitude = null; // NEW: Track the magnitude of change in seconds

                // Check start time change
                if (currentGreenStart === null && prevStart !== null) {
                    startChanged = true; // Green start disappeared
                    changeType = "shortenedGreenEnd"; // Consider this as shortening (more conservative)
                    // A null start is treated as a significant change
                    changeMagnitude = prevStart; // Magnitude is the previous start time
                    console.log(`Green start disappeared: Magnitude = ${changeMagnitude}`);
                } else if (currentGreenStart !== null && prevStart === null) {
                    startChanged = true; // Green start appeared
                    changeType = "earlierGreenStart"; // Consider this as earlier start
                    changeMagnitude = currentGreenStart; // Magnitude is the current start time
                    console.log(`Green start appeared: Magnitude = ${changeMagnitude}`);
                } else if (currentGreenStart !== null && prevStart !== null) {
                    const startDiff = Math.abs(currentGreenStart - prevStart);
                    if (startDiff > threshold) {
                        startChanged = true;
                        // If new start is earlier (smaller), it's a positive change
                        changeType = currentGreenStart < prevStart ? "earlierGreenStart" : "laterGreenStart";
                        // Store the absolute magnitude of the change in seconds
                        changeMagnitude = startDiff;
                        console.log(`Green start changed: ${changeType}, Magnitude = ${changeMagnitude}`);
                    }
                }

                // Check end time change - may override or complement the start change type
                if (currentGreenEnd === null && prevEnd !== null) {
                    endChanged = true; // Green end disappeared
                    // Only override if no start change was detected
                    if (!changeType) {
                        changeType = "shortenedGreenEnd";
                        changeMagnitude = prevEnd; // Magnitude is the previous end time
                        console.log(`Green end disappeared: Magnitude = ${changeMagnitude}`);
                    }
                } else if (currentGreenEnd !== null && prevEnd === null) {
                    endChanged = true; // Green end appeared
                    // Only override if no start change was detected
                    if (!changeType) {
                        changeType = "extendedGreenEnd";
                        changeMagnitude = currentGreenEnd; // Magnitude is the current end time
                        console.log(`Green end appeared: Magnitude = ${changeMagnitude}`);
                    }
                } else if (currentGreenEnd !== null && prevEnd !== null) {
                    const endDiff = Math.abs(currentGreenEnd - prevEnd);
                    if (endDiff > threshold) {
                        endChanged = true;
                        // If no start change was detected, set the change type based on end time
                        if (!changeType) {
                            // If new end is later (bigger), it's a positive change
                            changeType = currentGreenEnd > prevEnd ? "extendedGreenEnd" : "shortenedGreenEnd";
                            // Store the absolute magnitude of the change in seconds
                            changeMagnitude = endDiff;
                            console.log(`Green end changed: ${changeType}, Magnitude = ${changeMagnitude}`);
                        }
                        // If there was already a start change, we now have both start and end changing
                        // We don't override the existing type, as the start change takes precedence in our model
                    }
                }

                // In the place where green interval changes are detected:
                if (startChanged || endChanged) {
                    // Check if movement events show this is just a natural progression
                    const stabilityCheck = checkGreenIntervalStability(
                        previousSignalGroupMovementEvents[sgName],
                        metric.movementEvents
                    );

                    if (stabilityCheck.isStable) {
                        // Even though green interval appears to have changed,
                        // the movement event pattern shows this is stable
                        metric.greenIntervalChanged = false;
                        metric.greenChangeType = null;
                        metric.greenChangeMagnitude = null;
                        console.log(`Green interval change detected but stable: ${sgName} - ${stabilityCheck.reason}`);
                    } else {
                        // This is a genuine change
                        metric.greenIntervalChanged = true;
                        metric.greenChangeType = changeType;
                        metric.greenChangeMagnitude = changeMagnitude; // Store the magnitude
                        significantGreenIntervalChangeOccurred = true;

                        // Update counts with the new categorization
                        if (changeType && signalGroupsData[sgName].greenChangeTypes) {
                            signalGroupsData[sgName].greenChangeTypes[changeType]++;

                            // Store the magnitude for histogram
                            if (changeMagnitude !== null &&
                                signalGroupsData[sgName].greenChangeMagnitudes[changeType]) {
                                signalGroupsData[sgName].greenChangeMagnitudes[changeType].push(changeMagnitude);
                            }
                        }

                        if (changeType) {
                            greenChangeTypes[changeType]++;

                            // Store the magnitude in the global tracking
                            if (changeMagnitude !== null && greenChangeMagnitudes[changeType]) {
                                greenChangeMagnitudes[changeType].push(changeMagnitude);
                            }
                        }
                    }
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
                greenChangeType: null,
                greenChangeMagnitude: null,
                greenStartTime: null,
                greenEndTime: null,
                _rawEvent: sortedEvents[0]
            }],
            hasMovementEvents: false,
            allMovementEventsUnavailable: true,
            greenChangeTypes: {
                earlierGreenStart: 0,
                extendedGreenEnd: 0,
                laterGreenStart: 0,
                shortenedGreenEnd: 0
            },
            greenChangeMagnitudes: {
                earlierGreenStart: [],
                extendedGreenEnd: [],
                laterGreenStart: [],
                shortenedGreenEnd: []
            }
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

// NEW CODE: If no signal groups were predicted but there's only one with valid movement events,
// add it to the predictions
    if (predictedSignalGroupsUsed.length === 0) {
        // Find signal groups with valid movement events
        const validSGs = Object.values(signalGroupsData).filter(sg =>
            sg.hasMovementEvents && !sg.allMovementEventsUnavailable
        );

        // If there's only one valid signal group, use it regardless of light state
        if (validSGs.length === 1) {
            predictedSignalGroupsUsed.push({
                signalGroup: validSGs[0].name,
                reason: "Only valid signal group for passage (GPS timing may be off)"
            });

            // Update the intersection summary to note this special case
            console.log(`Pass-through ${passIndex}: Only one valid signal group (${validSGs[0].name}) - added to predictions despite no green phase`);
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

    for (const [type, values] of Object.entries(greenChangeMagnitudes)) {
        console.log(`Pass ${passIndex} has ${values.length} magnitude values for ${type}`);
    }

    // Update the summary object with new green change type information and magnitudes
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
        greenChangeTypes: greenChangeTypes, // Add the green change types
        greenChangeMagnitudes: greenChangeMagnitudes, // Add the magnitudes of changes
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
        summary // Contains the new green change type information and magnitudes
    };
};

export const calculateIntersectionSummary = (intersection) => {
    if (!intersection || !intersection.passThroughs || intersection.passThroughs.length === 0) {
        return {
            totalPassThroughs: 0,
            timeRange: {start: null, end: null},
            distancePatterns: [],
            speedPatterns: [],
            stopLocations: [],
            signalGroupAnalysis: {},
            predictionStatistics: {
                predictedSignalGroups: {},
                passThroughsWithPredictions: 0,
                passThroughsWithNoGreenWarning: 0,
                passThroughsWithGPSMismatch: 0
            },
            // Add green change types
            greenIntervalChanges: 0,
            greenChangeTypes: {
                earlierGreenStart: 0,
                extendedGreenEnd: 0,
                laterGreenStart: 0,
                shortenedGreenEnd: 0
            },
            // Add green change magnitudes for histograms
            greenChangeMagnitudes: {
                earlierGreenStart: [],
                extendedGreenEnd: [],
                laterGreenStart: [],
                shortenedGreenEnd: []
            }
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
        greenIntervalChanges: 0,
        // Add change types tracking
        greenChangeTypes: {
            earlierGreenStart: 0,
            extendedGreenEnd: 0,
            laterGreenStart: 0,
            shortenedGreenEnd: 0
        },
        // Add change magnitudes for histograms
        greenChangeMagnitudes: {
            earlierGreenStart: [],
            extendedGreenEnd: [],
            laterGreenStart: [],
            shortenedGreenEnd: []
        },
        // Add prediction statistics
        predictionStatistics: {
            predictedSignalGroups: {},
            passThroughsWithPredictions: 0,
            passThroughsWithNoGreenWarning: 0,
            passThroughsWithGPSMismatch: 0
        }
    };

    // Analyze patterns across all pass-throughs
    const allMetrics = [];
    const distanceBuckets = new Map(); // For identifying common stopping distances
    const speedsBySGAndDistance = new Map(); // Key: "signalGroup-distanceRange", Value: [speeds]
    const passThroughStops = new Map(); // Track stops per pass-through: Key: "passIndex-distanceBucket", Value: [{ signalGroups, timestamp }]

    passThroughs.forEach((passThrough, passIndex) => {
        // Count green interval changes and track change types and magnitudes
        if (passThrough.summary?.significantGreenIntervalChangeOccurred) {
            summary.greenIntervalChanges++;

            // Count by change type if available
            if (passThrough.summary?.greenChangeTypes) {
                summary.greenChangeTypes.earlierGreenStart += passThrough.summary.greenChangeTypes.earlierGreenStart || 0;
                summary.greenChangeTypes.extendedGreenEnd += passThrough.summary.greenChangeTypes.extendedGreenEnd || 0;
                summary.greenChangeTypes.laterGreenStart += passThrough.summary.greenChangeTypes.laterGreenStart || 0;
                summary.greenChangeTypes.shortenedGreenEnd += passThrough.summary.greenChangeTypes.shortenedGreenEnd || 0;
            }

            // Collect change magnitudes if available
            if (passThrough.summary?.greenChangeMagnitudes) {
                Object.entries(passThrough.summary.greenChangeMagnitudes).forEach(([changeType, magnitudes]) => {
                    if (Array.isArray(magnitudes) && magnitudes.length > 0) {
                        if (!summary.greenChangeMagnitudes[changeType]) {
                            summary.greenChangeMagnitudes[changeType] = [];
                        }
                        summary.greenChangeMagnitudes[changeType] =
                            summary.greenChangeMagnitudes[changeType].concat(magnitudes);
                        console.log(`Added ${magnitudes.length} magnitudes for ${changeType} to intersection summary`);
                    }
                });
            }
        }

        // Analyze predicted signal groups
        if (passThrough.summary?.predictedSignalGroupsUsed) {
            const predictions = passThrough.summary.predictedSignalGroupsUsed;
            if (predictions.length > 0) {
                summary.predictionStatistics.passThroughsWithPredictions++;

                predictions.forEach(prediction => {
                    const sgName = prediction.signalGroup;
                    if (!summary.predictionStatistics.predictedSignalGroups[sgName]) {
                        summary.predictionStatistics.predictedSignalGroups[sgName] = {
                            count: 0,
                            percentage: 0
                        };
                    }
                    summary.predictionStatistics.predictedSignalGroups[sgName].count++;
                });
            }
        }

        // Count warning types
        if (passThrough.summary?.hasNoPredictedGreensWithAvailableEvents) {
            summary.predictionStatistics.passThroughsWithNoGreenWarning++;
        }
        if (passThrough.summary?.possibleGPSMismatch) {
            summary.predictionStatistics.passThroughsWithGPSMismatch++;
        }

        Object.entries(passThrough.signalGroups || {}).forEach(([sgName, sgData]) => {
            if (!summary.signalGroupAnalysis[sgName]) {
                summary.signalGroupAnalysis[sgName] = {
                    totalOccurrences: 0,
                    glosaAdviceStats: {},
                    movementEventAvailability: {available: 0, unavailable: 0, none: 0},
                    distanceRange: {min: Infinity, max: -Infinity},
                    speedRange: {min: Infinity, max: -Infinity},
                    greenIntervalChanges: 0,
                    // Add change types for signal group
                    greenChangeTypes: {
                        lostGreen: 0,
                        gotGreen: 0
                    },
                    // Add change magnitudes for histograms
                    greenChangeMagnitudes: {
                        earlierGreenStart: [],
                        extendedGreenEnd: [],
                        laterGreenStart: [],
                        shortenedGreenEnd: []
                    }
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
                allMetrics.push({...metric, signalGroup: sgName});

                // Update distance range
                sgAnalysis.distanceRange.min = Math.min(sgAnalysis.distanceRange.min, metric.distance);
                sgAnalysis.distanceRange.max = Math.max(sgAnalysis.distanceRange.max, metric.distance);

                // Update speed range
                sgAnalysis.speedRange.min = Math.min(sgAnalysis.speedRange.min, metric.speed);
                sgAnalysis.speedRange.max = Math.max(sgAnalysis.speedRange.max, metric.speed);

                // Count green interval changes and track change types and magnitudes
                if (metric.greenIntervalChanged) {
                    sgAnalysis.greenIntervalChanges++;

                    // Track change type
                    if (metric.greenChangeType && sgAnalysis.greenChangeTypes[metric.greenChangeType] !== undefined) {
                        sgAnalysis.greenChangeTypes[metric.greenChangeType]++;
                    }

                    // Store the magnitude for histograms
                    if (metric.greenChangeMagnitude !== null &&
                        metric.greenChangeType &&
                        sgAnalysis.greenChangeMagnitudes[metric.greenChangeType]) {
                        sgAnalysis.greenChangeMagnitudes[metric.greenChangeType].push(metric.greenChangeMagnitude);
                    }
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

    // Calculate percentages for predicted signal groups
    Object.values(summary.predictionStatistics.predictedSignalGroups).forEach(stat => {
        stat.percentage = (stat.count / passThroughs.length * 100).toFixed(1);
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