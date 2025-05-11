import React, { useState, useMemo } from 'react';

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

    const [filterExpanded, setFilterExpanded] = useState(true);

    // Active filter count for the UI
    const activeFilterCount = useMemo(() => {
        let count = 0;

        // Count unselected intersections (since default is all selected)
        Object.values(filters.selectedIntersections).forEach(selected => {
            if (!selected) count++;
        });

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

    // Apply the filter and compute filtered data
    const applyFilters = () => {
        const filteredData = {};

        // First, filter by selected intersections
        Object.entries(intersections).forEach(([intId, intersection]) => {
            if (filters.selectedIntersections[intId]) {
                // Make a copy of the intersection with filtered pass-throughs
                const filteredIntersection = {
                    ...intersection,
                    passThroughs: []
                };

                // Filter pass-throughs by movement event availability and category
                intersection.passThroughs.forEach(passThrough => {
                    // Check movement event availability
                    const hasAvailable = Object.values(passThrough.signalGroups || {}).some(
                        sg => sg.hasMovementEvents && !sg.allMovementEventsUnavailable
                    );

                    const hasUnavailable = Object.values(passThrough.signalGroups || {}).some(
                        sg => sg.hasMovementEvents && sg.allMovementEventsUnavailable
                    );

                    const hasNone = Object.values(passThrough.signalGroups || {}).some(
                        sg => !sg.hasMovementEvents
                    );

                    let includeByAvailability = false;

                    if (hasAvailable && filters.movementEventAvailability.available) {
                        includeByAvailability = true;
                    } else if (hasUnavailable && !hasAvailable && filters.movementEventAvailability.unavailable) {
                        includeByAvailability = true;
                    } else if (hasNone && !hasAvailable && !hasUnavailable && filters.movementEventAvailability.none) {
                        includeByAvailability = true;
                    }

                    // Check pass-through category
                    let includeByCategory = false;

                    const summary = passThrough.summary || {};
                    const hasPredictions = summary.predictedSignalGroupsUsed?.length > 0;
                    const hasGPSIssue = summary.possibleGPSMismatch;
                    const hasNoGreen = summary.hasNoPredictedGreensWithAvailableEvents && !hasGPSIssue;

                    if (hasPredictions && filters.passThroughCategory.withPredictions) {
                        includeByCategory = true;
                    } else if (hasGPSIssue && filters.passThroughCategory.gpsIssues) {
                        includeByCategory = true;
                    } else if (hasNoGreen && filters.passThroughCategory.noGreen) {
                        includeByCategory = true;
                    } else if (!hasPredictions && !hasGPSIssue && !hasNoGreen && filters.passThroughCategory.other) {
                        includeByCategory = true;
                    }

                    // Include this pass-through if it passes both filters
                    if (includeByAvailability && includeByCategory) {
                        filteredIntersection.passThroughs.push(passThrough);
                    }
                });

                // Only include intersections that have at least one pass-through after filtering
                if (filteredIntersection.passThroughs.length > 0) {
                    filteredData[intId] = filteredIntersection;
                }
            }
        });

        // Call the parent callback with filtered data
        onFilterChange(filteredData, filters);
    };

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
        onFilterChange(intersections, newFilters); // Reset to all data
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

    // Toggle filter section expansion
    const toggleFilterExpansion = () => {
        setFilterExpanded(prev => !prev);
    };

    return (
        <div style={{
            backgroundColor: '#f9fafb',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                cursor: 'pointer'
            }} onClick={toggleFilterExpansion}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                    Global Filtering
                    {activeFilterCount > 0 && (
                        <span style={{
                            marginLeft: '8px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            borderRadius: '9999px',
                            padding: '2px 8px',
                            fontSize: '12px'
                        }}>
                            {activeFilterCount} active
                        </span>
                    )}
                </h3>
                <div style={{
                    color: '#6b7280',
                    transform: filterExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </div>
            </div>

            {filterExpanded && (
                <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '24px' }}>
                        {/* Intersection Selection */}
                        <div style={{ flex: '1', minWidth: '250px' }}>
                            <h4 style={{
                                fontSize: '14px',
                                fontWeight: '500',
                                marginBottom: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>Intersections</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => toggleAllIntersections(true)}
                                        style={{
                                            fontSize: '12px',
                                            padding: '2px 6px',
                                            backgroundColor: '#f3f4f6',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => toggleAllIntersections(false)}
                                        style={{
                                            fontSize: '12px',
                                            padding: '2px 6px',
                                            backgroundColor: '#f3f4f6',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </h4>
                            <div style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                padding: '8px'
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
                                            backgroundColor: filters.selectedIntersections[intId] ? 'white' : '#f9fafb'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={filters.selectedIntersections[intId] || false}
                                            onChange={() => toggleIntersection(intId)}
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

                        {/* Movement Event Availability */}
                        <div style={{ flex: '1', minWidth: '250px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
                                Movement Event Availability
                            </h4>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                backgroundColor: '#f9fafb',
                                padding: '12px',
                                borderRadius: '4px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={filters.movementEventAvailability.available}
                                        onChange={() => toggleMovementEventAvailability('available')}
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={filters.movementEventAvailability.unavailable}
                                        onChange={() => toggleMovementEventAvailability('unavailable')}
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={filters.movementEventAvailability.none}
                                        onChange={() => toggleMovementEventAvailability('none')}
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
                        </div>

                        {/* Pass-Through Category */}
                        <div style={{ flex: '1', minWidth: '250px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
                                Pass-Through Category
                            </h4>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                backgroundColor: '#f9fafb',
                                padding: '12px',
                                borderRadius: '4px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={filters.passThroughCategory.withPredictions}
                                        onChange={() => togglePassThroughCategory('withPredictions')}
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={filters.passThroughCategory.gpsIssues}
                                        onChange={() => togglePassThroughCategory('gpsIssues')}
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={filters.passThroughCategory.noGreen}
                                        onChange={() => togglePassThroughCategory('noGreen')}
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={filters.passThroughCategory.other}
                                        onChange={() => togglePassThroughCategory('other')}
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
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <button
                                onClick={resetFilters}
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    color: '#4b5563',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Reset Filters
                            </button>
                        </div>
                        <div>
                            <button
                                onClick={applyFilters}
                                style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '8px 16px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalFilteringSection;