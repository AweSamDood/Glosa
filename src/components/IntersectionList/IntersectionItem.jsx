// src/components/IntersectionList/IntersectionItem.jsx
import React, { useState, useMemo } from 'react';
import PassThroughList from './PassThroughList';

const IntersectionItem = ({
                              intersection,
                              filteredPassIndices = new Set(), // Set of pass indices that match filter criteria
                              selectedPassIndex,
                              onSelectPassThrough,
                              isFilteredOut = false,
                              filtersActive = false
                          }) => {
    // Default to expanded if it contains the selected pass-through
    const initiallyExpanded = intersection.passThroughs.some(p => p.passIndex === selectedPassIndex);
    const [expanded, setExpanded] = useState(initiallyExpanded);

    // Filter pass-throughs based on filteredPassIndices when filters are active
    const visiblePassThroughs = useMemo(() => {
        if (!filtersActive || isFilteredOut) {
            // Show all pass-throughs for filtered-out intersections or when no filtering is active
            return intersection.passThroughs;
        }

        // Only show pass-throughs that match the filter criteria
        return intersection.passThroughs.filter(pass =>
            filteredPassIndices.has(pass.passIndex)
        );
    }, [intersection.passThroughs, filteredPassIndices, filtersActive, isFilteredOut]);

    // Calculate how many passes are filtered out
    const filteredOutCount = intersection.passThroughs.length - visiblePassThroughs.length;

    // Update expansion if selection changes elsewhere
    React.useEffect(() => {
        const containsSelected = intersection.passThroughs.some(p => p.passIndex === selectedPassIndex);
        if (containsSelected && !expanded) {
            setExpanded(true);
        }
    }, [selectedPassIndex, intersection.passThroughs, expanded]);

    const toggleExpanded = () => setExpanded(!expanded);

    // Apply styles based on filtered status
    const itemStyle = {
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#e5e7eb',
        ...(isFilteredOut ? { opacity: 0.8 } : {})
    };

    const headerStyle = {
        padding: '12px 16px',
        fontWeight: '600', // Bolder header
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: isFilteredOut ? '#fef2f2' : '#f9fafb',
        color: isFilteredOut ? '#991b1b' : '#374151',
        borderTopWidth: '1px',
        borderTopStyle: 'solid',
        borderTopColor: '#e5e7eb', // Separator line
    };

    return (
        <div style={itemStyle}>
            <div
                style={headerStyle}
                onClick={toggleExpanded}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onKeyPress={(e) => e.key === 'Enter' && toggleExpanded()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: isFilteredOut ? '#991b1b' : '#4b5563', fontSize: '10px', width: '10px' }}> {/* Arrow indicator */}
                        {expanded ? '▼' : '►'}
                    </span>
                    <span title={`${intersection.name} (ID: ${intersection.id})`}>{intersection.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Show filtered count if any passes are filtered out */}
                    {!isFilteredOut && filtersActive && filteredOutCount > 0 && (
                        <span style={{
                            fontSize: '12px',
                            color: '#be123c',
                            backgroundColor: '#fee2e2',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontWeight: '500'
                        }}>
                            {filteredOutCount} filtered
                        </span>
                    )}
                    <div style={{
                        fontSize: '12px',
                        color: isFilteredOut ? '#991b1b' : '#6b7280',
                        fontWeight: '500',
                        backgroundColor: isFilteredOut ? '#fee2e2' : '#e5e7eb',
                        padding: '2px 8px',
                        borderRadius: '10px'
                    }}>
                        {visiblePassThroughs.length} {visiblePassThroughs.length === 1 ? 'pass' : 'passes'}
                    </div>
                </div>
            </div>

            {expanded && visiblePassThroughs.length > 0 && (
                <PassThroughList
                    passThroughs={visiblePassThroughs}
                    selectedPassIndex={selectedPassIndex}
                    onSelectPassThrough={onSelectPassThrough}
                    isFilteredOut={isFilteredOut}
                />
            )}

            {/* Show message if all passes are filtered out */}
            {expanded && visiblePassThroughs.length === 0 && filteredOutCount > 0 && (
                <div style={{
                    padding: '12px 32px',
                    fontSize: '14px',
                    color: '#6b7280',
                    backgroundColor: '#f9fafb',
                    fontStyle: 'italic'
                }}>
                    All {filteredOutCount} passes filtered out based on current criteria.
                </div>
            )}
        </div>
    );
};

export default IntersectionItem;