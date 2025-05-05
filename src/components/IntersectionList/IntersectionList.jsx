// src/components/IntersectionList/IntersectionList.jsx
import React, { useState } from 'react';
import IntersectionItem from './IntersectionItem';

// Sort button component for reusability
const SortButton = ({ label, currentField, currentDirection, field, onClick }) => {
    const isActive = currentField === field;

    // Use SVG icons for better visual consistency
    const renderIcon = () => {
        if (!isActive) return null;

        if (currentDirection === 'asc') {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                    <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
                </svg>
            );
        } else {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '14px', height: '14px' }}>
                    <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
                </svg>
            );
        }
    };

    return (
        <button
            onClick={() => onClick(field)}
            style={{
                padding: '6px 10px',
                fontSize: '12px',
                backgroundColor: isActive ? '#e0f2fe' : '#f9fafb',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: isActive ? '#3b82f6' : '#4b5563',
                fontWeight: isActive ? '600' : 'normal',
                transition: 'all 0.2s ease',
            }}
        >
            {label} {renderIcon()}
        </button>
    );
};

const IntersectionList = ({ intersections, selectedPassIndex, onSelectPassThrough }) => {
    // State for sorting
    const [sortField, setSortField] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    // Handle sort button click
    const handleSort = (field) => {
        if (sortField === field) {
            // Toggle direction if same field clicked
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, reset to ascending
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Get sorted intersection IDs
    const getSortedIntersectionIds = () => {
        const intersectionIds = Object.keys(intersections);

        return intersectionIds.sort((a, b) => {
            const intA = intersections[a];
            const intB = intersections[b];

            let compareResult = 0;

            if (sortField === 'name') {
                compareResult = intA.name.localeCompare(intB.name);
            } else if (sortField === 'passes') {
                compareResult = intA.passThroughs.length - intB.passThroughs.length;
            }

            // Reverse for descending order
            return sortDirection === 'asc' ? compareResult : -compareResult;
        });
    };

    const sortedIntersectionIds = getSortedIntersectionIds();

    if (sortedIntersectionIds.length === 0) {
        return (
            <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                No intersection data loaded.
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', padding: '16px', borderBottom: '1px solid #e5e7eb', margin: 0, color: '#111827', backgroundColor: '#f9fafb', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Intersections & Passes</span>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'normal' }}>
                        {sortedIntersectionIds.length} {sortedIntersectionIds.length === 1 ? 'intersection' : 'intersections'}
                    </span>
                </div>

                {/* Sorting controls */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>Sort by:</span>
                    <SortButton
                        label="Name"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        field="name"
                        onClick={handleSort}
                    />
                    <SortButton
                        label="Passes"
                        currentField={sortField}
                        currentDirection={sortDirection}
                        field="passes"
                        onClick={handleSort}
                    />
                </div>
            </div>

            <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', flexGrow: 1 }}>
                {sortedIntersectionIds.map(id => (
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