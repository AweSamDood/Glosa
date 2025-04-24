import { useState, useEffect, useMemo } from 'react';

// Main Dashboard Component
const GLOSADashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPassIndex, setSelectedPassIndex] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Organized data structure
    const [intersections, setIntersections] = useState({});

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                // In a real app, this would be your API endpoint
                const response = await fetch('/data/TrafficLightStatus-VIENNATEST-1.json');
                const text = await response.text();
                const jsonData = JSON.parse(text);

                setData(jsonData);

                // Process and organize data by intersection
                processData(jsonData);
                setLoading(false);
            } catch (err) {
                console.error("Error loading data:", err);
                setError("Failed to load data. Check console for details.");
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const processData = (jsonData) => {
        const intersectionMap = {};

        jsonData.forEach((passData, passIndex) => {
            const events = passData.events;
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
            const processedPass = processPassThrough(events, passIndex);
            intersectionMap[intersectionId].passThroughs.push(processedPass);
        });

        setIntersections(intersectionMap);
    };

    const processPassThrough = (events, passIndex) => {
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
                        startTime: me.startTime ? new Date(me.startTime) : null,
                        minEndTime: me.minEndTime ? new Date(me.minEndTime) : null,
                        maxEndTime: me.maxEndTime ? new Date(me.maxEndTime) : null,
                        likelyTime: me.likelyTime ? new Date(me.likelyTime) : null,
                        nextTime: me.nextTime ? new Date(me.nextTime) : null,
                        timeConfidence: me.timeConfidence || null
                    })) : []
                };

                // Extract GLOSA data if available
                if (sg.glosa) {
                    metric.glosaAdvice = sg.glosa.advice || null;
                    metric.glosaSpeedKph = sg.glosa.speedKph || null;
                    metric.timeToGreen = sg.glosa.timeToGreen || null;

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
        if (!foundAnySignalGroup) {
            signalGroupsData['default'] = {
                name: 'No Signal Groups',
                metrics: [{
                    timestamp: timestamp,
                    distance: 0,
                    speed: 0,
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
                start: new Date(Math.min(...events.map(e => new Date(e.dt)))),
                end: new Date(Math.max(...events.map(e => new Date(e.dt))))
            },
            anySignalGroupHasMovementEvents: Object.values(signalGroupsData).some(sg => sg.hasMovementEvents),
            allMovementEventsUnavailable: Object.values(signalGroupsData).every(sg =>
                !sg.hasMovementEvents || sg.allMovementEventsUnavailable
            )
        };

        return {
            passIndex,
            uuid,
            timestamp,
            signalGroups: signalGroupsData,
            summary
        };
    };

    const calculateSignalGroupSummary = (metrics) => {
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

    const countOccurrences = (arr) => {
        const counts = {};
        arr.forEach(item => {
            counts[item] = (counts[item] || 0) + 1;
        });
        return counts;
    };

    const handleSelectPassThrough = (passIndex) => {
        setSelectedPassIndex(passIndex);
        // Reset the tab to overview when selecting a new pass-through
        setActiveTab('overview');
    };

    if (loading) {
        return <LoadingIndicator />;
    }

    if (error) {
        return <ErrorDisplay message={error} />;
    }

    if (!data || Object.keys(intersections).length === 0) {
        return <NoDataDisplay />;
    }

    // Find selected pass-through across all intersections
    let selectedPass = null;
    if (selectedPassIndex !== null) {
        Object.values(intersections).forEach(intersection => {
            const found = intersection.passThroughs.find(pass => pass.passIndex === selectedPassIndex);
            if (found) selectedPass = found;
        });
    }

    // Default to first pass-through if none selected
    if (!selectedPass && Object.keys(intersections).length > 0) {
        const firstIntersection = Object.values(intersections)[0];
        if (firstIntersection.passThroughs.length > 0) {
            selectedPass = firstIntersection.passThroughs[0];
            setSelectedPassIndex(selectedPass.passIndex);
        }
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>GLOSA Analysis Dashboard</h1>

            <div style={{ display: 'flex', gap: '24px' }}>
                {/* Left sidebar - Intersections and pass-throughs */}
                <div style={{ width: '30%', minWidth: '300px' }}>
                    <IntersectionList
                        intersections={intersections}
                        selectedPassIndex={selectedPassIndex}
                        onSelectPassThrough={handleSelectPassThrough}
                    />
                </div>

                {/* Main content area */}
                <div style={{ flex: 1 }}>
                    {selectedPass ? (
                        <>
                            {/* Tabs */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
                                <TabButton
                                    label="Overview"
                                    isActive={activeTab === 'overview'}
                                    onClick={() => setActiveTab('overview')}
                                />
                                <TabButton
                                    label="GLOSA Analysis"
                                    isActive={activeTab === 'glosa'}
                                    onClick={() => setActiveTab('glosa')}
                                />
                                <TabButton
                                    label="Data Table"
                                    isActive={activeTab === 'data'}
                                    onClick={() => setActiveTab('data')}
                                />
                            </div>

                            {/* Tab content */}
                            {activeTab === 'overview' && <OverviewTab passThrough={selectedPass} />}
                            {activeTab === 'glosa' && <GLOSAAnalysisTab passThrough={selectedPass} />}
                            {activeTab === 'data' && <DataTableTab passThrough={selectedPass} />}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '48px' }}>
                            <p>Select a pass-through from the list to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Intersection List Component
const IntersectionList = ({ intersections, selectedPassIndex, onSelectPassThrough }) => {
    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                Intersections
            </h2>

            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {Object.values(intersections).map(intersection => (
                    <IntersectionItem
                        key={intersection.id}
                        intersection={intersection}
                        selectedPassIndex={selectedPassIndex}
                        onSelectPassThrough={onSelectPassThrough}
                    />
                ))}
            </div>
        </div>
    );
};

// Intersection Item Component
const IntersectionItem = ({ intersection, selectedPassIndex, onSelectPassThrough }) => {
    const [expanded, setExpanded] = useState(true);

    const toggleExpanded = () => setExpanded(!expanded);

    return (
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            <div
                style={{
                    padding: '12px 16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f9fafb'
                }}
                onClick={toggleExpanded}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#4b5563' }}>
                        {expanded ? '▼' : '►'}
                    </span>
                    <span>{intersection.name}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {intersection.passThroughs.length} pass-throughs
                </div>
            </div>

            {expanded && (
                <PassThroughList
                    passThroughs={intersection.passThroughs}
                    selectedPassIndex={selectedPassIndex}
                    onSelectPassThrough={onSelectPassThrough}
                />
            )}
        </div>
    );
};

// Pass-Through List Component
const PassThroughList = ({ passThroughs, selectedPassIndex, onSelectPassThrough }) => {
    return (
        <div style={{ backgroundColor: 'white' }}>
            {passThroughs.map((passThrough, index) => (
                <PassThroughItem
                    key={passThrough.passIndex}
                    passThrough={passThrough}
                    isSelected={passThrough.passIndex === selectedPassIndex}
                    onSelect={() => onSelectPassThrough(passThrough.passIndex)}
                />
            ))}
        </div>
    );
};

// Pass-Through Item Component
const PassThroughItem = ({ passThrough, isSelected, onSelect }) => {
    const hasMovementEvents = passThrough.summary.anySignalGroupHasMovementEvents;
    const signalGroupCount = Object.keys(passThrough.signalGroups).length;
    const time = passThrough.timestamp.toLocaleTimeString();

    return (
        <div
            style={{
                padding: '12px 16px 12px 32px',
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer',
                backgroundColor: isSelected ? '#f0f9ff' : 'white',
                borderLeft: isSelected ? '4px solid #3b82f6' : '4px solid transparent',
            }}
            onClick={onSelect}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: isSelected ? '500' : 'normal' }}>
                        {time}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        UUID: {passThrough.uuid.substring(0, 8)}...
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {signalGroupCount} signal groups
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div title={
                            passThrough.summary.anySignalGroupHasMovementEvents
                                ? (Object.values(passThrough.signalGroups).every(sg => sg.allMovementEventsUnavailable)
                                    ? 'Has movement events but all unavailable'
                                    : 'Has available movement events')
                                : 'No movement events'
                        } style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: passThrough.summary.anySignalGroupHasMovementEvents
                                ? (Object.values(passThrough.signalGroups).every(sg => sg.allMovementEventsUnavailable || !sg.hasMovementEvents)
                                    ? '#9ca3af' // gray for all unavailable
                                    : '#10b981') // green for at least one available
                                : '#ef4444' // red for none
                        }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Overview Tab Component
const OverviewTab = ({ passThrough }) => {
    return (
        <div>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Pass-Through Summary</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p><span style={{ fontWeight: '500' }}>UUID:</span> {passThrough.uuid}</p>
                    <p><span style={{ fontWeight: '500' }}>Timestamp:</span> {passThrough.timestamp.toLocaleString()}</p>
                    <p><span style={{ fontWeight: '500' }}>Total events:</span> {passThrough.summary.eventCount}</p>
                    <p><span style={{ fontWeight: '500' }}>Duration:</span> {((passThrough.summary.timeRange.end - passThrough.summary.timeRange.start) / 1000).toFixed(1)} seconds</p>
                    <p><span style={{ fontWeight: '500' }}>Signal groups:</span> {Object.keys(passThrough.signalGroups || {}).length}</p>
                    <p><span style={{ fontWeight: '500' }}>Movement events:</span> {passThrough.summary.anySignalGroupHasMovementEvents ? 'Available' : 'Unavailable'}</p>
                </div>
            </div>

            {passThrough.signalGroups && Object.keys(passThrough.signalGroups).length > 0 ? (
                <>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Signal Group Analysis</h2>

                    {Object.values(passThrough.signalGroups).map(signalGroup => (
                        <SignalGroupOverview key={signalGroup.name} signalGroup={signalGroup} />
                    ))}
                </>
            ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px' }}>
                    <p>No signal groups available for this pass-through.</p>
                </div>
            )}
        </div>
    );
};

// Signal Group Overview Component
const SignalGroupOverview = ({ signalGroup }) => {
    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Signal Group: {signalGroup.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div title={
                        signalGroup.hasMovementEvents
                            ? (signalGroup.allMovementEventsUnavailable
                                ? 'Has movement events but all unavailable'
                                : 'Has available movement events')
                            : 'No movement events'
                    } style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: signalGroup.hasMovementEvents
                            ? (signalGroup.allMovementEventsUnavailable ? '#9ca3af' : '#10b981')
                            : '#ef4444'
                    }}></div>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {signalGroup.hasMovementEvents
                            ? (signalGroup.allMovementEventsUnavailable
                                ? 'Movement events (all unavailable)'
                                : 'Available movement events')
                            : 'No movement events'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Distance & Speed</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ fontSize: '14px' }}><span style={{ fontWeight: '500' }}>Distance:</span> {signalGroup.summary.distanceRange.min.toFixed(1)} - {signalGroup.summary.distanceRange.max.toFixed(1)} m</p>
                        <p style={{ fontSize: '14px' }}><span style={{ fontWeight: '500' }}>Speed:</span> {signalGroup.summary.speedRange.min.toFixed(1)} - {signalGroup.summary.speedRange.max.toFixed(1)} km/h</p>
                        <p style={{ fontSize: '14px' }}><span style={{ fontWeight: '500' }}>Avg Speed:</span> {signalGroup.summary.speedRange.avg.toFixed(1)} km/h</p>
                    </div>
                </div>

                <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>GLOSA Advice</h4>
                    {Object.keys(signalGroup.summary.glosaAdvice).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {Object.entries(signalGroup.summary.glosaAdvice)
                                .sort((a, b) => b[1] - a[1])
                                .map(([advice, count], i) => (
                                    <p key={i} style={{ fontSize: '14px' }}>
                                        <span style={{ fontWeight: i === 0 ? '500' : 'normal' }}>{advice}:</span> {count} times
                                    </p>
                                ))
                            }
                        </div>
                    ) : (
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>No GLOSA advice data</p>
                    )}
                </div>

                <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Clearance Types</h4>
                    {Object.keys(signalGroup.summary.clearanceTypes).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {Object.entries(signalGroup.summary.clearanceTypes)
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count], i) => (
                                    <p key={i} style={{ fontSize: '14px' }}>
                                        <span style={{ fontWeight: i === 0 ? '500' : 'normal' }}>{type}:</span> {count} times
                                    </p>
                                ))
                            }
                        </div>
                    ) : (
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>No clearance type data</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// GLOSA Analysis Tab Component
const GLOSAAnalysisTab = ({ passThrough }) => {
    // Safety check - if no signal groups are found
    if (!passThrough.signalGroups || Object.keys(passThrough.signalGroups).length === 0) {
        return (
            <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>GLOSA Analysis</h2>
                <p>No signal groups available for analysis in this pass-through.</p>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>GLOSA Analysis by Signal Group</h2>

            {Object.values(passThrough.signalGroups).map(signalGroup => (
                <SignalGroupGLOSAAnalysis key={signalGroup.name} signalGroup={signalGroup} />
            ))}
        </div>
    );
};

// Signal Group GLOSA Analysis Component
const SignalGroupGLOSAAnalysis = ({ signalGroup }) => {
    const metrics = signalGroup.metrics;

    // Calculate ranges for GLOSA parameters
    const timeToGreenRange = metrics.filter(m => m.timeToGreen !== null).map(m => m.timeToGreen);
    const minTravelTimeRange = metrics.filter(m => m.minTravelTime !== null).map(m => m.minTravelTime);
    const maxTravelTimeRange = metrics.filter(m => m.maxTravelTime !== null).map(m => m.maxTravelTime);
    const distanceToStopRange = metrics.filter(m => m.distanceToStop !== null).map(m => m.distanceToStop);
    const secondsToGreenRange = metrics.filter(m => m.secondsToGreen !== null).map(m => m.secondsToGreen);
    const clearanceTimeRange = metrics.filter(m => m.clearanceTime !== null).map(m => m.clearanceTime);

    // Get the primary GLOSA advice
    const primaryAdvice = Object.entries(signalGroup.summary.glosaAdvice)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Signal Group: {signalGroup.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: signalGroup.hasMovementEvents ? '#10b981' : '#ef4444'
                    }}></div>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {signalGroup.hasMovementEvents ? 'Has movement events' : 'No movement events'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>GLOSA Parameters</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p><span style={{ fontWeight: '500' }}>Primary Advice:</span> {primaryAdvice}</p>

                        {timeToGreenRange.length > 0 && (
                            <p><span style={{ fontWeight: '500' }}>Time to Green Range:</span> {Math.min(...timeToGreenRange)} - {Math.max(...timeToGreenRange)} seconds</p>
                        )}

                        {secondsToGreenRange.length > 0 && (
                            <p><span style={{ fontWeight: '500' }}>Seconds to Green Range:</span> {Math.min(...secondsToGreenRange)} - {Math.max(...secondsToGreenRange)} seconds</p>
                        )}
                    </div>
                </div>

                <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>Travel Time Parameters</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {minTravelTimeRange.length > 0 && (
                            <p><span style={{ fontWeight: '500' }}>Min Travel Time Range:</span> {Math.min(...minTravelTimeRange)} - {Math.max(...minTravelTimeRange)} seconds</p>
                        )}

                        {maxTravelTimeRange.length > 0 && (
                            <p><span style={{ fontWeight: '500' }}>Max Travel Time Range:</span> {Math.min(...maxTravelTimeRange)} - {Math.max(...maxTravelTimeRange)} seconds</p>
                        )}

                        {distanceToStopRange.length > 0 && (
                            <p><span style={{ fontWeight: '500' }}>Distance to Stop Range:</span> {Math.min(...distanceToStopRange).toFixed(1)} - {Math.max(...distanceToStopRange).toFixed(1)} meters</p>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>GLOSA Advice Analysis</h4>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <p style={{ marginBottom: '12px' }}>Based on the internal parameters, the GLOSA system determined advice for this signal group:</p>
                    <ul style={{ listStyleType: 'disc', marginLeft: '24px', marginTop: '8px' }}>
                        {primaryAdvice.includes('none_movement_event_unavailable') && (
                            <li>Movement events were not available from the traffic light controller.</li>
                        )}
                        {primaryAdvice.includes('none_ttg_unavailable') && (
                            <li>Time-to-green information was not available from the traffic light controller.</li>
                        )}
                        {primaryAdvice.includes('none_green_duration_unavailable') && (
                            <li>Green phase duration information was not available from the traffic light controller.</li>
                        )}
                        {primaryAdvice.includes('none_advice_speed_out_of_range') && (
                            <li>The calculated advisory speed was outside of allowed speed limits.</li>
                        )}
                        {primaryAdvice.includes('accelerate') && (
                            <li>The vehicle needed to increase speed to efficiently catch the green light.</li>
                        )}
                        {primaryAdvice.includes('decelerate') && (
                            <li>The vehicle needed to reduce speed to avoid arriving at a red light.</li>
                        )}
                        {primaryAdvice.includes('cruise') && (
                            <li>The vehicle's current speed was optimal for catching the green light.</li>
                        )}
                        {primaryAdvice.includes('cannotCatchGreen') && (
                            <li>Even at maximum allowed speed, the vehicle could not reach the intersection during the green phase.</li>
                        )}
                        {primaryAdvice.includes('willArriveTooEarly') && (
                            <li>Even at minimum allowed speed, the vehicle would arrive before the green phase begins.</li>
                        )}
                        {primaryAdvice === 'N/A' && (
                            <li>No GLOSA advice was calculated for this signal group.</li>
                        )}
                    </ul>

                    {clearanceTimeRange.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            <p style={{ marginBottom: '8px' }}><span style={{ fontWeight: '500' }}>Clearance Time Analysis:</span></p>
                            <p>Range: {Math.min(...clearanceTimeRange)} - {Math.max(...clearanceTimeRange)} seconds</p>
                            <p>Primary method: {Object.entries(signalGroup.summary.clearanceTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Data Table Tab Component
const DataTableTab = ({ passThrough }) => {
    const [selectedSignalGroup, setSelectedSignalGroup] = useState(null);

    // Check if there are any signal groups
    const signalGroupNames = passThrough.signalGroups ? Object.keys(passThrough.signalGroups) : [];
    const hasSignalGroups = signalGroupNames.length > 0;

    // Set selected signal group if none selected and there are groups available
    useEffect(() => {
        if (!selectedSignalGroup && signalGroupNames.length > 0) {
            setSelectedSignalGroup(signalGroupNames[0]);
        }
    }, [signalGroupNames]);

    // Get metrics for selected signal group with safety checks
    const metrics = (selectedSignalGroup &&
        passThrough.signalGroups &&
        passThrough.signalGroups[selectedSignalGroup] &&
        passThrough.signalGroups[selectedSignalGroup].metrics)
        ? passThrough.signalGroups[selectedSignalGroup].metrics
        : [];

    // If there are no signal groups
    if (!hasSignalGroups) {
        return (
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Data Table</h3>
                <p>No signal groups available for this pass-through.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Select Signal Group</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {signalGroupNames.map(name => (
                        <button
                            key={name}
                            onClick={() => setSelectedSignalGroup(name)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: selectedSignalGroup === name ? '#3b82f6' : '#e5e7eb',
                                color: selectedSignalGroup === name ? 'white' : '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: selectedSignalGroup === name ? '500' : 'normal'
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {selectedSignalGroup && (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                        Data for Signal Group: {selectedSignalGroup}
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        {metrics.length > 0 ? (
                            <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: '#f9fafb' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Time</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Distance (m)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Speed (km/h)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>GLOSA Advice</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>GLOSA Speed (km/h)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Min/Max Travel Time</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Green Interval</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Movement Events</th>
                                </tr>
                                </thead>
                                <tbody>
                                {metrics.map((metric, i) => (
                                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{metric.timestamp.toLocaleTimeString()}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{metric.distance.toFixed(1)}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{metric.speed.toFixed(1)}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            <div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={metric.glosaAdvice}>
                                                {metric.glosaAdvice || 'N/A'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            {metric.glosaSpeedKph !== null ? metric.glosaSpeedKph : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            {metric.minTravelTime !== null && metric.maxTravelTime !== null
                                                ? `${metric.minTravelTime}/${metric.maxTravelTime}s`
                                                : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            {metric.greenStartTime !== null || metric.greenEndTime !== null
                                                ? `${metric.greenStartTime || 0}s - ${metric.greenEndTime || 0}s`
                                                : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            {metric.movementEvents && metric.movementEvents.length > 0 ? (
                                                <div style={{ fontSize: '13px' }}>
                                                    {metric.movementEvents.map((me, idx) => (
                                                        <div key={idx} style={{ marginBottom: idx < metric.movementEvents.length - 1 ? '8px' : '0', padding: '4px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                                                            <div style={{ fontWeight: '500', color: me.state === 'protectedMovementAllowed' ? '#10b981' : me.state === 'stopAndRemain' ? '#ef4444' : '#374151' }}>
                                                                {me.state}
                                                            </div>
                                                            {me.startTime && (
                                                                <div>Start: {me.startTime.toLocaleTimeString()}</div>
                                                            )}
                                                            {me.minEndTime && (
                                                                <div>Min end: {me.minEndTime.toLocaleTimeString()}</div>
                                                            )}
                                                            {me.maxEndTime && (
                                                                <div>Max end: {me.maxEndTime.toLocaleTimeString()}</div>
                                                            )}
                                                            {me.likelyTime && (
                                                                <div>Likely: {me.likelyTime.toLocaleTimeString()}</div>
                                                            )}
                                                            {me.nextTime && (
                                                                <div>Next: {me.nextTime.toLocaleTimeString()}</div>
                                                            )}
                                                            {me.timeConfidence !== null && (
                                                                <div>Confidence: {me.timeConfidence}%</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : 'None'}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                <p>No metrics available for this signal group.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Utility Components
const LoadingIndicator = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
            <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 2s linear infinite', margin: '0 auto' }}></div>
            <p style={{ marginTop: '16px', fontSize: '18px' }}>Loading GLOSA data...</p>
        </div>
    </div>
);

const ErrorDisplay = ({ message }) => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '16px' }}>
            <p style={{ fontWeight: 'bold' }}>Error</p>
            <p>{message}</p>
        </div>
    </div>
);

const NoDataDisplay = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '18px' }}>No data available</p>
        </div>
    </div>
);

const TabButton = ({ label, isActive, onClick }) => (
    <button
        style={{
            padding: '16px',
            marginRight: '8px',
            fontWeight: '500',
            borderBottom: isActive ? '2px solid #3b82f6' : 'none',
            color: isActive ? '#3b82f6' : '#6b7280',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
        }}
        onClick={onClick}
    >
        {label}
    </button>
);

export default GLOSADashboard;