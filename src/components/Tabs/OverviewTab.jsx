// src/components/Tabs/OverviewTab.jsx
import React from 'react';
import SignalGroupOverview from "../SignalGroup/SignalGroupOverview.jsx";

// Icon for stability status - updated to handle specific change types
const StabilityIcon = ({ status, size = 16 }) => {
    let color, title, path;

    switch(status) {
        case 'stable':
            color = '#10b981'; // Green for stable
            title = 'Green intervals remained stable';
            path = <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />;
            break;
        case 'lostGreen':
            color = '#ef4444'; // Red for lost green
            title = 'Green intervals were reduced or disappeared';
            path = <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />;
            break;
        case 'gotGreen':
            color = '#22c55e'; // Brighter green for got green
            title = 'Green intervals were extended or appeared';
            path = <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />;
            break;
        case 'changed':
        default:
            color = '#f97316'; // Orange for mixed or unspecified changes
            title = 'Significant green interval changes detected';
            path = <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />;
    }

    return (
        <svg title={title} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: `${size}px`, height: `${size}px`, color: color, verticalAlign: 'middle', marginLeft: '8px' }}>
            {path}
        </svg>
    );
};

// New component to display signal group change details
const SignalGroupChangeDetails = ({ signalGroups }) => {
    // Group signal groups by change type
    const changes = {
        lostGreen: [],
        gotGreen: [],
        mixed: [],
        stable: []
    };

    Object.entries(signalGroups).forEach(([name, sg]) => {
        const gotCount = sg.greenChangeTypes?.gotGreen || 0;
        const lostCount = sg.greenChangeTypes?.lostGreen || 0;

        if (gotCount > 0 && lostCount === 0) {
            changes.gotGreen.push({ name, count: gotCount });
        } else if (lostCount > 0 && gotCount === 0) {
            changes.lostGreen.push({ name, count: lostCount });
        } else if (gotCount > 0 && lostCount > 0) {
            changes.mixed.push({ name, gotCount, lostCount });
        } else if (sg.metrics?.some(m => m.greenIntervalChanged)) {
            // If there are changes but not categorized
            changes.mixed.push({ name, gotCount: 0, lostCount: 0 });
        } else {
            changes.stable.push({ name });
        }
    });

    // Return if no changes detected
    const hasNoChanges =
        changes.lostGreen.length === 0 &&
        changes.gotGreen.length === 0 &&
        changes.mixed.length === 0;

    if (hasNoChanges) {
        return (
            <div style={{ fontSize: '14px', color: '#10b981', display: 'flex', alignItems: 'center', marginTop: '12px' }}>
                <StabilityIcon status="stable" />
                <span style={{ marginLeft: '8px' }}>All signal groups remained stable with no green interval changes.</span>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>Signal Group Change Details</h4>

            {changes.lostGreen.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                        <StabilityIcon status="lostGreen" size={14} />
                        <span style={{ marginLeft: '8px' }}>Lost Green Time:</span>
                    </div>
                    <ul style={{ marginLeft: '28px', marginTop: '4px' }}>
                        {changes.lostGreen.map(sg => (
                            <li key={sg.name} style={{ fontSize: '14px', marginBottom: '4px' }}>
                                <strong>{sg.name}</strong>: Lost green {sg.count} {sg.count === 1 ? 'time' : 'times'}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {changes.gotGreen.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#22c55e', display: 'flex', alignItems: 'center' }}>
                        <StabilityIcon status="gotGreen" size={14} />
                        <span style={{ marginLeft: '8px' }}>Got Green Time:</span>
                    </div>
                    <ul style={{ marginLeft: '28px', marginTop: '4px' }}>
                        {changes.gotGreen.map(sg => (
                            <li key={sg.name} style={{ fontSize: '14px', marginBottom: '4px' }}>
                                <strong>{sg.name}</strong>: Got green {sg.count} {sg.count === 1 ? 'time' : 'times'}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {changes.mixed.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#f97316', display: 'flex', alignItems: 'center' }}>
                        <StabilityIcon status="changed" size={14} />
                        <span style={{ marginLeft: '8px' }}>Mixed Changes:</span>
                    </div>
                    <ul style={{ marginLeft: '28px', marginTop: '4px' }}>
                        {changes.mixed.map(sg => (
                            <li key={sg.name} style={{ fontSize: '14px', marginBottom: '4px' }}>
                                <strong>{sg.name}</strong>:
                                {sg.gotCount > 0 && sg.lostCount > 0 ?
                                    ` Got green ${sg.gotCount} ${sg.gotCount === 1 ? 'time' : 'times'}, lost green ${sg.lostCount} ${sg.lostCount === 1 ? 'time' : 'times'}` :
                                    ' Had mixed or unspecified changes'
                                }
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {changes.stable.length > 0 && (
                <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#10b981', display: 'flex', alignItems: 'center' }}>
                        <StabilityIcon status="stable" size={14} />
                        <span style={{ marginLeft: '8px' }}>Stable:</span>
                    </div>
                    <ul style={{ marginLeft: '28px', marginTop: '4px' }}>
                        {changes.stable.map(sg => (
                            <li key={sg.name} style={{ fontSize: '14px', marginBottom: '4px' }}>
                                <strong>{sg.name}</strong>: No green interval changes
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const OverviewTab = ({ passThrough }) => {
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

    // Update green interval stability logic to use change types
    const greenIntervalChanged = summary.significantGreenIntervalChangeOccurred ?? false;
    const greenChangeTypes = summary.greenChangeTypes || { lostGreen: 0, gotGreen: 0 };

    // Determine stability status based on change types
    let stabilityStatus = 'stable';
    let stabilityText = 'Stable';

    if (greenIntervalChanged) {
        const lostCount = greenChangeTypes.lostGreen || 0;
        const gotCount = greenChangeTypes.gotGreen || 0;

        if (lostCount > 0 && gotCount === 0) {
            stabilityStatus = 'lostGreen';
            stabilityText = `Lost Green (${lostCount} times)`;
        } else if (gotCount > 0 && lostCount === 0) {
            stabilityStatus = 'gotGreen';
            stabilityText = `Got Green (${gotCount} times)`;
        } else if (lostCount > 0 && gotCount > 0) {
            stabilityStatus = 'changed';
            stabilityText = `Mixed Changes (${lostCount} lost, ${gotCount} got)`;
        } else {
            stabilityStatus = 'changed';
            stabilityText = 'Changed';
        }
    }

    const predictedSignalGroups = summary.predictedSignalGroupsUsed || [];
    const hasNoGreenWarning = summary.hasNoPredictedGreensWithAvailableEvents || false;
    const possibleGPSMismatch = summary.possibleGPSMismatch || false;
    const greenFoundInRecentEvents = summary.greenFoundInRecentEvents || {};

    return (
        <div>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Pass-Through Summary</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500' }}>UUID:</span> <span>{uuid}</span>
                    <span style={{ fontWeight: '500' }}>Timestamp:</span> <span>{timestamp}</span>
                    <span style={{ fontWeight: '500' }}>Total events:</span> <span>{eventCount}</span>
                    <span style={{ fontWeight: '500' }}>Duration:</span> <span>{duration} seconds</span>
                    <span style={{ fontWeight: '500' }}>Signal groups:</span> <span>{signalGroupCount}</span>
                    <span style={{ fontWeight: '500' }}>Movement events:</span> <span>{movementEventsStatus}</span>
                    <span style={{ fontWeight: '500' }}>Green Interval Stability:</span>
                    <span>
                        {stabilityText}
                        <StabilityIcon status={stabilityStatus} />
                    </span>
                </div>

                {/* New section: Signal Group Change Details */}
                {greenIntervalChanged && passThrough.signalGroups && (
                    <SignalGroupChangeDetails signalGroups={passThrough.signalGroups} />
                )}
            </div>

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

export default OverviewTab;