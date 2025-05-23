// src/components/Tabs/PassDetailsTab.jsx
import React, { useState, useEffect } from 'react';
import SignalGroupOverview from "../SignalGroup/SignalGroupOverview.jsx";
import SignalGroupGLOSAAnalysis from "../SignalGroup/SignalGroupGLOSAAnalysis.jsx";
import VehiclePathMap from "../Map/VehiclePathMap.jsx";
import SavePassButton from "../SavedPasses/SavePassButton.jsx";

// Icon for stability status
const StabilityIcon = ({ stable, size = 16 }) => {
    const color = stable ? '#10b981' : '#f97316'; // Green for stable, Orange for changed
    const title = stable ? 'Green intervals remained stable' : 'Significant green interval change detected';

    return (
        <svg title={title} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: `${size}px`, height: `${size}px`, color: color, verticalAlign: 'middle', marginLeft: '8px' }}>
            {stable ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            ) : (
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
            )}
        </svg>
    );
};

// Collapsible Section Header Component
const CollapsibleHeader = ({ title, isExpanded, onToggle, ingress }) => (
    <div
        onClick={onToggle}
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: isExpanded ? '16px' : '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                {title}
            </h3>
            {ingress !== undefined && (
                <span style={{
                    backgroundColor: '#e5e7eb',
                    color: '#4b5563',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500'
                }}>
                    Ingress: {ingress}
                </span>
            )}
        </div>
        <div style={{ color: '#6b7280' }}>
            {isExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            )}
        </div>
    </div>
);

