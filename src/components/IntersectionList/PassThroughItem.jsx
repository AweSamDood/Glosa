// src/components/IntersectionList/PassThroughItem.jsx - Enhanced version
import React, { useState } from 'react';

// Reusable Icon Component
const ChangeIndicatorIcon = ({ title }) => (
    <svg title={title} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style={{ width: '12px', height: '12px', color: '#f97316' /* Orange */ }}>
        <path fillRule="evenodd" d="M8 2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M7.053 6.053a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0Zm2.947 7.053a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06l1.5 1.5a.75.75 0 0 1 0 1.06Zm2.947-1.06a.75.75 0 1 0-1.06-1.06l-1.5 1.5a.75.75 0 1 0 1.06 1.06l1.5-1.5ZM13 8a.75.75 0 0 1-.75-.75V4.75a.75.75 0 0 1 1.5 0v2.5A.75.75 0 0 1 13 8Z" clipRule="evenodd" />
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z" />
    </svg>
);

// Red warning icon for no green in any recent events
const NoGreenWarningIcon = ({ title }) => (
    <svg title={title} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style={{ width: '12px', height: '12px', color: '#dc2626' /* Red */ }}>
        <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm9-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 9.75a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd" />
    </svg>
);

// Yellow warning icon for possible GPS mismatch
const GPSWarningIcon = ({ title }) => (
    <svg title={title} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style={{ width: '12px', height: '12px', color: '#f59e0b' /* Yellow */ }}>
        <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.299-2.25l5.196-9ZM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm0 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
);

// Show/hide toggle icon
const ChevronIcon = ({ isExpanded }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        style={{
            width: '14px',
            height: '14px',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
        }}
    >
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
);

// Helper function to extract ingress ID from passThrough data
const getIngressID = (passThrough) => {
    // Try to find ingress in the first event
    if (passThrough?.signalGroups) {
        for (const sgName in passThrough.signalGroups) {
            const sg = passThrough.signalGroups[sgName];
            if (sg.metrics && sg.metrics.length > 0) {
                for (const metric of sg.metrics) {
                    if (metric._rawEvent &&
                        metric._rawEvent.intersectionPass?.intPassInfo?.ingress !== undefined) {
                        return metric._rawEvent.intersectionPass.intPassInfo.ingress;
                    }
                }
            }
        }
    }
    return null;
};

// Function to get color based on ingress ID
const getIngressColor = (ingress) => {
    if (ingress === null || ingress === undefined) return '#9ca3af'; // gray

    const colors = {
        1: '#3b82f6', // blue
        2: '#8b5cf6', // purple
        3: '#ec4899', // pink
        4: '#f97316', // orange
        5: '#22c55e', // green
        6: '#64748b', // slate
        7: '#f59e0b', // amber
        8: '#06b6d4', // cyan
        9: '#14b8a6', // teal
    };

    return colors[ingress] || '#9ca3af'; // default gray
};

// Helper to check if a signal group is predicted for passage
const isSignalGroupPredicted = (sgName, predictions) => {
    if (!predictions || !Array.isArray(predictions)) return false;
    return predictions.some(prediction => prediction.signalGroup === sgName);
};

