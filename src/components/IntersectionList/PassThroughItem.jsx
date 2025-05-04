// src/components/IntersectionList/PassThroughItem.jsx
import React from 'react';

// Reusable Icon Component (or use your preferred icon library)
const ChangeIndicatorIcon = ({ title }) => (
    <svg title={title} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style={{ width: '12px', height: '12px', color: '#f97316' /* Orange */ }}>
        <path fillRule="evenodd" d="M8 2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M7.053 6.053a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0Zm2.947 7.053a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06l1.5 1.5a.75.75 0 0 1 0 1.06Zm2.947-1.06a.75.75 0 1 0-1.06-1.06l-1.5 1.5a.75.75 0 1 0 1.06 1.06l1.5-1.5ZM13 8a.75.75 0 0 1-.75-.75V4.75a.75.75 0 0 1 1.5 0v2.5A.75.75 0 0 1 13 8Z" clipRule="evenodd" />
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z" />
    </svg>
);


const PassThroughItem = ({ passThrough, isSelected, onSelect }) => {
    // Default values for safety
    const summary = passThrough.summary || {
        anySignalGroupHasMovementEvents: false,
        allMovementEventsUnavailable: true,
        significantGreenIntervalChangeOccurred: false // Default for new flag
    };
    const signalGroups = passThrough.signalGroups || {};
    const timestamp = passThrough.timestamp || new Date();
    const uuid = passThrough.uuid || 'unknown-uuid';

    const hasMovementEvents = summary.anySignalGroupHasMovementEvents;
    // Use the specific flag for green interval changes
    const greenIntervalChanged = summary.significantGreenIntervalChangeOccurred;
    const signalGroupCount = Object.keys(signalGroups).length;
    const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); // Format time

    // Determine status indicator properties
    const getStatusIndicatorProps = () => {
        if (!hasMovementEvents) {
            return { title: 'No movement events found', color: '#ef4444' }; // red
        }
        if (summary.allMovementEventsUnavailable) {
            return { title: 'Movement events present but all unavailable', color: '#9ca3af' }; // gray
        }
        // Has available movement events
        return { title: 'Has available movement events', color: '#10b981' }; // green
    };

    const indicatorProps = getStatusIndicatorProps();

    return (
        <div
            style={{
                padding: '12px 16px 12px 32px', // Indented
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer',
                backgroundColor: isSelected ? '#eff6ff' : 'white', // Lighter blue for selection
                borderLeft: isSelected ? '4px solid #3b82f6' : '4px solid transparent',
                transition: 'background-color 0.2s ease, border-left 0.2s ease',
                display: 'flex', // Use flex for the main container
                justifyContent: 'space-between',
                alignItems: 'center'
            }}
            onClick={onSelect}
            role="button"
            tabIndex={0} // Make it focusable
            onKeyPress={(e) => e.key === 'Enter' && onSelect()} // Basic keyboard nav
        >
            {/* Left Part: Time and ID */}
            <div>
                <div style={{ fontWeight: isSelected ? '600' : '500', color: '#1f2937' }}>
                    {time}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }} title={uuid}>
                    ID: {uuid.substring(0, 8)}...
                </div>
            </div>

            {/* Right Part: SG Count and Indicators */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#4b5563', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                    {signalGroupCount} SG{signalGroupCount !== 1 ? 's' : ''}
                </div>
                {/* Green Interval Change Indicator (if applicable) */}
                {greenIntervalChanged && (
                    <ChangeIndicatorIcon title="Significant green interval change detected during pass" />
                )}
                {/* Movement Event Availability Indicator */}
                <div title={indicatorProps.title} style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: indicatorProps.color,
                    border: '1px solid rgba(0,0,0,0.1)',
                }}></div>
            </div>
        </div>
    );
};

export default PassThroughItem;