const PassDetailsTab = ({ passThrough, savedPasses = [], onSavePass, onUnsavePass }) => {
    // State to track which signal groups are expanded
    const [expandedGroups, setExpandedGroups] = useState({});

    // Check if this pass is saved
    const isSaved = savedPasses.some(saved => saved.passIndex === passThrough?.passIndex);

    if (!passThrough) {
        return (
            <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Pass-Through Details</h2>
                <p>No pass-through selected. Please select a pass-through from the list.</p>
            </div>
        );
    }

    const summary = passThrough.summary || {};
    const uuid = passThrough.uuid || 'N/A';
    const timestamp = passThrough.timestamp ? passThrough.timestamp.toLocaleString() : 'N/A';
    const eventCount = summary.eventCount ?? 'N/A';
    const startTime = summary.timeRange?.start;
    const endTime = summary.timeRange?.end;
    const duration = (startTime && endTime) ? ((endTime - startTime) / 1000).toFixed(1) : 'N/A';
    const signalGroupCount = Object.keys(passThrough.signalGroups || {}).length;
    const hasMovementEvents = summary.anySignalGroupHasMovementEvents ?? false;
    const movementEventsStatus = hasMovementEvents
        ? (summary.allMovementEventsUnavailable ? 'Present (Unavailable)' : 'Available')
        : 'None Found';
    const greenIntervalStable = !(summary.significantGreenIntervalChangeOccurred ?? false);
    const predictedSignalGroups = summary.predictedSignalGroupsUsed || [];
    const hasNoGreenWarning = summary.hasNoPredictedGreensWithAvailableEvents || false;
    const possibleGPSMismatch = summary.possibleGPSMismatch || false;
    const greenFoundInRecentEvents = summary.greenFoundInRecentEvents || {};

    // Extract ingress information from the first event if available
    const ingressById = {};
    if (passThrough.signalGroups) {
        Object.values(passThrough.signalGroups).forEach(signalGroup => {
            // Try to find ingress information in the metrics
            const firstEvent = signalGroup.metrics?.[0];
            if (firstEvent && firstEvent._rawEvent && firstEvent._rawEvent.intersectionPass?.intPassInfo?.ingress !== undefined) {
                ingressById[signalGroup.name] = firstEvent._rawEvent.intersectionPass.intPassInfo.ingress;
            }
        });
    }

    // Toggle expansion state for a signal group
    const toggleGroupExpansion = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    return (
        <div>
            {/* Pass-Through Summary */}
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '0' }}>Pass-Through Summary</h2>

                    {/* Save Pass Button */}
                    <SavePassButton
                        passThrough={passThrough}
                        isSaved={isSaved}
                        onSavePass={onSavePass}
                        onUnsavePass={onUnsavePass}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500' }}>UUID:</span> <span>{uuid}</span>
                    <span style={{ fontWeight: '500' }}>Timestamp:</span> <span>{timestamp}</span>
                    <span style={{ fontWeight: '500' }}>Total events:</span> <span>{eventCount}</span>
                    <span style={{ fontWeight: '500' }}>Duration:</span> <span>{duration} seconds</span>
                    <span style={{ fontWeight: '500' }}>Signal groups:</span> <span>{signalGroupCount}</span>
                    <span style={{ fontWeight: '500' }}>Movement events:</span> <span>{movementEventsStatus}</span>
                    <span style={{ fontWeight: '500' }}>Green Interval Stability:</span>
                    <span>
                        {greenIntervalStable ? 'Stable' : 'Changed'}
                        <StabilityIcon stable={greenIntervalStable} />
                    </span>
                </div>
            </div>

            {/* Vehicle Path Map Section */}
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Vehicle Path</h2>
                <VehiclePathMap passThrough={passThrough} />
                <div style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
                    <p>Map shows the vehicle's path toward the intersection. Green marker indicates the start point, red marker indicates the intersection.</p>
                </div>
            </div>

            {/* Warnings Section */}
            {/* GPS Mismatch Warning */}
            {possibleGPSMismatch && (
                <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '24px', height: '24px', color: '#f59e0b' }}>
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.515 2.625H3.72c-1.345 0-2.188-1.458-1.515-2.625l6.28-10.875ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <div style={{ fontWeight: '600', color: '#d97706', marginBottom: '4px' }}>
                            Possible GPS Positioning Issue
                        </div>
                        <div style={{ fontSize: '14px', color: '#92400e' }}>
                            Green phases were detected in previous events but not in the last event. This may indicate GPS positioning inaccuracy causing the system to think the vehicle is already within the intersection when it may not be.
                        </div>
                        <div style={{ fontSize: '14px', color: '#92400e', marginTop: '8px' }}>
                            <strong>Green phases found in recent events:</strong>
                            <ul style={{ marginTop: '4px', marginLeft: '20px' }}>
                                {Object.entries(greenFoundInRecentEvents).map(([sgName, data]) => (
                                    <li key={sgName}>
                                        {sgName}: in event(s) #{data.foundInEvents.join(', #')} from the end
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* No Green Warning - only show if not GPS mismatch */}
            {hasNoGreenWarning && !possibleGPSMismatch && (
                <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '24px', height: '24px', color: '#dc2626' }}>
                        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.515 2.625H3.72c-1.345 0-2.188-1.458-1.515-2.625l6.28-10.875ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
                            No Green Phase Detected
                        </div>
                        <div style={{ fontSize: '14px', color: '#991b1b' }}>
                            All signal groups have available movement events, but no signal group had a green phase (greenStartTime = 0) in any of the last 3 events. This may indicate the vehicle passed during a red phase.
                        </div>
                    </div>
                </div>
            )}

            {/* Predicted Signal Groups Used */}
            {predictedSignalGroups.length > 0 && (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Predicted Signal Groups Used for Passage</h2>
                    <p style={{ marginBottom: '12px', color: '#4b5563' }}>
                        Based on the last message of this pass-through, the following signal groups were likely used to pass the intersection:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                        {predictedSignalGroups.map((prediction, index) => (
                            <div key={index} style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontWeight: '600', color: '#15803d', marginBottom: '4px' }}>
                                    {prediction.signalGroup}
                                    {ingressById[prediction.signalGroup] !== undefined && (
                                        <span style={{
                                            marginLeft: '8px',
                                            backgroundColor: '#dcfce7',
                                            color: '#166534',
                                            padding: '1px 6px',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '500'
                                        }}>
                                            Ingress: {ingressById[prediction.signalGroup]}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '14px', color: '#166534' }}>
                                    {prediction.reason}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* No Green Prediction with additional context */}
            {predictedSignalGroups.length === 0 && hasNoGreenWarning && (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Predicted Signal Groups Used for Passage</h2>
                    <div style={{
                        backgroundColor: possibleGPSMismatch ? '#fff7ed' : '#fff7ed',
                        border: `1px solid ${possibleGPSMismatch ? '#ffedd5' : '#ffedd5'}`,
                        borderRadius: '8px',
                        padding: '16px'
                    }}>
                        <p style={{ color: '#9a3412', fontWeight: '500' }}>
                            No signal groups were predicted to be used for passage.
                        </p>
                        <p style={{ color: '#9a3412', fontSize: '14px', marginTop: '8px' }}>
                            {possibleGPSMismatch
                                ? 'The last event showed no current green phases, but green phases were found in previous events, suggesting possible GPS positioning issues.'
                                : 'Despite all signal groups having available movement events, none showed a current green phase (greenStartTime = 0) in the last 3 events.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Signal Group Analysis Section */}
            {passThrough.signalGroups && Object.keys(passThrough.signalGroups).length > 0 ? (
                <>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Signal Group Analysis</h2>
                    {Object.values(passThrough.signalGroups).map(signalGroup => {
                        const isExpanded = expandedGroups[signalGroup.name] !== false; // Default to expanded
                        const ingress = ingressById[signalGroup.name];

                        return (
                            <div key={signalGroup.name} style={{ marginBottom: '24px' }}>
                                <CollapsibleHeader
                                    title={`Signal Group: ${signalGroup.name}`}
                                    isExpanded={isExpanded}
                                    onToggle={() => toggleGroupExpansion(signalGroup.name)}
                                    ingress={ingress}
                                />

                                {isExpanded && (
                                    <>
                                        {/* Signal Group Overview */}
                                        <SignalGroupOverview signalGroup={signalGroup} />

                                        {/* GLOSA Analysis for the same signal group */}
                                        <SignalGroupGLOSAAnalysis signalGroup={signalGroup} />
                                    </>
                                )}
                            </div>
                        );
                    })}
                </>
            ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px' }}>
                    <p>No signal groups available for this pass-through.</p>
                </div>
            )}
        </div>
    );
};

export default PassDetailsTab;