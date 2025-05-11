import React, { useState, useMemo, useEffect } from 'react';

const GlobalFilteringSection = ({
                                    intersections,
                                    onFilterChange,
                                    initialFilters = {
                                        selectedIntersections: {},
                                        movementEventAvailability: {
                                            available: true,
                                            unavailable: true,
                                            none: true
                                        },
                                        passThroughCategory: {
                                            withPredictions: true,
                                            gpsIssues: true,
                                            noGreen: true,
                                            other: true
                                        }
                                    }
                                }) => {
    // Initialize state with all intersections selected by default
    const [filters, setFilters] = useState(() => {
        const selectedIntersections = {};
        // Set all intersections to selected by default
        Object.keys(intersections).forEach(intId => {
            selectedIntersections[intId] = initialFilters.selectedIntersections[intId] ?? true;
        });

        return {
            ...initialFilters,
            selectedIntersections
        };
    });

    // State to track expanded sections
    const [expandedSections, setExpandedSections] = useState({
        intersections: false,
        movement: true,
        passthrough: true
    });

    // Auto-apply filters when they change
    useEffect(() => {
        applyFilters();
    }, [filters]);

    // Active filter count for the UI
    const activeFilterCount = useMemo(() => {
        let count = 0;

        // Count unselected intersections (since default is all selected)
        const deselectedIntersections = Object.values(filters.selectedIntersections).filter(selected => !selected).length;
        if (deselectedIntersections > 0) count += deselectedIntersections;

        // Count unselected movement event types
        Object.values(filters.movementEventAvailability).forEach(selected => {
            if (!selected) count++;
        });

        // Count unselected pass-through categories
        Object.values(filters.passThroughCategory).forEach(selected => {
            if (!selected) count++;
        });

        return count;
    }, [filters]);

    // Adjust the filter function to:
// 1. First filter at the intersection level (include an intersection if ANY pass-through matches)
// 2. Create filteredPassIndices to track WHICH passes actually match the filter criteria

    const applyFilters = () => {
        const filteredData = {};
        const filteredPassIndices = new Set(); // Track pass indices that match filter criteria

        // First, filter by selected intersections
        Object.entries(intersections).forEach(([intId, intersection]) => {
            if (filters.selectedIntersections[intId]) {
                // Make a copy of the intersection with all pass-throughs (we'll filter display later)
                const filteredIntersection = {
                    ...intersection,
                    passThroughs: intersection.passThroughs
                };

                // Check each pass-through against filter criteria
                let hasMatchingPassThrough = false;

                intersection.passThroughs.forEach(passThrough => {
                    // Check movement event availability with priority logic
                    const signalGroups = passThrough.signalGroups || {};
                    const signalGroupsCount = Object.keys(signalGroups).length;

                    let availableCount = 0;
                    let unavailableCount = 0;
                    let noneCount = 0;

                    // Count each category
                    Object.values(signalGroups).forEach(sg => {
                        if (sg.hasMovementEvents && !sg.allMovementEventsUnavailable) {
                            availableCount++;
                        } else if (sg.hasMovementEvents && sg.allMovementEventsUnavailable) {
                            unavailableCount++;
                        } else if (!sg.hasMovementEvents) {
                            noneCount++;
                        }
                    });

                    // Categorize pass-through based on priority and exclusivity
                    let includeByAvailability = false;

                    // Create an array of selected availability categories
                    const selectedAvailabilities = [];
                    if (filters.movementEventAvailability.available) selectedAvailabilities.push('available');
                    if (filters.movementEventAvailability.unavailable) selectedAvailabilities.push('unavailable');
                    if (filters.movementEventAvailability.none) selectedAvailabilities.push('none');

                    // If all types are selected, include everything
                    if (selectedAvailabilities.length === 3) {
                        includeByAvailability = true;
                    }
                    // If only one type is selected, be strict about it
                    else if (selectedAvailabilities.length === 1) {
                        const selected = selectedAvailabilities[0];
                        if (selected === 'available' && availableCount === signalGroupsCount) {
                            includeByAvailability = true;
                        } else if (selected === 'unavailable' && unavailableCount === signalGroupsCount) {
                            includeByAvailability = true;
                        } else if (selected === 'none' && noneCount === signalGroupsCount) {
                            includeByAvailability = true;
                        }
                    }
                    // If two types are selected, include if ANY signal group matches either type
                    else if (selectedAvailabilities.length === 2) {
                        if ((selectedAvailabilities.includes('available') && availableCount > 0) ||
                            (selectedAvailabilities.includes('unavailable') && unavailableCount > 0) ||
                            (selectedAvailabilities.includes('none') && noneCount > 0)) {
                            includeByAvailability = true;
                        }
                    }

                    // Check pass-through category
                    let includeByCategory = false;

                    const summary = passThrough.summary || {};
                    const hasPredictions = summary.predictedSignalGroupsUsed?.length > 0;
                    const hasGPSIssue = summary.possibleGPSMismatch;
                    const hasNoGreen = summary.hasNoPredictedGreensWithAvailableEvents && !hasGPSIssue;

                    // Create an array of selected categories
                    const selectedCategories = [];
                    if (filters.passThroughCategory.withPredictions) selectedCategories.push('withPredictions');
                    if (filters.passThroughCategory.gpsIssues) selectedCategories.push('gpsIssues');
                    if (filters.passThroughCategory.noGreen) selectedCategories.push('noGreen');
                    if (filters.passThroughCategory.other) selectedCategories.push('other');

                    // Apply category filters
                    if (selectedCategories.length === 4) {
                        // All categories selected, include everything
                        includeByCategory = true;
                    } else {
                        // Apply specific category filters
                        if (hasPredictions && filters.passThroughCategory.withPredictions) {
                            includeByCategory = true;
                        } else if (hasGPSIssue && filters.passThroughCategory.gpsIssues) {
                            includeByCategory = true;
                        } else if (hasNoGreen && filters.passThroughCategory.noGreen) {
                            includeByCategory = true;
                        } else if (!hasPredictions && !hasGPSIssue && !hasNoGreen && filters.passThroughCategory.other) {
                            includeByCategory = true;
                        }
                    }

                    // If this pass-through passes both filters, mark the intersection as having matching passes
                    // and add this pass index to the filtered set
                    if (includeByAvailability && includeByCategory) {
                        hasMatchingPassThrough = true;
                        filteredPassIndices.add(passThrough.passIndex);
                    }
                });

                // Only include intersections that have at least one pass-through after filtering
                if (hasMatchingPassThrough) {
                    filteredData[intId] = filteredIntersection;
                }
            }
        });

        // Call the parent callback with filtered data and filtered pass indices
        onFilterChange(filteredData, filters, filteredPassIndices);
    }

    // Reset all filters to defaults
    const resetFilters = () => {
        const resetSelectedIntersections = {};
        Object.keys(intersections).forEach(intId => {
            resetSelectedIntersections[intId] = true;
        });

        const newFilters = {
            selectedIntersections: resetSelectedIntersections,
            movementEventAvailability: {
                available: true,
                unavailable: true,
                none: true
            },
            passThroughCategory: {
                withPredictions: true,
                gpsIssues: true,
                noGreen: true,
                other: true
            }
        };

        setFilters(newFilters);
    };

    // Toggle a specific intersection selection
    const toggleIntersection = (intersectionId) => {
        setFilters(prev => ({
            ...prev,
            selectedIntersections: {
                ...prev.selectedIntersections,
                [intersectionId]: !prev.selectedIntersections[intersectionId]
            }
        }));
    };

    // Toggle all intersections at once
    const toggleAllIntersections = (value) => {
        const newSelectedIntersections = {};
        Object.keys(intersections).forEach(intId => {
            newSelectedIntersections[intId] = value;
        });

        setFilters(prev => ({
            ...prev,
            selectedIntersections: newSelectedIntersections
        }));
    };

    // Toggle a movement event availability filter
    const toggleMovementEventAvailability = (key) => {
        setFilters(prev => ({
            ...prev,
            movementEventAvailability: {
                ...prev.movementEventAvailability,
                [key]: !prev.movementEventAvailability[key]
            }
        }));
    };

    // Toggle a pass-through category filter
    const togglePassThroughCategory = (key) => {
        setFilters(prev => ({
            ...prev,
            passThroughCategory: {
                ...prev.passThroughCategory,
                [key]: !prev.passThroughCategory[key]
            }
        }));
    };

    // Toggle section expansion
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <div style={{
            borderRadius: '8px',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '16px'
        }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '16px' }}>
                {/* Active Filter Indicator */}
                {activeFilterCount > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#eff6ff',
                        borderRadius: '6px',
                        color: '#1d4ed8',
                        fontWeight: '500'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                            <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
                        </svg>
                        {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
                    </div>
                )}

                {/* Movement Event Availability Filter */}
                <div style={{
                    flex: 1,
                    minWidth: '250px',
                    backgroundColor: '#f9fafb',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            marginBottom: expandedSections.movement ? '12px' : '0'
                        }}
                        onClick={() => toggleSection('movement')}
                    >
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                            Movement Event Availability
                        </h4>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{
                            width: '20px',
                            height: '20px',
                            transform: expandedSections.movement ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                        }}>
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </div>

                    {expandedSections.movement && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: filters.movementEventAvailability.available ? '#f0fdf4' : 'white',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: filters.movementEventAvailability.available ? '#86efac' : '#e5e7eb',
                                cursor: 'pointer'
                            }} onClick={() => toggleMovementEventAvailability('available')}>
                                <input
                                    type="checkbox"
                                    checked={filters.movementEventAvailability.available}
                                    onChange={() => {}}
                                    id="me-available"
                                />
                                <label htmlFor="me-available" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: '#10b981'
                                    }}></div>
                                    Available Events
                                </label>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: filters.movementEventAvailability.unavailable ? '#f0fdf4' : 'white',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: filters.movementEventAvailability.unavailable ? '#86efac' : '#e5e7eb',
                                cursor: 'pointer'
                            }} onClick={() => toggleMovementEventAvailability('unavailable')}>
                                <input
                                    type="checkbox"
                                    checked={filters.movementEventAvailability.unavailable}
                                    onChange={() => {}}
                                    id="me-unavailable"
                                />
                                <label htmlFor="me-unavailable" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: '#9ca3af'
                                    }}></div>
                                    Unavailable Events
                                </label>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: filters.movementEventAvailability.none ? '#f0fdf4' : 'white',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: filters.movementEventAvailability.none ? '#86efac' : '#e5e7eb',
                                cursor: 'pointer'
                            }} onClick={() => toggleMovementEventAvailability('none')}>
                                <input
                                    type="checkbox"
                                    checked={filters.movementEventAvailability.none}
                                    onChange={() => {}}
                                    id="me-none"
                                />
                                <label htmlFor="me-none" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: '#ef4444'
                                    }}></div>
                                    No Movement Events
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pass-Through Category Filter */}
                <div style={{
                    flex: 1,
                    minWidth: '250px',
                    backgroundColor: '#f9fafb',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            marginBottom: expandedSections.passthrough ? '12px' : '0'
                        }}
                        onClick={() => toggleSection('passthrough')}
                    >
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                            Pass-Through Category
                        </h4>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{
                            width: '20px',
                            height: '20px',
                            transform: expandedSections.passthrough ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                        }}>
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </div>

                    {expandedSections.passthrough && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: filters.passThroughCategory.withPredictions ? '#f0fdf4' : 'white',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: filters.passThroughCategory.withPredictions ? '#86efac' : '#e5e7eb',
                                cursor: 'pointer'
                            }} onClick={() => togglePassThroughCategory('withPredictions')}>
                                <input
                                    type="checkbox"
                                    checked={filters.passThroughCategory.withPredictions}
                                    onChange={() => {}}
                                    id="pt-predictions"
                                />
                                <label htmlFor="pt-predictions" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '3px',
                                        backgroundColor: '#10b981'
                                    }}></div>
                                    With Predictions
                                </label>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: filters.passThroughCategory.gpsIssues ? '#f0fdf4' : 'white',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: filters.passThroughCategory.gpsIssues ? '#86efac' : '#e5e7eb',
                                cursor: 'pointer'
                            }} onClick={() => togglePassThroughCategory('gpsIssues')}>
                                <input
                                    type="checkbox"
                                    checked={filters.passThroughCategory.gpsIssues}
                                    onChange={() => {}}
                                    id="pt-gps"
                                />
                                <label htmlFor="pt-gps" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '3px',
                                        backgroundColor: '#f59e0b'
                                    }}></div>
                                    GPS Issues
                                </label>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: filters.passThroughCategory.noGreen ? '#f0fdf4' : 'white',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: filters.passThroughCategory.noGreen ? '#86efac' : '#e5e7eb',
                                cursor: 'pointer'
                            }} onClick={() => togglePassThroughCategory('noGreen')}>
                                <input
                                    type="checkbox"
                                    checked={filters.passThroughCategory.noGreen}
                                    onChange={() => {}}
                                    id="pt-nogreen"
                                />
                                <label htmlFor="pt-nogreen" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '3px',
                                        backgroundColor: '#dc2626'
                                    }}></div>
                                    No Green Phase
                                </label>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: filters.passThroughCategory.other ? '#f0fdf4' : 'white',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: filters.passThroughCategory.other ? '#86efac' : '#e5e7eb',
                                cursor: 'pointer'
                            }} onClick={() => togglePassThroughCategory('other')}>
                                <input
                                    type="checkbox"
                                    checked={filters.passThroughCategory.other}
                                    onChange={() => {}}
                                    id="pt-other"
                                />
                                <label htmlFor="pt-other" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '3px',
                                        backgroundColor: '#9ca3af'
                                    }}></div>
                                    Other
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Intersection Filter Button */}
                <div style={{
                    flex: 1,
                    minWidth: '250px',
                    backgroundColor: '#f9fafb',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            marginBottom: expandedSections.intersections ? '12px' : '0'
                        }}
                        onClick={() => toggleSection('intersections')}
                    >
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                            Intersections
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {Object.values(filters.selectedIntersections).filter(Boolean).length}/{Object.keys(filters.selectedIntersections).length}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{
                                width: '20px',
                                height: '20px',
                                transform: expandedSections.intersections ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                            }}>
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    {expandedSections.intersections && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <button
                                    onClick={() => toggleAllIntersections(true)}
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        backgroundColor: '#e0f2fe',
                                        color: '#0284c7',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => toggleAllIntersections(false)}
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        backgroundColor: '#fee2e2',
                                        color: '#dc2626',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Deselect All
                                </button>
                            </div>

                            <div style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                padding: '8px',
                                backgroundColor: 'white',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb'
                            }}>
                                {Object.entries(intersections).map(([intId, intersection]) => (
                                    <div
                                        key={intId}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '6px 8px',
                                            borderBottom: '1px solid #f3f4f6',
                                            backgroundColor: filters.selectedIntersections[intId] ? '#f0f9ff' : '#fff1f2',
                                            cursor: 'pointer',
                                            borderRadius: '4px',
                                            marginBottom: '4px'
                                        }}
                                        onClick={() => toggleIntersection(intId)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={filters.selectedIntersections[intId] || false}
                                            onChange={() => {}}
                                            id={`int-${intId}`}
                                        />
                                        <label
                                            htmlFor={`int-${intId}`}
                                            style={{
                                                flex: 1,
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {intersection.name}
                                        </label>
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            backgroundColor: '#f3f4f6',
                                            padding: '1px 6px',
                                            borderRadius: '9999px'
                                        }}>
                                            {intersection.passThroughs?.length || 0}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Reset Button */}
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                        onClick={resetFilters}
                        style={{
                            backgroundColor: '#e5e7eb',
                            color: '#4b5563',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                            <path fillRule="evenodd" d="M10 4.5c1.215 0 2.417.055 3.604.162a.68.68 0 01.615.597c.124 1.038.208 2.088.25 3.15l-1.689-1.69a.75.75 0 00-1.06 1.061l2.999 3a.75.75 0 001.06 0l3.001-3a.75.75 0 10-1.06-1.06l-1.748 1.747a41.31 41.31 0 00-.264-3.386 2.18 2.18 0 00-1.97-1.913 41.512 41.512 0 00-7.477 0 2.18 2.18 0 00-1.969 1.913 41.16 41.16 0 00-.16 1.61.75.75 0 101.495.12c.041-.52.093-1.038.154-1.552a.68.68 0 01.615-.597A40.012 40.012 0 0110 4.5zM5.281 9.22a.75.75 0 00-1.06 0l-3.001 3a.75.75 0 101.06 1.06l1.748-1.747c.042 1.141.13 2.27.264 3.386a2.18 2.18 0 001.97 1.913 41.533 41.533 0 007.477 0 2.18 2.18 0 001.969-1.913c.064-.534.117-1.071.16-1.61a.75.75 0 10-1.495-.12c-.041.52-.093 1.037-.154 1.552a.68.68 0 01-.615.597 40.013 40.013 0 01-7.208 0 .68.68 0 01-.615-.597 39.785 39.785 0 01-.25-3.15l1.689 1.69a.75.75 0 001.06-1.061l-2.999-3z" clipRule="evenodd" />
                        </svg>
                        Reset Filters
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GlobalFilteringSection;