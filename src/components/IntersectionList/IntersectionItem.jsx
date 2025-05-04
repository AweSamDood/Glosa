// src/components/IntersectionList/IntersectionItem.jsx
import React, { useState } from 'react';
import PassThroughList from './PassThroughList';

const IntersectionItem = ({ intersection, selectedPassIndex, onSelectPassThrough }) => {
    // Default to expanded if it contains the selected pass-through
    const initiallyExpanded = intersection.passThroughs.some(p => p.passIndex === selectedPassIndex);
    const [expanded, setExpanded] = useState(initiallyExpanded);

    // Update expansion if selection changes elsewhere
    React.useEffect(() => {
        const containsSelected = intersection.passThroughs.some(p => p.passIndex === selectedPassIndex);
        if (containsSelected && !expanded) {
            setExpanded(true);
        }
        // Optional: Collapse if selection moves outside this intersection?
        // else if (!containsSelected && expanded) {
        //   setExpanded(false);
        // }
    }, [selectedPassIndex, intersection.passThroughs, expanded]);

    const toggleExpanded = () => setExpanded(!expanded);

    return (
        <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            <div
                style={{
                    padding: '12px 16px',
                    fontWeight: '600', // Bolder header
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#f9fafb',
                    color: '#374151',
                    borderTop: '1px solid #e5e7eb', // Separator line
                }}
                onClick={toggleExpanded}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onKeyPress={(e) => e.key === 'Enter' && toggleExpanded()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#4b5563', fontSize: '10px', width: '10px' }}> {/* Arrow indicator */}
                        {expanded ? '▼' : '►'}
                    </span>
                    <span title={`${intersection.name} (ID: ${intersection.id})`}>{intersection.name}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', background: '#e5e7eb', padding: '2px 8px', borderRadius: '10px' }}>
                    {intersection.passThroughs.length} {intersection.passThroughs.length === 1 ? 'pass' : 'passes'}
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

export default IntersectionItem;