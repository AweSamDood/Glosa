// src/components/IntersectionList/PassThroughItem.jsx
import React from 'react';

const PassThroughItem = ({ passThrough, isSelected, onSelect }) => {
    // Default values for safety
    const summary = passThrough.summary || { anySignalGroupHasMovementEvents: false, allMovementEventsUnavailable: true };
    const signalGroups = passThrough.signalGroups || {};
    const timestamp = passThrough.timestamp || new Date();
    const uuid = passThrough.uuid || 'unknown-uuid';

    const hasMovementEvents = summary.anySignalGroupHasMovementEvents;
    const signalGroupCount = Object.keys(signalGroups).length;
    const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); // Format time

    // Determine status indicator properties
    const getStatusIndicatorProps = () => {
        if (!hasMovementEvents) {
            return { title: 'No movement events found', color: '#ef4444' }; // red
        }
        if (summary.allMovementEventsUnavailable) {
            return { title: 'Has movement events but all unavailable or no data', color: '#9ca3af' }; // gray
        }
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
            }}
            onClick={onSelect}
            role="button"
            tabIndex={0} // Make it focusable
            onKeyPress={(e) => e.key === 'Enter' && onSelect()} // Basic keyboard nav
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: isSelected ? '600' : '500', color: '#1f2937' }}> {/* Slightly bolder when selected */}
                        {time}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }} title={uuid}>
                        ID: {uuid.substring(0, 8)}...
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}> {/* Increased gap */}
                    <div style={{ fontSize: '12px', color: '#4b5563', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                        {signalGroupCount} SG{signalGroupCount !== 1 ? 's' : ''}
                    </div>
                    <div title={indicatorProps.title} style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: indicatorProps.color,
                        border: '1px solid rgba(0,0,0,0.1)', // Subtle border
                    }}></div>
                </div>
            </div>
        </div>
    );
};

export default PassThroughItem;