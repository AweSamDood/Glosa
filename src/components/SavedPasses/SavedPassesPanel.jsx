// src/components/SavedPasses/SavedPassesPanel.jsx - Improved version
import React, { useState, useMemo } from 'react';

// Reusable Icons from PassThroughItem
const ChangeIndicatorIcon = ({ title }) => (
    <svg title={title} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style={{ width: '12px', height: '12px', color: '#f97316' /* Orange */ }}>
        <path fillRule="evenodd" d="M8 2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M7.053 6.053a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 1.06 0Zm2.947 7.053a.75.75 0 0 1-1.06 0l-1.5-1.5a.75.75 0 1 1 1.06-1.06l1.5 1.5a.75.75 0 0 1 0 1.06Zm2.947-1.06a.75.75 0 1 0-1.06-1.06l-1.5 1.5a.75.75 0 1 0 1.06 1.06l1.5-1.5ZM13 8a.75.75 0 0 1-.75-.75V4.75a.75.75 0 0 1 1.5 0v2.5A.75.75 0 0 1 13 8Z" clipRule="evenodd" />
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z" />
    </svg>
);

const NoGreenWarningIcon = ({ title }) => (
    <svg title={title} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style={{ width: '12px', height: '12px', color: '#dc2626' /* Red */ }}>
        <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm9-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 9.75a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd" />
    </svg>
);

const GPSWarningIcon = ({ title }) => (
    <svg title={title} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style={{ width: '12px', height: '12px', color: '#f59e0b' /* Yellow */ }}>
        <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.299-2.25l5.196-9ZM8 5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm0 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
);

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

// Intersection Group Component
const IntersectionGroup = ({
                               name,
                               passes,
                               isExpanded,
                               onToggle,
                               selectedPassIndex,
                               onSelectPass,
                               onUpdateNote,
                               onRemovePass,
                               editingNoteId,
                               startEditing,
                               noteInput,
                               setNoteInput,
                               saveNote,
                               cancelEditing
                           }) => {
    return (
        <div style={{ marginBottom: '8px' }}>
            {/* Intersection Header */}
            <div
                style={{
                    padding: '12px 16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                    fontWeight: '600',
                    fontSize: '14px'
                }}
                onClick={onToggle}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#4b5563', fontSize: '10px', width: '10px' }}>
                        {isExpanded ? '▼' : '►'}
                    </span>
                    <span>{name}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '10px' }}>
                    {passes.length} {passes.length === 1 ? 'pass' : 'passes'}
                </div>
            </div>

            {/* Passes List */}
            {isExpanded && (
                <div style={{ backgroundColor: 'white', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                    {passes.map(pass => (
                        <SavedPassItem
                            key={pass.id}
                            pass={pass}
                            isSelected={pass.passIndex === selectedPassIndex}
                            onSelect={() => onSelectPass(pass.passIndex)}
                            onUpdateNote={onUpdateNote}
                            onRemovePass={onRemovePass}
                            isEditing={editingNoteId === pass.id}
                            startEditing={startEditing}
                            noteInput={noteInput}
                            setNoteInput={setNoteInput}
                            saveNote={saveNote}
                            cancelEditing={cancelEditing}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Individual Saved Pass Item
const SavedPassItem = ({
                           pass,
                           isSelected,
                           onSelect,
                           onUpdateNote,
                           onRemovePass,
                           isEditing,
                           startEditing,
                           noteInput,
                           setNoteInput,
                           saveNote,
                           cancelEditing
                       }) => {
    const signalGroups = pass.signalGroups || [];
    const hasGPSWarning = pass.possibleGPSMismatch;
    const hasNoGreenWarning = pass.hasNoGreenWarning && !hasGPSWarning;
    const greenIntervalChanged = pass.greenIntervalChanged;

    // Get movement event status indicator props
    const getStatusIndicatorProps = () => {
        if (!pass.hasMovementEvents) {
            return { title: 'No movement events found', color: '#ef4444' }; // red
        }
        if (pass.allMovementEventsUnavailable) {
            return { title: 'Movement events present but all unavailable', color: '#9ca3af' }; // gray
        }
        // Has available movement events
        return { title: 'Has available movement events', color: '#10b981' }; // green
    };

    const indicatorProps = getStatusIndicatorProps();

    return (
        <div
            style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer',
                backgroundColor: isSelected ? '#eff6ff' : 'white',
                borderLeft: isSelected ? '4px solid #3b82f6' : '4px solid transparent',
                transition: 'background-color 0.2s ease, border-left-color 0.2s ease'
            }}
            onClick={onSelect}
        >
            {/* Pass info */}
            <div style={{
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <div style={{
                        fontWeight: isSelected ? '600' : '500',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        {pass.time}

                        {/* Ingress Badge - show if available */}
                        {pass.ingress !== undefined && (
                            <div style={{
                                fontSize: '12px',
                                color: 'white',
                                backgroundColor: getIngressColor(pass.ingress),
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: '500'
                            }}>
                                I:{pass.ingress}
                            </div>
                        )}
                    </div>
                    <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '2px'
                    }} title={pass.uuid}>
                        ID: {pass.uuid.substring(0, 10)}...
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Signal Group Count */}
                    {signalGroups.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                            {signalGroups.length} SG{signalGroups.length !== 1 ? 's' : ''}
                        </div>
                    )}

                    {/* Status Indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {/* GPS Warning */}
                        {hasGPSWarning && (
                            <GPSWarningIcon title="Possible GPS mismatch - Green phase found in previous events but not in last event" />
                        )}
                        {/* No Green Warning */}
                        {hasNoGreenWarning && (
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
                            borderColor: 'rgba(0,0,0,0.1)'
                        }}></div>
                    </div>

                    {/* Edit & Delete Buttons */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {!isEditing && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(pass.id, pass.note);
                                }}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '4px'
                                }}
                                title="Edit note"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                                    <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                                </svg>
                            </button>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemovePass(pass.id);
                            }}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: '#6b7280',
                                padding: '4px'
                            }}
                            title="Remove from saved"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Signal Groups List */}
            {signalGroups.length > 0 && !isEditing && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    margin: '8px 0'
                }}>
                    {signalGroups.map(sg => (
                        <div key={sg.name} style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: sg.predicted ? '#10b981' : '#6b7280'
                            }}></div>
                            {sg.name}
                        </div>
                    ))}
                </div>
            )}

            {/* Note section */}
            {isEditing ? (
                <div onClick={(e) => e.stopPropagation()}>
                    <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Add a note..."
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            resize: 'vertical',
                            minHeight: '60px',
                            fontSize: '13px',
                            marginBottom: '8px'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => saveNote(pass.id)}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Save
                        </button>
                        <button
                            onClick={cancelEditing}
                            style={{
                                backgroundColor: '#e5e7eb',
                                color: '#4b5563',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{
                    fontSize: '13px',
                    color: pass.note ? '#374151' : '#9ca3af',
                    backgroundColor: pass.note ? '#f9fafb' : 'transparent',
                    padding: pass.note ? '8px' : '0',
                    borderRadius: '4px',
                    fontStyle: pass.note ? 'normal' : 'italic'
                }}>
                    {pass.note || 'No note added'}
                </div>
            )}
        </div>
    );
};

