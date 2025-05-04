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

const GLOSADashboard = () => {
    const { intersections, loading, error } = useGlosaData();
    const [selectedPassIndex, setSelectedPassIndex] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Find the currently selected pass-through object
    const selectedPass = useMemo(() => {
        if (selectedPassIndex === null || !intersections) {
            return null;
        }
        for (const intersectionId in intersections) {
            const found = intersections[intersectionId].passThroughs.find(
                pass => pass.passIndex === selectedPassIndex
            );
            if (found) return found;
        }
        return null;
    }, [selectedPassIndex, intersections]);

    // Effect to select the first pass-through by default when data loads
    useEffect(() => {
        if (!loading && !error && selectedPassIndex === null && Object.keys(intersections).length > 0) {
            const firstIntersectionId = Object.keys(intersections)[0];
            if (intersections[firstIntersectionId]?.passThroughs?.length > 0) {
                setSelectedPassIndex(intersections[firstIntersectionId].passThroughs[0].passIndex);
            }
        }
    }, [loading, error, intersections, selectedPassIndex]);


    const handleSelectPassThrough = (passIndex) => {
        setSelectedPassIndex(passIndex);
        setActiveTab('overview'); // Reset to overview tab on new selection
    };

    // --- Render Logic ---

    if (loading) {
        return <LoadingIndicator />;
    }

    if (error) {
        return <ErrorDisplay message={error} />;
    }

    if (!intersections || Object.keys(intersections).length === 0) {
        return <NoDataDisplay />;
    }

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f3f4f6' }}> {/* Full height, basic layout */}

            {/* Left Sidebar */}
            <div style={{ width: '350px', minWidth: '300px', borderRight: '1px solid #d1d5db', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
                <IntersectionList
                    intersections={intersections}
                    selectedPassIndex={selectedPassIndex}
                    onSelectPassThrough={handleSelectPassThrough}
                />
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}> {/* Scrollable content */}
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#111827', textAlign: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
                    GLOSA Analysis Dashboard
                </h1>

                {selectedPass ? (
                    <>
                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px', backgroundColor: 'white', borderRadius: '8px 8px 0 0', padding: '0 16px' }}>
                            <TabButton
                                label="Overview"
                                isActive={activeTab === 'overview'}
                                onClick={() => setActiveTab('overview')}
                            />
                            <TabButton
                                label="GLOSA Analysis"
                                isActive={activeTab === 'glosa'}
                                onClick={() => setActiveTab('glosa')}
                            />
                            <TabButton
                                label="Data Table"
                                isActive={activeTab === 'data'}
                                onClick={() => setActiveTab('data')}
                            />
                        </div>

                        {/* Tab content */}
                        <div style={{ backgroundColor: 'white', borderRadius: '0 0 8px 8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)', padding: '24px' }}>
                            {activeTab === 'overview' && <OverviewTab passThrough={selectedPass} />}
                            {activeTab === 'glosa' && <GLOSAAnalysisTab passThrough={selectedPass} />}
                            {activeTab === 'data' && <DataTableTab passThrough={selectedPass} />}
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                        <p style={{ fontSize: '16px', color: '#6b7280' }}>
                            {Object.keys(intersections).length > 0 ? 'Select a pass-through from the list to view details.' : 'No pass-through data found.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GLOSADashboard;