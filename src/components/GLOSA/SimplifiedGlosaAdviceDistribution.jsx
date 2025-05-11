// SimplifiedGlosaAdviceDistribution.jsx - Removed local filtering
import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAdviceColor } from '../../utils/chartUtils';

const SimplifiedGlosaAdviceDistribution = ({ intersections, instanceId = 1 }) => {
    // Prepare all GLOSA advice data
    const adviceData = useMemo(() => {
        const aggregated = {};

        Object.values(intersections).forEach(intersection => {
            // Process each pass-through
            (intersection.passThroughs || []).forEach(passThrough => {
                // Process each signal group
                Object.values(passThrough.signalGroups || {}).forEach(sg => {
                    // Process each metric with advice
                    (sg.metrics || []).forEach(metric => {
                        // Skip if no GLOSA advice
                        if (!metric.glosaAdvice) return;

                        // Only consider metrics before passing the intersection
                        // (when distance is positive)
                        if (metric.distance <= 0) return;

                        // Count this advice
                        if (!aggregated[metric.glosaAdvice]) {
                            aggregated[metric.glosaAdvice] = 0;
                        }
                        aggregated[metric.glosaAdvice]++;
                    });
                });
            });
        });

        // Convert to array format for chart
        return Object.entries(aggregated)
            .map(([advice, count]) => ({ advice, count }))
            .sort((a, b) => b.count - a.count);
    }, [intersections]);

    // Custom tooltip for better display
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{label}</p>
                    <p style={{ margin: '0 0 3px 0', color: payload[0].color }}>
                        Count: {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                GLOSA Advice Distribution {instanceId > 1 ? `#${instanceId}` : ''}
            </h3>

            {/* Stats Summary */}
            <div style={{
                backgroundColor: 'white',
                padding: '12px 16px',
                borderRadius: '6px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <div>
                    <span style={{ fontWeight: '500' }}>Total GLOSA Advice Instances:</span>{' '}
                    {adviceData.reduce((sum, item) => sum + item.count, 0)}
                </div>
                <div>
                    <span style={{ fontWeight: '500' }}>Unique Advice Types:</span>{' '}
                    {adviceData.length}
                </div>
            </div>

            {/* The Chart */}
            {adviceData.length > 0 ? (
                <div style={{ height: '400px', backgroundColor: 'white', padding: '16px', borderRadius: '6px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={adviceData}
                            margin={{ top: 20, right: 30, bottom: 70, left: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="advice"
                                angle={-45}
                                textAnchor="end"
                                height={70}
                                interval={0}
                            />
                            <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar
                                dataKey="count"
                                name="Count"
                                // Use a function to color bars based on advice type
                                fill="#3b82f6"
                                shape={(props) => {
                                    // Get color for this advice
                                    const advice = props.payload.advice;
                                    const color = getAdviceColor(advice);
                                    return (
                                        <rect
                                            x={props.x}
                                            y={props.y}
                                            width={props.width}
                                            height={props.height}
                                            fill={color}
                                            strokeWidth={0}
                                        />
                                    );
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    backgroundColor: 'white',
                    borderRadius: '6px'
                }}>
                    <p style={{ color: '#6b7280' }}>No GLOSA advice data found in the current selection.</p>
                </div>
            )}
        </div>
    );
};

export default SimplifiedGlosaAdviceDistribution;