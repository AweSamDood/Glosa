// src/components/IntersectionList/IntersectionList.jsx
import React from 'react';
import IntersectionItem from './IntersectionItem';

const IntersectionList = ({ intersections, selectedPassIndex, onSelectPassThrough }) => {
    const intersectionIds = Object.keys(intersections);

    if (intersectionIds.length === 0) {
        return (
            <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                No intersection data loaded.
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}> {/* Enhanced shadow */}
            <h2 style={{ fontSize: '16px', fontWeight: '600', padding: '16px', borderBottom: '1px solid #e5e7eb', margin: 0, color: '#111827', backgroundColor: '#f9fafb' }}> {/* Header styling */}
                Intersections & Passes
            </h2>

            <div style={{ maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}> {/* Adjust max height as needed */}
                {intersectionIds.map(id => (
                    <IntersectionItem
                        key={id}
                        intersection={intersections[id]}
                        selectedPassIndex={selectedPassIndex}
                        onSelectPassThrough={onSelectPassThrough}
                    />
                ))}
            </div>
        </div>
    );
};

export default IntersectionList;