const PassThroughItem = ({
                             passThrough,
                             isSelected,
                             onSelect,
                             isFilteredOut = false
                         }) => {
    // State to toggle expanded view with signal groups
    const [isExpanded, setIsExpanded] = useState(false);

    // Default values for safety
    const summary = passThrough.summary || {
        anySignalGroupHasMovementEvents: false,
        allMovementEventsUnavailable: true,
        significantGreenIntervalChangeOccurred: false,
        hasNoPredictedGreensWithAvailableEvents: false,
        possibleGPSMismatch: false,
        predictedSignalGroupsUsed: []
    };
    const signalGroups = passThrough.signalGroups || {};
    const timestamp = passThrough.timestamp || new Date();
    const uuid = passThrough.uuid || 'unknown-uuid';

    const hasMovementEvents = summary.anySignalGroupHasMovementEvents;
    const greenIntervalChanged = summary.significantGreenIntervalChangeOccurred;
    const hasNoGreenWarning = summary.hasNoPredictedGreensWithAvailableEvents;
    const possibleGPSMismatch = summary.possibleGPSMismatch;
    const signalGroupCount = Object.keys(signalGroups).length;
    const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const predictions = summary.predictedSignalGroupsUsed || [];

    // Get ingress ID for this pass-through
    const ingressID = getIngressID(passThrough);
    const ingressColor = getIngressColor(ingressID);

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

    // Toggle signal groups visibility
    const toggleExpanded = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <div
            style={{
                padding: '12px 16px 12px 32px',
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: '#f3f4f6',
                cursor: 'pointer',
                backgroundColor: isSelected ? '#eff6ff' : isFilteredOut ? '#fef2f2' : 'white',
                borderLeftWidth: '4px',
                borderLeftStyle: 'solid',
                borderLeftColor: isSelected ? '#3b82f6' : 'transparent',
                transition: 'background-color 0.2s ease, border-left-color 0.2s ease',
                opacity: isFilteredOut ? 0.8 : 1
            }}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && onSelect()}
        >
            {/* Left Part: Time and ID */}
            <div>
                <div style={{ fontWeight: isSelected ? '600' : '500', color: isFilteredOut ? '#991b1b' : '#1f2937' }}>
                    {time}
                </div>
                <div style={{ fontSize: '12px', color: isFilteredOut ? '#ef4444' : '#6b7280', marginTop: '4px' }} title={uuid}>
                    ID: {uuid.substring(0, 8)}...
                </div>
            </div>

            {/* Right Part: SG Count, Ingress Badge and Indicators */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '8px'
            }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        backgroundColor: isExpanded ? '#f3f4f6' : 'transparent'
                    }}
                    onClick={toggleExpanded}
                    title={isExpanded ? "Hide signal groups" : "Show signal groups"}
                >
                    <div style={{ fontSize: '12px', color: '#4b5563', backgroundColor: isFilteredOut ? '#fee2e2' : '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                        {signalGroupCount} SG{signalGroupCount !== 1 ? 's' : ''}
                    </div>
                    <ChevronIcon isExpanded={isExpanded} />
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Ingress Badge - show if available */}
                    {ingressID !== null && (
                        <div style={{
                            fontSize: '12px',
                            color: 'white',
                            backgroundColor: ingressColor,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '500',
                            opacity: isFilteredOut ? 0.7 : 1
                        }}>
                            I:{ingressID}
                        </div>
                    )}

                    {/* GPS Warning */}
                    {possibleGPSMismatch && (
                        <GPSWarningIcon title="Possible GPS mismatch - Green phase found in previous events but not in last event" />
                    )}
                    {/* No Green Warning */}
                    {hasNoGreenWarning && !possibleGPSMismatch && (
                        <NoGreenWarningIcon title="Available movement events but no green phase detected in recent events" />
                    )}
                    {/* Green Interval Change Indicator */}
                    {greenIntervalChanged && (
                        <ChangeIndicatorIcon title="Significant green interval change detected during pass" />
                    )}
                    {/* Movement Event Availability Indicator */}
                    <div title={indicatorProps.title} style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: indicatorProps.color,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(0,0,0,0.1)',
                        opacity: isFilteredOut ? 0.7 : 1
                    }}></div>
                </div>
            </div>

            {/* Signal Groups Section - Expandable */}
            {isExpanded && signalGroupCount > 0 && (
                <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    paddingLeft: '4px'
                }}>
                    {Object.entries(signalGroups).map(([sgName, sg]) => {
                        const isPredicted = isSignalGroupPredicted(sgName, predictions);
                        const hasAvailableMovementEvents = sg.hasMovementEvents && !sg.allMovementEventsUnavailable;

                        return (
                            <div key={sgName} style={{
                                fontSize: '12px',
                                padding: '4px 8px',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: isPredicted ? '1px solid #86efac' : 'none'
                            }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: isPredicted ? '#10b981' :
                                        hasAvailableMovementEvents ? '#3b82f6' :
                                            sg.hasMovementEvents ? '#9ca3af' : '#ef4444'
                                }}></div>
                                {sgName}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PassThroughItem;