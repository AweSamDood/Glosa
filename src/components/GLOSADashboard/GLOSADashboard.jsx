// src/components/GLOSADashboard/GLOSADashboard.jsx
// (No functional changes needed for layout based on review - providing full code for completeness)

import { useState, useEffect, useMemo } from 'react';
import { useGlosaData } from '../../hooks/useGlosaData';
import LoadingIndicator from '../Common/LoadingIndicator';
import ErrorDisplay from '../Common/ErrorDisplay';
import NoDataDisplay from '../Common/NoDataDisplay';
import IntersectionList from '../IntersectionList/IntersectionList';
import TabButton from '../Common/TabButton';
import OverviewTab from '../Tabs/OverviewTab';
import GLOSAAnalysisTab from '../Tabs/GLOSAAnalysisTab';
import DataTableTab from '../Tabs/DataTableTab';

const GLOSADashboard = () => {
    const { intersections, loading, error } = useGlosaData();
    const [selectedPassIndex, setSelectedPassIndex] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Memoize finding the selected pass-through object
    const selectedPass = useMemo(() => {
        if (selectedPassIndex === null || !intersections) {
            return null;
        }
        // Iterate through intersections to find the pass-through with the matching index
        for (const intersectionId in intersections) {
            const found = intersections[intersectionId]?.passThroughs?.find(
                pass => pass.passIndex === selectedPassIndex
            );
            if (found) return found;
        }
        return null; // Return null if not found
    }, [selectedPassIndex, intersections]);

    // Effect for selecting default pass and handling deselection
    useEffect(() => {
        const intersectionKeys = Object.keys(intersections);
        // Select first pass by default if none is selected and data is loaded
        if (!loading && !error && selectedPassIndex === null && intersectionKeys.length > 0) {
            const firstIntersectionId = intersectionKeys[0];
            if (intersections[firstIntersectionId]?.passThroughs?.length > 0) {
                setSelectedPassIndex(intersections[firstIntersectionId].passThroughs[0].passIndex);
            }
        }
        // Handle case where the previously selected pass might no longer exist (e.g., data refresh)
        else if (!loading && !error && selectedPassIndex !== null && !selectedPass && intersectionKeys.length > 0) {
            // Reset to the first available pass or null if none exist
            const firstIntersectionId = intersectionKeys[0];
            if (intersections[firstIntersectionId]?.passThroughs?.length > 0) {
                setSelectedPassIndex(intersections[firstIntersectionId].passThroughs[0].passIndex);
            } else {
                setSelectedPassIndex(null); // No passes available at all
            }
        } else if (!loading && !error && intersectionKeys.length === 0) {
            // Handle case where data loaded but is empty
            setSelectedPassIndex(null);
        }
    }, [loading, error, intersections, selectedPassIndex, selectedPass]);


    const handleSelectPassThrough = (passIndex) => {
        setSelectedPassIndex(passIndex);
        setActiveTab('overview'); // Reset tab on new selection
    };

    // --- Render Logic ---

    if (loading) {
        return <LoadingIndicator />;
    }

    if (error) {
        return <ErrorDisplay message={error} />;
    }

    // Determine if there's any data to show
    const hasIntersections = intersections && Object.keys(intersections).length > 0;
    const hasPassThroughs = hasIntersections && Object.values(intersections).some(int => int.passThroughs?.length > 0);

    return (
        // Top-level container using flexbox for Sidebar + Main Content layout
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>

            {/* Left Sidebar: Fixed width, non-shrinking */}
            <div style={{ width: '350px', minWidth: '300px', borderRight: '1px solid #d1d5db', backgroundColor: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <IntersectionList
                    intersections={intersections}
                    selectedPassIndex={selectedPassIndex}
                    onSelectPassThrough={handleSelectPassThrough}
                />
            </div>

            {/* Main Content Area: Takes remaining space, internal flex column layout */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' /* Prevents this container from scrolling */ }}>
                {/* Header: Fixed height */}
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', padding: '20px 24px', color: '#111827', borderBottom: '1px solid #e5e7eb', flexShrink: 0, backgroundColor: 'white' }}>
                    GLOSA Analysis Dashboard
                </h1>

                {/* Scrollable Content Area: Takes remaining vertical space, scrolls vertically */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {!hasIntersections ? (
                        <NoDataDisplay /> // Show no data if intersections object is empty/null
                    ) : !hasPassThroughs ? (
                        // Show message if intersections exist but have no pass-throughs
                        <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                            <p style={{ fontSize: '16px', color: '#6b7280' }}>No pass-throughs recorded for the available intersections.</p>
                        </div>
                    ) : selectedPass ? (
                        // Render tabs and content if a pass-through is selected
                        <>
                            {/* Tabs Container */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px', backgroundColor: 'white', borderRadius: '8px 8px 0 0', padding: '0 16px', flexShrink: 0 }}>
                                <TabButton label="Overview" isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                                <TabButton label="GLOSA Analysis" isActive={activeTab === 'glosa'} onClick={() => setActiveTab('glosa')} />
                                <TabButton label="Data Table" isActive={activeTab === 'data'} onClick={() => setActiveTab('data')} />
                            </div>

                            {/* Render active tab content directly within the scrollable area */}
                            {activeTab === 'overview' && <OverviewTab passThrough={selectedPass} />}
                            {activeTab === 'glosa' && <GLOSAAnalysisTab passThrough={selectedPass} />}
                            {/* DataTableTab needs to manage its own internal scrolling if necessary */}
                            {activeTab === 'data' && <DataTableTab passThrough={selectedPass} />}
                        </>
                    ) : (
                        // Show prompt if there are pass-throughs but none are selected yet
                        <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                            <p style={{ fontSize: '16px', color: '#6b7280' }}>Select a pass-through from the list to view details.</p>
                        </div>
                    )}
                </div> {/* End Scrollable Content Area */}
            </div> {/* End Main Content Area */}
        </div> // End Top Level Flex Container
    );
};

export default GLOSADashboard;