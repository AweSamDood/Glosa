// src/components/GLOSADashboard/GLOSADashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { useGlosaData } from '../../hooks/useGlosaData';
import LoadingIndicator from '../Common/LoadingIndicator';
import ErrorDisplay from '../Common/ErrorDisplay';
import NoDataDisplay from '../Common/NoDataDisplay';
import IntersectionList from '../IntersectionList/IntersectionList';
import TabButton from '../Common/TabButton';
import PassDetailsTab from '../Tabs/PassDetailsTab';
import DataTableTab from '../Tabs/DataTableTab';
import IntersectionTab from '../Tabs/IntersectionTab';
import GeneralOverviewTab from '../Tabs/GeneralOverviewTab';
import SavedPassesPanel from '../SavedPasses/SavedPassesPanel';
import GlobalFilteringSection from '../Filtering/GlobalFilteringSection';
import SavedPassesService from '../../services/SavedPassesService';

const GLOSADashboard = () => {
    const { intersections, loading, error } = useGlosaData();
    const [selectedPassIndex, setSelectedPassIndex] = useState(null);
    const [activeTab, setActiveTab] = useState('general'); // Default to general tab

    // Global filtering state
    const [filteredData, setFilteredData] = useState({});
    const [filteredPassIndices, setFilteredPassIndices] = useState(new Set()); // Track which passes match filters
    const [filterSettings, setFilterSettings] = useState(null);
    const [showFilteredOutItems, setShowFilteredOutItems] = useState(false);
    const [filtersActive, setFiltersActive] = useState(false);
    const [showFilters, setShowFilters] = useState(true);

    // Saved passes state
    const [savedPasses, setSavedPasses] = useState([]);
    const [showSavedPasses, setShowSavedPasses] = useState(true);

    // Load saved passes from localStorage on mount
    useEffect(() => {
        const loadSavedPasses = () => {
            const saved = SavedPassesService.getSavedPasses();
            setSavedPasses(saved);
        };

        loadSavedPasses();
    }, []);

    // Initialize filtered data when intersections load
    useEffect(() => {
        if (!loading && !error && intersections) {
            // Initially, all pass-throughs are included
            const allPassIndices = new Set();
            Object.values(intersections).forEach(intersection => {
                intersection.passThroughs.forEach(pass => {
                    allPassIndices.add(pass.passIndex);
                });
            });

            setFilteredData(intersections);
            setFilteredPassIndices(allPassIndices);
        }
    }, [loading, error, intersections]);

    // Handle filter changes from GlobalFilteringSection
    const handleFilterChange = (newFilteredData, filters, newFilteredPassIndices) => {
        setFilteredData(newFilteredData);
        setFilterSettings(filters);
        setFiltersActive(Object.keys(newFilteredData).length !== Object.keys(intersections).length);

        // Update filtered pass indices if provided
        if (newFilteredPassIndices) {
            setFilteredPassIndices(newFilteredPassIndices);
        }
    };

    // Toggle filters visibility
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // Toggle saved passes panel visibility
    const toggleSavedPasses = () => {
        setShowSavedPasses(!showSavedPasses);
    };

    // Save a pass
    const handleSavePass = (passData) => {
        const savedPass = SavedPassesService.savePass(passData);
        if (savedPass) {
            setSavedPasses(prev => [...prev, savedPass]);
        }
    };

    // Unsave a pass
    const handleUnsavePass = (passId) => {
        // If passId is a number, it's a passIndex; if it's a string, it's a saved pass ID
        const isPassIndex = typeof passId === 'number';

        if (isPassIndex) {
            // Find the saved pass with this passIndex
            const savedPass = savedPasses.find(p => p.passIndex === passId);
            if (savedPass) {
                passId = savedPass.id;
            } else {
                return; // Pass not found
            }
        }

        const removed = SavedPassesService.removeSavedPass(passId);
        if (removed) {
            setSavedPasses(prev => prev.filter(p => p.id !== passId));
        }
    };

    // Update a pass note
    const handleUpdateNote = (passId, note) => {
        const updated = SavedPassesService.updatePassNote(passId, note);
        if (updated) {
            setSavedPasses(prev =>
                prev.map(p => p.id === passId ? { ...p, note } : p)
            );
        }
    };

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
            if (found) {
                // Add intersection information to the pass
                return {
                    ...found,
                    intersectionName: intersections[intersectionId].name,
                    intersectionId: intersectionId
                };
            }
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
        // If on General Overview, switch to pass details when selecting a pass
        if (activeTab === 'general') {
            setActiveTab('pass-details');
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
    const filteredIntersectionCount = Object.keys(filteredData).length;
    const totalIntersectionCount = Object.keys(intersections).length;
    const filteringIsActive = filteredIntersectionCount !== totalIntersectionCount;

    return (
        // Top-level container using flexbox for Sidebar + Main Content layout
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
            {/* Global Filter Bar */}
            <div style={{
                backgroundColor: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: filtersActive ? '12px 24px' : '12px 24px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>
                        GLOSA Analysis Dashboard
                    </h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Filter Toggle Button */}
                        <button
                            onClick={toggleFilters}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: filtersActive ? '#eff6ff' : '#f9fafb',
                                color: filtersActive ? '#1d4ed8' : '#4b5563',
                                borderRadius: '6px',
                                border: 'none',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                                <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
                            </svg>
                            Filters
                            {filtersActive && (
                                <span style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    borderRadius: '9999px',
                                    padding: '1px 8px',
                                    fontSize: '12px'
                                }}>
                                    {`${filteredIntersectionCount}/${totalIntersectionCount}`}
                                </span>
                            )}
                        </button>

                        {/* Saved Passes Toggle Button */}
                        <button
                            onClick={toggleSavedPasses}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: savedPasses.length > 0 ? '#eff6ff' : '#f9fafb',
                                color: savedPasses.length > 0 ? '#1d4ed8' : '#4b5563',
                                borderRadius: '6px',
                                border: 'none',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                                <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
                            </svg>
                            Saved Passes
                            {savedPasses.length > 0 && (
                                <span style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    borderRadius: '9999px',
                                    padding: '1px 8px',
                                    fontSize: '12px'
                                }}>
                                    {savedPasses.length}
                                </span>
                            )}
                        </button>

                        {/* Show dataset name if available */}
                        {import.meta.env.VITE_INSTANCE_NAME && (
                            <div style={{
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                {import.meta.env.VITE_INSTANCE_NAME}
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters Section - Collapsible */}
                {showFilters && (
                    <GlobalFilteringSection
                        intersections={intersections}
                        onFilterChange={handleFilterChange}
                    />
                )}
            </div>

            {/* Main Content Container */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Sidebar: Fixed width, non-shrinking */}
                <div style={{ width: '350px', minWidth: '300px', borderRight: '1px solid #d1d5db', backgroundColor: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <IntersectionList
                        intersections={intersections}
                        filteredData={filteredData}
                        filteredPassIndices={filteredPassIndices}
                        showFilteredOutItems={showFilteredOutItems}
                        setShowFilteredOutItems={setShowFilteredOutItems}
                        filtersActive={filtersActive}
                        selectedPassIndex={selectedPassIndex}
                        onSelectPassThrough={handleSelectPassThrough}
                    />
                </div>

                {/* Main Content Area: Takes remaining space, internal flex column layout */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' /* Prevents this container from scrolling */ }}>
                    {/* Tabs Container */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white', padding: '0 16px', flexShrink: 0 }}>
                        <TabButton label="General Overview" isActive={activeTab === 'general'} onClick={() => handleTabChange('general')} />
                        <TabButton label="Intersection" isActive={activeTab === 'intersection'} onClick={() => handleTabChange('intersection')} />
                        <TabButton label="Pass Details" isActive={activeTab === 'pass-details'} onClick={() => handleTabChange('pass-details')} />
                        <TabButton label="Data Table" isActive={activeTab === 'data'} onClick={() => handleTabChange('data')} />
                    </div>

                    {/* Scrollable Content Area: Takes remaining vertical space, scrolls vertically */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex' }}>
                        <div style={{ flex: 1 }}>
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
                                    {/* Render active tab content */}
                                    {activeTab === 'general' && <GeneralOverviewTab
                                        intersections={intersections}
                                        filteredData={filteredData}
                                    />}
                                    {activeTab === 'intersection' && <IntersectionTab
                                        intersection={selectedIntersection}
                                    />}
                                    {activeTab === 'pass-details' && <PassDetailsTab
                                        passThrough={selectedPass}
                                        savedPasses={savedPasses}
                                        onSavePass={handleSavePass}
                                        onUnsavePass={handleUnsavePass}
                                    />}
                                    {activeTab === 'data' && selectedPass && <DataTableTab
                                        passThrough={selectedPass}
                                    />}

                                    {/* Show message if pass-through is needed but not selected */}
                                    {(activeTab !== 'intersection' && activeTab !== 'general' && !selectedPass) && (
                                        <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                                            <p style={{ fontSize: '16px', color: '#6b7280' }}>Select a pass-through from the list to view details.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Saved Passes Panel - shown conditionally */}
                        {showSavedPasses && (
                            <SavedPassesPanel
                                savedPasses={savedPasses}
                                onSelectPass={handleSelectPassThrough}
                                onUpdateNote={handleUpdateNote}
                                onRemovePass={handleUnsavePass}
                                selectedPassIndex={selectedPassIndex}
                            />
                        )}
                    </div> {/* End Scrollable Content Area */}
                </div> {/* End Main Content Area */}
            </div> {/* End Main Content Container */}
        </div> // End Top Level Flex Container
    );
};

export default GLOSADashboard;