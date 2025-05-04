// src/components/Tabs/OverviewTab.jsx
import React from 'react';
import SignalGroupOverview from "../SignalGroup/SignalGroupOverview.jsx"; // Ensure path is correct

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

const OverviewTab = ({ passThrough }) => {
    // Safely access summary data with defaults
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
    // Get the green interval change status
    const greenIntervalStable = !(summary.significantGreenIntervalChangeOccurred ?? false);


    return (
        <div>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Pass-Through Summary</h2>
                {/* Use a grid or flexbox for better alignment */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500' }}>UUID:</span> <span>{uuid}</span>
                    <span style={{ fontWeight: '500' }}>Timestamp:</span> <span>{timestamp}</span>
                    <span style={{ fontWeight: '500' }}>Total events:</span> <span>{eventCount}</span>
                    <span style={{ fontWeight: '500' }}>Duration:</span> <span>{duration} seconds</span>
                    <span style={{ fontWeight: '500' }}>Signal groups:</span> <span>{signalGroupCount}</span>
                    <span style={{ fontWeight: '500' }}>Movement events:</span> <span>{movementEventsStatus}</span>
                    {/* New line for Green Interval Stability */}
                    <span style={{ fontWeight: '500' }}>Green Interval Stability:</span>
                    <span>
                        {greenIntervalStable ? 'Stable' : 'Changed'}
                        <StabilityIcon stable={greenIntervalStable} />
                    </span>
                </div>
            </div>

            {passThrough.signalGroups && Object.keys(passThrough.signalGroups).length > 0 ? (
                <>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Signal Group Analysis</h2>
                    {/* Render SignalGroupOverview for each signal group */}
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