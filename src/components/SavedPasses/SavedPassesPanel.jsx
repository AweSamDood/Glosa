// src/components/SavedPasses/SavedPassesPanel.jsx
import React, { useState } from 'react';

const SavedPassesPanel = ({
                              savedPasses,
                              onSelectPass,
                              onUpdateNote,
                              onRemovePass,
                              selectedPassIndex
                          }) => {
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteInput, setNoteInput] = useState('');

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
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {savedPasses.length === 0 ? (
                    <div style={{
                        padding: '24px 16px',
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
                    savedPasses.map(pass => (
                        <div
                            key={pass.id}
                            style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #e5e7eb',
                                cursor: 'pointer',
                                backgroundColor: pass.passIndex === selectedPassIndex ? '#eff6ff' : 'white',
                                transition: 'background-color 0.2s ease',
                                borderLeft: pass.passIndex === selectedPassIndex ? '4px solid #3b82f6' : '4px solid transparent'
                            }}
                            onClick={() => onSelectPass(pass.passIndex)}
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
                                        fontWeight: pass.passIndex === selectedPassIndex ? '600' : '500',
                                        fontSize: '14px'
                                    }}>
                                        {pass.time}
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
                                <div>
                                    {editingNoteId !== pass.id && (
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
                                                padding: '4px',
                                                marginRight: '4px'
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

                            {/* Note section */}
                            {editingNoteId === pass.id ? (
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
                    ))
                )}
            </div>
        </div>
    );
};

export default SavedPassesPanel;