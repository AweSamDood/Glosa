// src/components/SavedPasses/SavePassButton.jsx
import React from 'react';

const SavePassButton = ({ passThrough, isSaved, onSavePass, onUnsavePass }) => {
    if (!passThrough) return null;

    // Handle save/unsave
    const handleToggleSave = () => {
        if (isSaved) {
            onUnsavePass(passThrough.passIndex);
        } else {
            // Prepare pass data for saving
            const saveData = {
                passIndex: passThrough.passIndex,
                uuid: passThrough.uuid || 'unknown-uuid',
                time: passThrough.timestamp ? passThrough.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }) : 'Unknown time',
                note: '',
                savedAt: new Date().toISOString(),
                intersectionName: passThrough.intersectionName || 'Unknown Intersection'
            };

            onSavePass(saveData);
        }
    };

    return (
        <button
            onClick={handleToggleSave}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: isSaved ? '#fee2e2' : '#f3f4f6',
                color: isSaved ? '#dc2626' : '#1f2937',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.2s ease'
            }}
        >
            {isSaved ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                        <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
                    </svg>
                    Unsave Pass
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                    Save Pass
                </>
            )}
        </button>
    );
};

export default SavePassButton;