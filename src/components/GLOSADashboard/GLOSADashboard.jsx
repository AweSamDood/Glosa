// src/components/GLOSADashboard/GLOSADashboard.jsx
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
import IntersectionTab from '../Tabs/IntersectionTab';
import GeneralOverviewTab from '../Tabs/GeneralOverviewTab';

const GLOSADashboard = () => {
    const { intersections, loading, error } = useGlosaData();
    const [selectedPassIndex, setSelectedPassIndex] = useState(null);
    const [activeTab, setActiveTab] = useState('general'); // Changed default to 'general'

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

    // Find the intersection containing the selected pass
    const selectedIntersection = useMemo(() => {
        if (selectedPassIndex === null || !intersections) {
            // If no pass selected, return the first intersection
            const intersectionIds = Object.keys(intersections);
            return intersectionIds.length > 0 ? intersections[intersectionIds[0]] : null;
        }
        // Find intersection containing the selected pass
        for (const intersectionId in intersections) {
            const intersection = intersections[intersectionId];
            const hasPass = intersection?.passThroughs?.some(
                pass => pass.passIndex === selectedPassIndex
            );
            if (hasPass) return intersection;
        }
        return null;
    }, [selectedPassIndex, intersections]);

    // Effect for selecting default pass and handling deselection
    useEffect(() => {
        const intersectionKeys = Object.keys(intersections);
        // Select first pass by default if none is selected and data is loaded
        if (!loading && !error && selectedPassIndex === null && intersectionKeys.length > 0 && activeTab !== 'general') {
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
    }, [loading, error, intersections, selectedPassIndex, selectedPass, activeTab]);


    const handleSelectPassThrough = (passIndex) => {
        setSelectedPassIndex(passIndex);
        // If on General Overview, switch to pass overview when selecting a pass
        if (activeTab === 'general') {
            setActiveTab('overview');
        }
    };

    // Handle tab switching - clear selection for general overview
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
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
                    ) : (
                        // Render tabs and content
                        <>
                            {/* Tabs Container */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px', backgroundColor: 'white', borderRadius: '8px 8px 0 0', padding: '0 16px', flexShrink: 0 }}>
                                <TabButton label="General Overview" isActive={activeTab === 'general'} onClick={() => handleTabChange('general')} />
                                <TabButton label="Intersection" isActive={activeTab === 'intersection'} onClick={() => handleTabChange('intersection')} />
                                <TabButton label="Pass Overview" isActive={activeTab === 'overview'} onClick={() => handleTabChange('overview')} />
                                <TabButton label="GLOSA Analysis" isActive={activeTab === 'glosa'} onClick={() => handleTabChange('glosa')} />
                                <TabButton label="Data Table" isActive={activeTab === 'data'} onClick={() => handleTabChange('data')} />
                            </div>

                            {/* Render active tab content */}
                            {activeTab === 'general' && <GeneralOverviewTab intersections={intersections} />}
                            {activeTab === 'intersection' && <IntersectionTab intersection={selectedIntersection} />}
                            {activeTab === 'overview' && selectedPass && <OverviewTab passThrough={selectedPass} />}
                            {activeTab === 'glosa' && selectedPass && <GLOSAAnalysisTab passThrough={selectedPass} />}
                            {activeTab === 'data' && selectedPass && <DataTableTab passThrough={selectedPass} />}

                            {/* Show message if pass-through is needed but not selected */}
                            {(activeTab !== 'intersection' && activeTab !== 'general' && !selectedPass) && (
                                <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                                    <p style={{ fontSize: '16px', color: '#6b7280' }}>Select a pass-through from the list to view details.</p>
                                </div>
                            )}
                        </>
                    )}
                </div> {/* End Scrollable Content Area */}
            </div> {/* End Main Content Area */}
        </div> // End Top Level Flex Container
    );
};

export default GLOSADashboard;