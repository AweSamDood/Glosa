import React, {useMemo, useState, useRef} from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import SimplifiedGlosaAdviceDistribution from '../GLOSA/SimplifiedGlosaAdviceDistribution';
import SimplifiedDistanceSegmentedGlosaAnalysis from '../GLOSA/SimplifiedDistanceSegmentedGlosaAnalysis';
import GlosaAdviceSimulationAnalysis from '../GLOSA/GlosaAdviceSimulationAnalysis';
import GlosaMissedOpportunitiesAnalysis from "../GLOSA/GlosaMissedOpportunitiesAnalysis.jsx";
import GreenChangeHistogram from '../GLOSA/GreenChangeHistogram.jsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const GeneralOverviewTab = ({intersections, filteredData = {}}) => {
    // Toggle for Advanced Analysis section
    const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
    // Ref for the content to export to PDF
    const contentRef = useRef(null);
    // Loading state for PDF export
    const [exportingPdf, setExportingPdf] = useState(false);

    // Function to handle PDF export
    const handleExportPDF = async () => {
        if (!contentRef.current) return;

        try {
            setExportingPdf(true);

            // Create a notification/toast for the user
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = '#3b82f6';
            notification.style.color = 'white';
            notification.style.padding = '12px 24px';
            notification.style.borderRadius = '8px';
            notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            notification.style.zIndex = '9999';
            notification.textContent = 'Generating PDF... This may take a moment.';
            document.body.appendChild(notification);

            // Temporarily expand advanced analysis if it's hidden
            const wasAdvancedHidden = !showAdvancedAnalysis;
            if (wasAdvancedHidden) {
                setShowAdvancedAnalysis(true);
                // Wait for the state to update and components to render
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Get the height of the element
            const content = contentRef.current;
            const canvas = await html2canvas(content, {
                scale: 1.5, // Higher scale for better quality
                useCORS: true, // To handle external images
                logging: false,
                allowTaint: true,
                scrollY: -window.scrollY, // To handle scrolling
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.offsetHeight
            });

            const imgData = canvas.toDataURL('image/png');

            // Calculate the PDF dimensions to match the aspect ratio
            const imgWidth = 210; // A4 width in mm (210mm × 297mm)
            const pageHeight = 297; // A4 height in mm
            const imgHeight = canvas.height * imgWidth / canvas.width;

            const pdf = new jsPDF('p', 'mm', 'a4');

            // Split into multiple pages if the content is too long
            let heightLeft = imgHeight;
            let position = 0;
            let page = 1;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                page++;
            }

            // Save the PDF
            pdf.save('GLOSA_Analysis_Overview.pdf');

            // Return advanced analysis section to its previous state
            if (wasAdvancedHidden) {
                setShowAdvancedAnalysis(false);
            }

            // Update notification
            notification.style.backgroundColor = '#10b981';
            notification.textContent = 'PDF exported successfully!';

            // Remove notification after 3 seconds
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            // Show error notification
            const errorNotification = document.createElement('div');
            errorNotification.style.position = 'fixed';
            errorNotification.style.bottom = '20px';
            errorNotification.style.left = '50%';
            errorNotification.style.transform = 'translateX(-50%)';
            errorNotification.style.backgroundColor = '#ef4444';
            errorNotification.style.color = 'white';
            errorNotification.style.padding = '12px 24px';
            errorNotification.style.borderRadius = '8px';
            errorNotification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            errorNotification.style.zIndex = '9999';
            errorNotification.textContent = 'Failed to export PDF. Please try again.';
            document.body.appendChild(errorNotification);

            // Remove error notification after 3 seconds
            setTimeout(() => {
                document.body.removeChild(errorNotification);
            }, 3000);
        } finally {
            setExportingPdf(false);
        }
    };

    // Compute aggregated statistics for the overview
    // Compute aggregated statistics for the overview
    const stats = useMemo(() => {
        if (!intersections || Object.keys(intersections).length === 0) {
            return {
                totalIntersections: 0,
                totalPasses: 0,
                timeRange: {start: null, end: null},
                passesByIntersection: [],
                totalGreenIntervalChanges: 0,
                greenChangeTypes: {lostGreen: 0, gotGreen: 0},
                signalGroupStats: {
                    totalSignalGroups: 0,
                    glosaAdviceDistribution: {}
                },
                intersectionStability: [],
                // Make sure greenChangeMagnitudes is initialized
                greenChangeMagnitudes: {
                    earlierGreenStart: [],
                    extendedGreenEnd: [],
                    laterGreenStart: [],
                    shortenedGreenEnd: []
                }
            };
        }

        const aggregatedStats = {
            totalIntersections: Object.keys(intersections).length,
            totalPasses: 0,
            passesByIntersection: [],
            timeRange: {
                start: new Date(),
                end: new Date(0) // Oldest possible date
            },
            totalGreenIntervalChanges: 0,
            greenChangeTypes: {lostGreen: 0, gotGreen: 0},
            gpsIssueCount: 0,
            noGreenWarningCount: 0,
            withPredictionsCount: 0,
            signalGroupStats: {
                totalSignalGroups: 0,
                signalGroupNames: new Set(),
                movementEventAvailability: {available: 0, unavailable: 0, none: 0},
                glosaAdviceDistribution: {}
            },
            intersectionStability: [],
            // Initialize greenChangeMagnitudes here
            greenChangeMagnitudes: {
                earlierGreenStart: [],
                extendedGreenEnd: [],
                laterGreenStart: [],
                shortenedGreenEnd: []
            }
        };

        console.log("Initialized greenChangeMagnitudes in stats:");

        // Process each intersection
        Object.values(intersections).forEach(intersection => {
            const passThroughs = intersection.passThroughs || [];
            const passCount = passThroughs.length;

            // Add to total passes
            aggregatedStats.totalPasses += passCount;

            // Add to passes by intersection chart data
            aggregatedStats.passesByIntersection.push({
                name: intersection.name,
                passes: passCount,
                id: intersection.id
            });

            // Update time range
            if (intersection.summary?.timeRange) {
                if (intersection.summary.timeRange.start &&
                    intersection.summary.timeRange.start < aggregatedStats.timeRange.start) {
                    aggregatedStats.timeRange.start = new Date(intersection.summary.timeRange.start);
                }
                if (intersection.summary.timeRange.end &&
                    intersection.summary.timeRange.end > aggregatedStats.timeRange.end) {
                    aggregatedStats.timeRange.end = new Date(intersection.summary.timeRange.end);
                }
            }

            // Process green interval changes
            if (intersection.summary?.greenIntervalChanges) {
                aggregatedStats.totalGreenIntervalChanges += intersection.summary.greenIntervalChanges;
            }

            // Process green change types
            if (intersection.summary?.greenChangeTypes) {
                aggregatedStats.greenChangeTypes.lostGreen +=
                    intersection.summary.greenChangeTypes.lostGreen || 0;
                aggregatedStats.greenChangeTypes.gotGreen +=
                    intersection.summary.greenChangeTypes.gotGreen || 0;
            }

            // Collect green change magnitudes
            if (intersection.summary?.greenChangeMagnitudes) {
                Object.entries(intersection.summary.greenChangeMagnitudes).forEach(([type, values]) => {
                    if (Array.isArray(values) && values.length > 0) {
                        console.log(`Found ${values.length} ${type} magnitudes in intersection ${intersection.name}`);
                        aggregatedStats.greenChangeMagnitudes[type] =
                            aggregatedStats.greenChangeMagnitudes[type].concat(values);
                    }
                });
            }

            // Process warning counts
            if (intersection.summary?.predictionStatistics) {
                const predStats = intersection.summary.predictionStatistics;
                aggregatedStats.gpsIssueCount += predStats.passThroughsWithGPSMismatch || 0;
                aggregatedStats.noGreenWarningCount += predStats.passThroughsWithNoGreenWarning || 0;
                aggregatedStats.withPredictionsCount += predStats.passThroughsWithPredictions || 0;
            }

            // Check for movement event availability
            let hasMovementEvents = false;
            let hasAvailableMovementEvents = false;

            // Process signal group stats for movement events
            Object.entries(intersection.summary?.signalGroupAnalysis || {}).forEach(([sgName, data]) => {
                // Count unique signal groups
                aggregatedStats.signalGroupStats.signalGroupNames.add(sgName);

                // Process movement event availability
                if (data.movementEventAvailability) {
                    aggregatedStats.signalGroupStats.movementEventAvailability.available +=
                        data.movementEventAvailability.available || 0;
                    aggregatedStats.signalGroupStats.movementEventAvailability.unavailable +=
                        data.movementEventAvailability.unavailable || 0;
                    aggregatedStats.signalGroupStats.movementEventAvailability.none +=
                        data.movementEventAvailability.none || 0;

                    // Check if this signal group has movement events
                    if (data.movementEventAvailability.available > 0 ||
                        data.movementEventAvailability.unavailable > 0) {
                        hasMovementEvents = true;

                        // Check if it has available movement events
                        if (data.movementEventAvailability.available > 0) {
                            hasAvailableMovementEvents = true;
                        }
                    }
                }

                // Process GLOSA advice
                Object.entries(data.glosaAdviceStats || {}).forEach(([advice, count]) => {
                    if (!aggregatedStats.signalGroupStats.glosaAdviceDistribution[advice]) {
                        aggregatedStats.signalGroupStats.glosaAdviceDistribution[advice] = 0;
                    }
                    aggregatedStats.signalGroupStats.glosaAdviceDistribution[advice] += count;
                });
            });

            // Add to intersection stability data if it has available movement events
            if (hasAvailableMovementEvents) {
                // Calculate stability metrics
                const greenChanges = intersection.summary?.greenIntervalChanges || 0;
                const passCount = intersection.passThroughs?.length || 0;
                const changeRatio = passCount > 0 ? greenChanges / passCount : 0;

                aggregatedStats.intersectionStability.push({
                    name: intersection.name,
                    id: intersection.id,
                    greenChanges: greenChanges,
                    passes: passCount,
                    stabilityScore: 1 - (changeRatio > 1 ? 1 : changeRatio), // Normalize between 0-1
                    changeRatio: changeRatio
                });
            }
        });

        // Calculate total signal groups
        aggregatedStats.signalGroupStats.totalSignalGroups =
            aggregatedStats.signalGroupStats.signalGroupNames.size;

        // Sort passes by intersection
        aggregatedStats.passesByIntersection.sort((a, b) => b.passes - a.passes);

        // Sort intersection stability from most stable to least stable
        aggregatedStats.intersectionStability.sort((a, b) => {
            // First by stability score (higher is more stable)
            if (b.stabilityScore !== a.stabilityScore) {
                return b.stabilityScore - a.stabilityScore;
            }
            // Then by number of passes (more passes is more significant)
            return b.passes - a.passes;
        });

        return aggregatedStats;
    }, [intersections]);

    // Format time range for display
    const formattedTimeRange = useMemo(() => {
        if (!stats.timeRange.start || !stats.timeRange.end) {
            return 'No data';
        }
        return `${stats.timeRange.start.toLocaleString()} - ${stats.timeRange.end.toLocaleString()}`;
    }, [stats.timeRange]);

    // Prepare data for charts
    const passStatusData = useMemo(() => {
        return [
            {name: 'With Predictions', value: stats.withPredictionsCount, color: '#10b981'}, // green
            {name: 'GPS Issues', value: stats.gpsIssueCount, color: '#f59e0b'}, // yellow
            {name: 'No Green', value: stats.noGreenWarningCount - stats.gpsIssueCount, color: '#dc2626'}, // red
            {
                name: 'Other',
                value: stats.totalPasses - stats.withPredictionsCount - stats.noGreenWarningCount,
                color: '#9ca3af'
            } // gray
        ].filter(item => item.value > 0);
    }, [stats]);

    const movementEventData = useMemo(() => {
        const movAvail = stats.signalGroupStats.movementEventAvailability;
        const total = movAvail.available + movAvail.unavailable + movAvail.none;

        return [
            {name: 'Available', value: movAvail.available, color: '#10b981'}, // green
            {name: 'Unavailable', value: movAvail.unavailable, color: '#9ca3af'}, // gray
            {name: 'None', value: movAvail.none, color: '#ef4444'} // red
        ].filter(item => item.value > 0);
    }, [stats]);

    const greenChangeData = useMemo(() => {
        return [
            {name: 'Lost Green', value: stats.greenChangeTypes.lostGreen, color: '#ef4444'}, // red
            {name: 'Got Green', value: stats.greenChangeTypes.gotGreen, color: '#10b981'} // green
        ].filter(item => item.value > 0);
    }, [stats]);

    const glosaAdviceData = useMemo(() => {
        return Object.entries(stats.signalGroupStats.glosaAdviceDistribution)
            .map(([advice, count]) => ({
                advice,
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Take top 10
    }, [stats]);

    // Prepare stability data for the chart
    const stabilityChartData = useMemo(() => {
        return stats.intersectionStability.map(int => ({
            name: int.name,
            stabilityScore: Math.round(int.stabilityScore * 100), // Convert to percentage
            greenChanges: int.greenChanges,
            passes: int.passes,
            changeRatio: int.changeRatio.toFixed(2)
        }));
    }, [stats.intersectionStability]);

    // Colors for charts
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#9ca3af'];

    // Toggle Advanced Analysis section
    const toggleAdvancedAnalysis = () => {
        setShowAdvancedAnalysis(prev => !prev);
    };

    // Determine which data source to use for the advanced analysis
    // Use filtered data if there are filters applied, otherwise use all intersections
    const dataToUse = Object.keys(filteredData).length > 0 ? filteredData : intersections;

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: '24px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <h2 style={{fontSize: '24px', fontWeight: '600', margin: 0}}>
                    GLOSA Analysis Overview
                </h2>

                {/* Export to PDF button */}
                <button
                    onClick={handleExportPDF}
                    disabled={exportingPdf}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: exportingPdf ? '#e5e7eb' : '#3b82f6',
                        color: exportingPdf ? '#9ca3af' : 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: exportingPdf ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                >
                    {/* PDF icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    {exportingPdf ? 'Exporting PDF...' : 'Export as PDF'}
                </button>
            </div>

            {/* Content to be exported as PDF */}
            <div ref={contentRef}>
                {/* Key Statistics */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '32px'
                }}>
                    <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                        <h3 style={{fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>Total
                            Intersections</h3>
                        <p style={{fontSize: '24px', fontWeight: '600', color: '#111827'}}>{stats.totalIntersections}</p>
                    </div>

                    <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                        <h3 style={{fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>Total
                            Pass-Throughs</h3>
                        <p style={{fontSize: '24px', fontWeight: '600', color: '#111827'}}>{stats.totalPasses}</p>
                    </div>

                    <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                        <h3 style={{fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>Signal
                            Groups</h3>
                        <p style={{
                            fontSize: '24px',
                            fontWeight: '600',
                            color: '#111827'
                        }}>{stats.signalGroupStats.totalSignalGroups}</p>
                    </div>

                    <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                        <h3 style={{fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>Time
                            Range</h3>
                        <p style={{fontSize: '14px', color: '#111827'}}>{formattedTimeRange}</p>
                    </div>
                </div>

                {/* Advanced Analysis Section */}
                <div style={{marginBottom: '32px'}}>
                    <button
                        onClick={toggleAdvancedAnalysis}
                        style={{
                            width: '100%',
                            textAlign: 'left',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: 'none',
                            fontWeight: '600',
                            fontSize: '18px',
                            color: '#111827',
                            cursor: 'pointer',
                            marginBottom: showAdvancedAnalysis ? '16px' : '0'
                        }}
                    >
                        <span>Advanced GLOSA Analysis</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            style={{
                                width: '20px',
                                height: '20px',
                                transform: showAdvancedAnalysis ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                            }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                        </svg>
                    </button>

                    {showAdvancedAnalysis && (
                        <>
                            {/* Data Source Info */}
                            {Object.keys(filteredData).length > 0 && Object.keys(filteredData).length < Object.keys(intersections).length && (
                                <div style={{
                                    backgroundColor: '#f0f9ff',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    marginBottom: '24px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <span
                                            style={{fontWeight: '500'}}>Analysis using filtered data:</span> {Object.keys(filteredData).length} intersections
                                        with {
                                        Object.values(filteredData).reduce((sum, int) => sum + int.passThroughs.length, 0)
                                    } pass-throughs
                                    </div>
                                </div>
                            )}

                            {/* Green Change Histogram - Moved to Advanced Analysis */}
                            {Object.values(dataToUse).some(intersection =>
                                intersection.summary?.greenIntervalChanges > 0) && (
                                <GreenChangeHistogram
                                    greenChangeMagnitudes={Object.values(dataToUse).reduce((allMagnitudes, intersection) => {
                                        // Combine magnitudes from all filtered intersections
                                        if (intersection.summary?.greenChangeMagnitudes) {
                                            Object.entries(intersection.summary.greenChangeMagnitudes).forEach(([type, values]) => {
                                                if (Array.isArray(values) && values.length > 0) {
                                                    if (!allMagnitudes[type]) {
                                                        allMagnitudes[type] = [];
                                                    }
                                                    allMagnitudes[type] = allMagnitudes[type].concat(values);
                                                }
                                            });
                                        }
                                        return allMagnitudes;
                                    }, {
                                        earlierGreenStart: [],
                                        extendedGreenEnd: [],
                                        laterGreenStart: [],
                                        shortenedGreenEnd: []
                                    })}
                                />
                            )}

                            {/* GLOSA Advice Simulation Analysis */}
                            <GlosaAdviceSimulationAnalysis
                                intersections={dataToUse}
                            />

                            <GlosaMissedOpportunitiesAnalysis
                                intersections={dataToUse}
                            />

                            {/* Existing GLOSA Analysis Components */}
                            <div style={{marginBottom: '32px'}}>
                                <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>GLOSA Advice
                                    Analysis</h3>

                                {/* First GLOSA Distribution */}
                                <SimplifiedGlosaAdviceDistribution
                                    intersections={dataToUse}
                                    instanceId={1}
                                />

                                {/* Second GLOSA Distribution (optional) */}
                                <SimplifiedGlosaAdviceDistribution
                                    intersections={dataToUse}
                                    instanceId={2}
                                />

                                {/* Distance-Segmented Analysis */}
                                <SimplifiedDistanceSegmentedGlosaAnalysis
                                    intersections={dataToUse}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Rest of the component (unchanged) */}
                {/* Intersection Stability */}
                {stabilityChartData.length > 0 && (
                    <div style={{marginBottom: '32px'}}>
                        <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Intersection Stability (With
                            Available Movement Events)</h3>
                        <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                            <p style={{marginBottom: '16px', color: '#4b5563'}}>
                                Stability is based on the frequency of green interval changes. Higher scores indicate more
                                stable intersections.
                                Only intersections with available movement events are shown.
                            </p>
                            <div style={{height: '400px'}}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={stabilityChartData}
                                        margin={{top: 20, right: 30, left: 20, bottom: 100}}
                                        layout="vertical"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            label={{value: 'Stability Score (%)', position: 'insideBottom', offset: -5}}
                                        />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={150}
                                            tick={{fontSize: 12}}
                                        />
                                        <Tooltip
                                            formatter={(value, name, props) => {
                                                if (name === 'stabilityScore') {
                                                    return [`${value}%`, 'Stability Score'];
                                                }
                                                return [value, name];
                                            }}
                                            labelFormatter={(label) => `Intersection: ${label}`}
                                            content={({active, payload}) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div style={{
                                                            backgroundColor: 'white',
                                                            padding: '10px',
                                                            border: '1px solid #ccc',
                                                            borderRadius: '4px'
                                                        }}>
                                                            <p style={{fontWeight: 'bold', margin: '0 0 5px 0'}}>
                                                                {data.name}
                                                            </p>
                                                            <p style={{margin: '0 0 3px 0', color: '#10b981'}}>
                                                                Stability Score: {data.stabilityScore}%
                                                            </p>
                                                            <p style={{margin: '0 0 3px 0'}}>
                                                                Passes: {data.passes}
                                                            </p>
                                                            <p style={{margin: '0 0 3px 0', color: '#ef4444'}}>
                                                                Green Changes: {data.greenChanges}
                                                            </p>
                                                            <p style={{margin: '0', color: '#4b5563', fontSize: '12px'}}>
                                                                Changes per Pass: {data.changeRatio}
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar
                                            dataKey="stabilityScore"
                                            name="Stability Score"
                                            fill="#10b981"
                                            animationDuration={1500}
                                            label={{
                                                position: 'right',
                                                formatter: (value) => `${value}%`,
                                                fontSize: 12
                                            }}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Intersections List */}
                <div style={{marginBottom: '32px'}}>
                    <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Intersections</h3>
                    <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '12px'
                        }}>
                            {Object.values(intersections).map(intersection => (
                                <div
                                    key={intersection.id}
                                    style={{
                                        padding: '12px',
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}
                                >
                                    <div style={{fontWeight: '600', marginBottom: '4px'}}>{intersection.name}</div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '14px',
                                        color: '#4b5563'
                                    }}>
                                        <span>ID: {intersection.id}</span>
                                        <span>{intersection.passThroughs?.length || 0} passes</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Passes By Intersection Chart */}
                <div style={{marginBottom: '32px'}}>
                    <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Passes by Intersection</h3>
                    <div style={{height: '400px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.passesByIntersection}
                                margin={{top: 20, right: 30, left: 20, bottom: 100}}
                            >
                                <CartesianGrid strokeDasharray="3 3"/>
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    interval={0}
                                    height={100}
                                />
                                <YAxis label={{value: 'Number of Passes', angle: -90, position: 'insideLeft'}}/>
                                <Tooltip/>
                                <Bar dataKey="passes" fill="#3b82f6" name="Passes"/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Green Interval Changes */}
                <div style={{marginBottom: '32px'}}>
                    <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Green Interval Changes</h3>
                    <div
                        style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px'}}>
                        <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                            <h4 style={{fontSize: '16px', fontWeight: '500', marginBottom: '12px'}}>Total Changes</h4>
                            <p style={{
                                fontSize: '24px',
                                fontWeight: '600',
                                color: stats.totalGreenIntervalChanges > 0 ? '#f97316' : '#10b981'
                            }}>
                                {stats.totalGreenIntervalChanges}
                            </p>
                            {stats.totalGreenIntervalChanges > 0 && (
                                <div style={{marginTop: '12px'}}>
                                    <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
                                        {stats.greenChangeTypes.lostGreen > 0 && (
                                            <span style={{
                                                fontSize: '14px',
                                                color: 'white',
                                                backgroundColor: '#ef4444',
                                                padding: '4px 10px',
                                                borderRadius: '16px'
                                            }}>
                            Lost Green: {stats.greenChangeTypes.lostGreen}
                        </span>
                                        )}
                                        {stats.greenChangeTypes.gotGreen > 0 && (
                                            <span style={{
                                                fontSize: '14px',
                                                color: 'white',
                                                backgroundColor: '#22c55e',
                                                padding: '4px 10px',
                                                borderRadius: '16px'
                                            }}>
                            Got Green: {stats.greenChangeTypes.gotGreen}
                        </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {greenChangeData.length > 0 && (
                            <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                                <h4 style={{fontSize: '16px', fontWeight: '500', marginBottom: '12px'}}>Change Type
                                    Distribution</h4>
                                <div style={{height: '250px'}}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={greenChangeData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={90}
                                                paddingAngle={2}
                                                dataKey="value"
                                                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                            >
                                                {greenChangeData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color}/>
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [value, 'Count']}/>
                                            <Legend verticalAlign="bottom"/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pass Status Distribution */}
                <div style={{marginBottom: '32px'}}>
                    <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Pass Status Distribution</h3>
                    <div
                        style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px'}}>
                        <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                            <h4 style={{fontSize: '16px', fontWeight: '500', marginBottom: '12px'}}>Status Counts</h4>
                            <ul style={{listStyleType: 'none', padding: '0'}}>
                                <li style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #e5e7eb'
                                }}>
                                    <span>Passes with Predictions:</span>
                                    <span style={{fontWeight: '500', color: '#10b981'}}>{stats.withPredictionsCount}</span>
                                </li>
                                <li style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #e5e7eb'
                                }}>
                                    <span>Passes with GPS Issues:</span>
                                    <span style={{fontWeight: '500', color: '#f59e0b'}}>{stats.gpsIssueCount}</span>
                                </li>
                                <li style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #e5e7eb'
                                }}>
                                    <span>Passes with No Green:</span>
                                    <span style={{
                                        fontWeight: '500',
                                        color: '#ef4444'
                                    }}>{stats.noGreenWarningCount - stats.gpsIssueCount}</span>
                                </li>
                                <li style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0'}}>
                                    <span>Other Passes:</span>
                                    <span
                                        style={{fontWeight: '500'}}>{stats.totalPasses - stats.withPredictionsCount - stats.noGreenWarningCount}</span>
                                </li>
                            </ul>
                        </div>

                        {passStatusData.length > 0 && (
                            <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                                <h4 style={{fontSize: '16px', fontWeight: '500', marginBottom: '12px'}}>Status
                                    Distribution</h4>
                                <div style={{height: '250px'}}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={passStatusData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={90}
                                                paddingAngle={2}
                                                dataKey="value"
                                                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                            >
                                                {passStatusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color}/>
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [value, 'Count']}/>
                                            <Legend verticalAlign="bottom"/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Movement Event Availability */}
                {movementEventData.length > 0 && (
                    <div style={{marginBottom: '32px'}}>
                        <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Movement Event
                            Availability</h3>
                        <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                            <div style={{height: '300px'}}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={movementEventData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                        >
                                            {movementEventData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color}/>
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [value, 'Count']}/>
                                        <Legend verticalAlign="bottom"/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Original GLOSA Advice Distribution - For Backwards Compatibility */}
                {glosaAdviceData.length > 0 && (
                    <div>
                        <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Overall GLOSA Advice
                            Distribution</h3>
                        <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                            <div style={{height: '400px'}}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={glosaAdviceData}
                                        margin={{top: 20, right: 30, left: 20, bottom: 100}}
                                    >
                                        <CartesianGrid strokeDasharray="3 3"/>
                                        <XAxis
                                            dataKey="advice"
                                            angle={-45}
                                            textAnchor="end"
                                            interval={0}
                                            height={100}
                                        />
                                        <YAxis label={{value: 'Count', angle: -90, position: 'insideLeft'}}/>
                                        <Tooltip/>
                                        <Bar dataKey="count" name="Count" fill="#3b82f6"/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GeneralOverviewTab;