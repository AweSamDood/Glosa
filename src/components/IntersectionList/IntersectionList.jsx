// src/components/IntersectionList/IntersectionList.jsx
import React, { useState, useEffect } from 'react';
import IntersectionItem from './IntersectionItem';
import SearchField from './SearchField';

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

const IntersectionList = ({
                              intersections,
                              filteredData = {},
                              filteredPassIndices = new Set(),
                              showFilteredOutItems = false,
                              setShowFilteredOutItems,
                              filtersActive = false,
                              selectedPassIndex,
                              onSelectPassThrough
                          }) => {
    // State for sorting
    const [sortField, setSortField] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    // State for UUID search
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResultFound, setSearchResultFound] = useState(false);
    const [searchMessage, setSearchMessage] = useState('');

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

    // Determine which intersections are filtered in and out
    const filteredIntersectionIds = Object.keys(filteredData);
    const filteredOutIntersectionIds = Object.keys(intersections)
        .filter(id => !filteredIntersectionIds.includes(id));

    // Sort the intersection IDs based on current sort settings
    const getSortedIntersectionIds = (ids) => {
        return [...ids].sort((a, b) => {
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

    const sortedFilteredIds = getSortedIntersectionIds(filteredIntersectionIds);
    const sortedFilteredOutIds = getSortedIntersectionIds(filteredOutIntersectionIds);

    // Handle toggle for filtered-out items
    const toggleFilteredOutItems = () => {
        if (setShowFilteredOutItems) {
            setShowFilteredOutItems(!showFilteredOutItems);
        }
    };

    // Function to search for a UUID
    const handleSearch = (term) => {
        setSearchTerm(term);

        if (!term) {
            setSearchResultFound(false);
            setSearchMessage('');
            return;
        }

        // Search for the UUID in all pass-throughs
        let found = false;
        let foundPassId = null;

        // Search in all intersections
        for (const intersectionId in intersections) {
            const intersection = intersections[intersectionId];

            for (const pass of intersection.passThroughs) {
                // Check if the UUID includes the search term (case insensitive)
                if (pass.uuid && pass.uuid.toLowerCase().includes(term.toLowerCase())) {
                    found = true;
                    foundPassId = pass.passIndex;
                    break;
                }
            }

            if (found) break;
        }

        if (found && foundPassId !== null) {
            setSearchResultFound(true);
            setSearchMessage('Pass found!');
            // Select the found pass-through
            onSelectPassThrough(foundPassId);
        } else {
            setSearchResultFound(false);
            setSearchMessage('No matching passes found.');
        }
    };

    // Clear search status when selection changes through other means
    useEffect(() => {
        if (searchTerm && selectedPassIndex) {
            setSearchMessage('');
        }
    }, [selectedPassIndex]);

    if (Object.keys(intersections).length === 0) {
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
                        {Object.keys(intersections).length} {Object.keys(intersections).length === 1 ? 'intersection' : 'intersections'}
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

            {/* Search field */}
            <SearchField onSearch={handleSearch} />

            {/* Search result message */}
            {searchMessage && (
                <div style={{
                    padding: '8px 16px',
                    backgroundColor: searchResultFound ? '#f0fdf4' : '#fef2f2',
                    color: searchResultFound ? '#166534' : '#991b1b',
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {searchResultFound ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                    )}
                    {searchMessage}
                </div>
            )}

            <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', flexGrow: 1 }}>
                {/* Filtered Intersections Group */}
                {sortedFilteredIds.length > 0 && (
                    <div>
                        {filtersActive && (
                            <div style={{
                                padding: '12px 16px',
                                backgroundColor: '#f0f9ff',
                                borderBottomWidth: '1px',
                                borderBottomStyle: 'solid',
                                borderBottomColor: '#e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ fontWeight: '600', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                                        <path fillRule="evenodd" d="M2.5 3A1.5 1.5 0 001 4.5v4A1.5 1.5 0 002.5 10h6A1.5 1.5 0 0010 8.5v-4A1.5 1.5 0 008.5 3h-6zm11 2A1.5 1.5 0 0012 6.5v7a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0019.5 5h-6zm-11 7A1.5 1.5 0 001 13.5v2A1.5 1.5 0 002.5 17h6A1.5 1.5 0 0010 15.5v-2A1.5 1.5 0 008.5 12h-6z" clipRule="evenodd" />
                                    </svg>
                                    Matching Filter
                                </div>
                                <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '500', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '12px' }}>
                                    {sortedFilteredIds.length} {sortedFilteredIds.length === 1 ? 'intersection' : 'intersections'}
                                </div>
                            </div>
                        )}

                        {sortedFilteredIds.map(id => (
                            <IntersectionItem
                                key={id}
                                intersection={intersections[id]}
                                filteredPassIndices={filteredPassIndices}
                                selectedPassIndex={selectedPassIndex}
                                onSelectPassThrough={onSelectPassThrough}
                                filtersActive={filtersActive}
                            />
                        ))}
                    </div>
                )}

                {/* Filtered Out Intersections Group */}
                {filtersActive && sortedFilteredOutIds.length > 0 && (
                    <div>
                        <div
                            style={{
                                padding: '12px 16px',
                                backgroundColor: '#fff1f2',
                                borderBottomWidth: '1px',
                                borderBottomStyle: 'solid',
                                borderBottomColor: '#e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer'
                            }}
                            onClick={toggleFilteredOutItems}
                        >
                            <div style={{ fontWeight: '600', color: '#be123c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                                    <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
                                </svg>
                                Not Matching Filter
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', marginLeft: '4px', transform: showFilteredOutItems ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div style={{ fontSize: '12px', color: '#be123c', fontWeight: '500', backgroundColor: '#ffe4e6', padding: '3px 8px', borderRadius: '12px' }}>
                                {sortedFilteredOutIds.length} {sortedFilteredOutIds.length === 1 ? 'intersection' : 'intersections'}
                            </div>
                        </div>

                        {showFilteredOutItems && sortedFilteredOutIds.map(id => (
                            <IntersectionItem
                                key={id}
                                intersection={intersections[id]}
                                filteredPassIndices={filteredPassIndices}
                                selectedPassIndex={selectedPassIndex}
                                onSelectPassThrough={onSelectPassThrough}
                                isFilteredOut={true}
                                filtersActive={filtersActive}
                            />
                        ))}
                    </div>
                )}

                {/* Show empty state if no intersections match filters */}
                {filtersActive && sortedFilteredIds.length === 0 && (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b7280' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '40px', height: '40px', color: '#d1d5db', margin: '0 auto 16px' }}>
                            <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
                        </svg>
                        <p>No intersections match the current filter criteria.</p>
                        <p>Try adjusting your filters or <button
                            onClick={toggleFilteredOutItems}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#3b82f6',
                                fontWeight: '500',
                                cursor: 'pointer',
                                padding: '0',
                                textDecoration: 'underline'
                            }}
                        >
                            view filtered-out intersections
                        </button>.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IntersectionList;