const SavedPassesPanel = ({
                              savedPasses,
                              onSelectPass,
                              onUpdateNote,
                              onRemovePass,
                              selectedPassIndex
                          }) => {
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteInput, setNoteInput] = useState('');
    const [expandedIntersections, setExpandedIntersections] = useState({});

    // Start editing a note
    const startEditing = (passId, currentNote) => {
        setEditingNoteId(passId);
        setNoteInput(currentNote || '');
    };

    // Save note
    const saveNote = (passId) => {
        onUpdateNote(passId, noteInput);
        setEditingNoteId(null);
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditingNoteId(null);
    };

    // Toggle an intersection's expanded state
    const toggleIntersection = (intersectionName) => {
        setExpandedIntersections(prev => ({
            ...prev,
            [intersectionName]: !prev[intersectionName]
        }));
    };

    // Group passes by intersection
    const passesByIntersection = useMemo(() => {
        const grouped = {};

        savedPasses.forEach(pass => {
            const intersectionName = pass.intersectionName || 'Unknown Intersection';

            if (!grouped[intersectionName]) {
                grouped[intersectionName] = [];
                // Automatically expand intersections by default
                if (expandedIntersections[intersectionName] === undefined) {
                    setExpandedIntersections(prev => ({
                        ...prev,
                        [intersectionName]: true
                    }));
                }
            }

            grouped[intersectionName].push(pass);
        });

        // Sort passes within each intersection by time (most recent first)
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => {
                // Assuming time is in a format that can be compared lexicographically
                // If it's a Date object, you'd use getTime() for comparison
                return b.savedAt.localeCompare(a.savedAt);
            });
        });

        return grouped;
    }, [savedPasses, expandedIntersections]);

    return (
        <div style={{
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '300px',
            borderLeft: '1px solid #d1d5db'
        }}>
            {/* Header */}
            <div style={{
                fontSize: '16px',
                fontWeight: '600',
                padding: '16px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>Saved Passes</span>
                <span style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    backgroundColor: '#e5e7eb',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: '500'
                }}>
                    {savedPasses.length}
                </span>
            </div>

            {/* Saved passes list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>
                {Object.keys(passesByIntersection).length === 0 ? (
                    <div style={{
                        padding: '24px 0',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '14px'
                    }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            style={{ width: '24px', height: '24px', color: '#d1d5db', margin: '0 auto 8px' }}
                        >
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                        <p>No passes saved yet. Save a pass by clicking the "Save Pass" button when viewing pass details.</p>
                    </div>
                ) : (
                    Object.entries(passesByIntersection).map(([intersectionName, passes]) => (
                        <IntersectionGroup
                            key={intersectionName}
                            name={intersectionName}
                            passes={passes}
                            isExpanded={expandedIntersections[intersectionName] || false}
                            onToggle={() => toggleIntersection(intersectionName)}
                            selectedPassIndex={selectedPassIndex}
                            onSelectPass={onSelectPass}
                            onUpdateNote={onUpdateNote}
                            onRemovePass={onRemovePass}
                            editingNoteId={editingNoteId}
                            startEditing={startEditing}
                            noteInput={noteInput}
                            setNoteInput={setNoteInput}
                            saveNote={saveNote}
                            cancelEditing={cancelEditing}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default SavedPassesPanel;