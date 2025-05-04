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
            clearanceTypes: {}
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
        clearanceTypes: countOccurrences(metrics.filter(m => m.clearanceCalType).map(m => m.clearanceCalType))
    };

    return summary;
};

export const processPassThrough = (events, passIndex) => {
    // Extract basic info from the pass-through
    const uuid = events[0]?.uuid || `pass-${passIndex}`;
    const timestamp = new Date(events[0]?.dt);

    // Extract all signal groups data across all events
    const signalGroupsData = {};

    // Ensure we have at least one empty signal group if none found
    let foundAnySignalGroup = false;

    events.forEach(event => {
        if (!event.trafficLightsStatus?.signalGroup) return;

        event.trafficLightsStatus.signalGroup.forEach(sg => {
            const sgName = sg.name;
            if (!sgName) return;

            foundAnySignalGroup = true;

            // Initialize signal group if not exists
            if (!signalGroupsData[sgName]) {
                signalGroupsData[sgName] = {
                    name: sgName,
                    metrics: [],
                    hasMovementEvents: false,
                    allMovementEventsUnavailable: true
                };
            }

            // Check if this signal group has movement events
            if (sg.movementEvent && sg.movementEvent.length > 0) {
                signalGroupsData[sgName].hasMovementEvents = true;

                // Check if at least one movement event is not "unavailable"
                const hasAvailableMovementEvent = sg.movementEvent.some(
                    me => me.state && me.state !== "unavailable"
                );

                if (hasAvailableMovementEvent) {
                    signalGroupsData[sgName].allMovementEventsUnavailable = false;
                }
            }

            // Create metric for this event and signal group
            const metric = {
                timestamp: new Date(event.dt),
                distance: event.intersectionPass?.intPassInfo?.distance || 0,
                speed: event.posData?.sp?.value * 3.6 || 0, // Convert m/s to km/h
                lat: event.posData?.geoPos?.lat || 0,
                lng: event.posData?.geoPos?.lng || 0,
                heading: event.posData?.head?.value || 0,
                movementEventsAvailable: sg.movementEvent && sg.movementEvent.length > 0,
                // Store movement events for display
                movementEvents: sg.movementEvent ? sg.movementEvent.map(me => ({
                    state: me.state || 'unknown',
                    startTime: me.startTime && me.startTime !== "1970-01-01T00:00:00Z" ? new Date(me.startTime) : null,
                    minEndTime: me.minEndTime ? new Date(me.minEndTime) : null,
                    maxEndTime: me.maxEndTime ? new Date(me.maxEndTime) : null,
                    likelyTime: me.likelyTime ? new Date(me.likelyTime) : null,
                    nextTime: me.nextTime && me.nextTime !== "1970-01-01T00:00:00Z" ? new Date(me.nextTime) : null,
                    timeConfidence: me.timeConfidence || null
                })) : []
            };

            // Extract GLOSA data if available
            if (sg.glosa) {
                metric.glosaAdvice = sg.glosa.advice || null;
                metric.glosaSpeedKph = sg.glosa.speedKph !== null ? sg.glosa.speedKph : null; // Keep 0 if it's 0
                metric.timeToGreen = sg.glosa.timeToGreen !== null ? sg.glosa.timeToGreen : null;

                if (sg.glosa.internalInfo) {
                    const info = sg.glosa.internalInfo;
                    metric.distanceToStop = info.distanceToStop || null;
                    metric.minTravelTime = info.minimalTravelTime || null;
                    metric.maxTravelTime = info.maximalTravelTime || null;
                    metric.secondsToGreen = info.secondsToGreenStart || null;
                    metric.clearanceTime = info.clearanceTime || null;
                    metric.clearanceCalType = info.clearanceCalType || null;
                    metric.greenStartTime = info.greenStartTime || null;
                    metric.greenEndTime = info.greenEndTime || null;
                }
            }

            signalGroupsData[sgName].metrics.push(metric);
        });
    });

    // If no signal groups were found, create a default one
    if (!foundAnySignalGroup && events.length > 0) {
        signalGroupsData['default'] = {
            name: 'No Signal Groups',
            metrics: [{
                timestamp: timestamp,
                distance: events[0].intersectionPass?.intPassInfo?.distance || 0,
                speed: events[0].posData?.sp?.value * 3.6 || 0, // Convert m/s to km/h
                movementEventsAvailable: false,
                glosaAdvice: 'none',
                movementEvents: [] // Empty movement events
            }],
            hasMovementEvents: false,
            allMovementEventsUnavailable: true
        };
    }

    // Calculate summary statistics for each signal group
    Object.values(signalGroupsData).forEach(sg => {
        sg.summary = calculateSignalGroupSummary(sg.metrics);
    });

    // Calculate summary statistics for this pass
    const summary = {
        eventCount: events.length,
        timeRange: {
            start: events.length > 0 ? new Date(Math.min(...events.map(e => new Date(e.dt)))) : new Date(),
            end: events.length > 0 ? new Date(Math.max(...events.map(e => new Date(e.dt)))) : new Date()
        },
        anySignalGroupHasMovementEvents: Object.values(signalGroupsData).some(sg => sg.hasMovementEvents),
        allMovementEventsUnavailable: Object.values(signalGroupsData).every(sg =>
            !sg.hasMovementEvents || sg.allMovementEventsUnavailable
        )
    };

    // Ensure signalGroups is always an object, even if empty
    const finalSignalGroups = Object.keys(signalGroupsData).length > 0 ? signalGroupsData : {};

    return {
        passIndex,
        uuid,
        timestamp,
        signalGroups: finalSignalGroups,
        summary
    };
};

export const processRawData = (jsonData) => {
    const intersectionMap = {};

    // Adapt based on whether jsonData is an array of passes or the structure from one.json
    const passes = Array.isArray(jsonData) ? jsonData : [jsonData]; // Handle both array and single object

    passes.forEach((passData, passIndex) => {
        // Check if passData itself has the 'events' structure or if it *is* the event structure
        const events = passData.events || []; // Adjust if the structure varies
        if (!events || events.length === 0) return;

        // Get the first event to extract intersection info
        const firstEvent = events[0];
        const intersectionInfo = firstEvent.intersectionPass?.intersection;

        if (!intersectionInfo || !intersectionInfo.name) return;

        const intersectionName = intersectionInfo.name;
        const intersectionId = `${intersectionInfo.operatorId}-${intersectionInfo.intId}`;

        // Initialize intersection if not exists
        if (!intersectionMap[intersectionId]) {
            intersectionMap[intersectionId] = {
                id: intersectionId,
                name: intersectionName,
                operatorId: intersectionInfo.operatorId,
                intId: intersectionInfo.intId,
                passThroughs: []
            };
        }

        // Process the pass-through
        const processedPass = processPassThrough(events, passIndex); // Pass the actual index
        intersectionMap[intersectionId].passThroughs.push(processedPass);
    });

    return intersectionMap;
};