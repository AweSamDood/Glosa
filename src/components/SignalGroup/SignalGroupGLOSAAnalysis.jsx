// Signal Group GLOSA Analysis Component
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer, Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

const SignalGroupGLOSAAnalysis = ({ signalGroup }) => {
    const metrics = signalGroup.metrics;

    // Sort metrics by timestamp for proper visualization
    const sortedMetrics = [...metrics].sort((a, b) => a.timestamp - b.timestamp);

    // Calculate ranges for GLOSA parameters
    const timeToGreenRange = metrics.filter(m => m.timeToGreen !== null).map(m => m.timeToGreen);
    const minTravelTimeRange = metrics.filter(m => m.minTravelTime !== null).map(m => m.minTravelTime);
    const maxTravelTimeRange = metrics.filter(m => m.maxTravelTime !== null).map(m => m.maxTravelTime);
    const distanceToStopRange = metrics.filter(m => m.distanceToStop !== null).map(m => m.distanceToStop);
    const secondsToGreenRange = metrics.filter(m => m.secondsToGreen !== null).map(m => m.secondsToGreen);
    const clearanceTimeRange = metrics.filter(m => m.clearanceTime !== null).map(m => m.clearanceTime);

    // Get the primary GLOSA advice
    const primaryAdvice = Object.entries(signalGroup.summary.glosaAdvice)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Prepare data for visualization charts
    const chartData = sortedMetrics.map((metric, index) => {
        // Calculate seconds since the first measurement
        const secondsSinceStart = index === 0 ? 0 :
            (metric.timestamp - sortedMetrics[0].timestamp) / 1000;

        return {
            time: secondsSinceStart,
            timestamp: metric.timestamp,
            distance: metric.distance,
            speed: metric.speed,
            glosaAdvice: metric.glosaAdvice || 'N/A',
            glosaSpeedKph: metric.glosaSpeedKph,
            minTravelTime: metric.minTravelTime,
            maxTravelTime: metric.maxTravelTime,
            secondsToGreen: metric.secondsToGreen,
            greenStartTime: metric.greenStartTime,
            greenEndTime: metric.greenEndTime,
            // Format advice for display
            adviceShort: metric.glosaAdvice ?
                metric.glosaAdvice
                    .replace('none_movement_event_unavailable', 'No MovEvent')
                    .replace('none_ttg_unavailable', 'No TTG')
                    .replace('none_green_duration_unavailable', 'No GreenDur')
                    .replace('none_advice_speed_out_of_range', 'Spd OutRange')
                    .replace('cannotCatchGreen', 'Can\'t Catch')
                    .replace('willArriveTooEarly', 'Too Early')
                : 'N/A'
        };
    });

    // Helper function to get color based on GLOSA advice
    const getAdviceColor = (advice) => {
        if (!advice) return '#9ca3af'; // gray for null

        if (advice.includes('accelerate')) return '#22c55e'; // green
        if (advice.includes('decelerate')) return '#ef4444'; // red
        if (advice.includes('cruise')) return '#3b82f6'; // blue
        if (advice.includes('cannotCatchGreen')) return '#f97316'; // orange
        if (advice.includes('willArriveTooEarly')) return '#a855f7'; // purple
        if (advice.includes('none')) return '#9ca3af'; // gray

        return '#6b7280'; // default gray
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Signal Group: {signalGroup.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div title={
                        signalGroup.hasMovementEvents
                            ? (signalGroup.allMovementEventsUnavailable
                                ? 'Has movement events but all unavailable'
                                : 'Has available movement events')
                            : 'No movement events'
                    } style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: signalGroup.hasMovementEvents
                            ? (signalGroup.allMovementEventsUnavailable ? '#9ca3af' : '#10b981')
                            : '#ef4444'
                    }}></div>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {signalGroup.hasMovementEvents
                ? (signalGroup.allMovementEventsUnavailable
                    ? 'Movement events (all unavailable)'
                    : 'Available movement events')
                : 'No movement events'}
          </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>GLOSA Parameters</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p><span style={{ fontWeight: '500' }}>Primary Advice:</span> {primaryAdvice}</p>

                        {timeToGreenRange.length > 0 && (
                            <p><span style={{ fontWeight: '500' }}>Time to Green Range:</span> {Math.min(...timeToGreenRange)} - {Math.max(...timeToGreenRange)} seconds</p>
                        )}

                        {secondsToGreenRange.length > 0 && (
                            <p><span style={{ fontWeight: '500' }}>Seconds to Green Range:</span> {Math.min(...secondsToGreenRange)} - {Math.max(...secondsToGreenRange)} seconds</p>
                        )}
                    </div>
                </div>

                <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>Travel Time Parameters</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {minTravelTimeRange.length > 0 && (
                            <p><span style={{ fontWeight: '500' }}>Min Travel Time Range:</span> {Math.min(...minTravelTimeRange)} - {Math.max(...minTravelTimeRange)} seconds</p>
                        )}

                        {maxTravelTimeRange.length > 0 && (
                            <p><span style={{ fontWeight: '500' }}>Max Travel Time Range:</span> {Math.min(...maxTravelTimeRange)} - {Math.max(...maxTravelTimeRange)} seconds</p>
                        )}

                        {distanceToStopRange.length > 0 && (
                            <p><span style={{ fontWeight: '500' }}>Distance to Stop Range:</span> {Math.min(...distanceToStopRange).toFixed(1)} - {Math.max(...distanceToStopRange).toFixed(1)} meters</p>
                        )}
                    </div>
                </div>
            </div>

            {/* GLOSA Visualization Charts */}
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>GLOSA Visualizations</h4>

                {chartData.length > 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                        {/* Chart 1: GLOSA Advice vs Distance */}
                        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                            <h5 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>GLOSA Advice vs Distance to Intersection</h5>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            type="number"
                                            dataKey="distance"
                                            name="Distance"
                                            label={{ value: 'Distance to Intersection (m)', position: 'insideBottom', offset: -15 }}
                                            domain={['dataMax', 'dataMin']} // Reverse axis (decreasing from left to right)
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="speed"
                                            name="Speed"
                                            label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft' }}
                                        />
                                        <Tooltip
                                            formatter={(value, name) => [value, name]}
                                            labelFormatter={(value) => `Distance: ${value}m`}
                                        />
                                        <Legend />
                                        {/* Group data by glosaAdvice */}
                                        {Array.from(new Set(chartData.map(d => d.glosaAdvice))).map(advice => (
                                            <Scatter
                                                key={advice}
                                                name={advice}
                                                data={chartData.filter(d => d.glosaAdvice === advice)}
                                                fill={getAdviceColor(advice)}
                                            />
                                        ))}
                                        {/* Add a line connecting all points in time order */}
                                        <Line
                                            type="monotone"
                                            dataKey="speed"
                                            data={chartData}
                                            stroke="#000"
                                            strokeWidth={1}
                                            dot={false}
                                        />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 2: Time-Distance with Green Window */}
                        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                            <h5 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>Time-Distance Trajectory with Green Window</h5>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            type="number"
                                            dataKey="time"
                                            name="Time"
                                            label={{ value: 'Time (seconds from start)', position: 'insideBottom', offset: -15 }}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="distance"
                                            name="Distance"
                                            label={{ value: 'Distance to Intersection (m)', angle: -90, position: 'insideLeft' }}
                                        />
                                        <Tooltip />
                                        <Legend />

                                        {/* Main trajectory line */}
                                        <Line
                                            type="monotone"
                                            dataKey="distance"
                                            data={chartData}
                                            stroke="#000"
                                            strokeWidth={2}
                                            dot={false}
                                        />

                                        {/* Color-coded segments based on advice */}
                                        {Array.from(new Set(chartData.map(d => d.glosaAdvice))).map(advice => (
                                            <Line
                                                key={advice}
                                                name={advice}
                                                type="monotone"
                                                dataKey="distance"
                                                data={chartData.filter(d => d.glosaAdvice === advice)}
                                                stroke={getAdviceColor(advice)}
                                                strokeWidth={3}
                                                dot={true}
                                                activeDot={{ r: 6 }}
                                                connectNulls
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 3: Speed vs Time with Advice */}
                        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                            <h5 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>Speed vs Time with GLOSA Advice</h5>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            type="number"
                                            dataKey="time"
                                            name="Time"
                                            label={{ value: 'Time (seconds from start)', position: 'insideBottom', offset: -15 }}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="speed"
                                            name="Speed"
                                            label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft' }}
                                        />
                                        <Tooltip />
                                        <Legend />

                                        {/* GLOSA advised speed line */}
                                        {chartData.some(d => d.glosaSpeedKph) && (
                                            <Line
                                                type="monotone"
                                                dataKey="glosaSpeedKph"
                                                data={chartData}
                                                name="GLOSA Advised Speed"
                                                stroke="#6366f1"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                dot={false}
                                            />
                                        )}

                                        {/* Main speed line */}
                                        <Line
                                            type="monotone"
                                            dataKey="speed"
                                            data={chartData}
                                            name="Vehicle Speed"
                                            stroke="#000"
                                            strokeWidth={2}
                                            dot={false}
                                        />

                                        {/* Color-coded segments based on advice */}
                                        {Array.from(new Set(chartData.map(d => d.glosaAdvice))).map(advice => (
                                            <Line
                                                key={advice}
                                                name={`Advice: ${advice}`}
                                                type="monotone"
                                                dataKey="speed"
                                                data={chartData.filter(d => d.glosaAdvice === advice)}
                                                stroke={getAdviceColor(advice)}
                                                strokeWidth={4}
                                                dot={true}
                                                activeDot={{ r: 6 }}
                                                connectNulls
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 4: GLOSA Parameters Timeline */}
                        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                            <h5 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>GLOSA Parameters Timeline</h5>
                            <div style={{ height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            type="number"
                                            dataKey="time"
                                            name="Time"
                                            label={{ value: 'Time (seconds from start)', position: 'insideBottom', offset: -15 }}
                                        />
                                        <YAxis
                                            type="number"
                                            yAxisId="left"
                                            label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft' }}
                                        />
                                        <YAxis
                                            type="number"
                                            yAxisId="right"
                                            orientation="right"
                                            label={{ value: 'Speed (km/h)', angle: 90, position: 'insideRight' }}
                                        />
                                        <Tooltip />
                                        <Legend />

                                        {chartData.some(d => d.minTravelTime !== null) && (
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="minTravelTime"
                                                data={chartData}
                                                name="Min Travel Time"
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                dot={false}
                                                connectNulls
                                            />
                                        )}

                                        {chartData.some(d => d.maxTravelTime !== null) && (
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="maxTravelTime"
                                                data={chartData}
                                                name="Max Travel Time"
                                                stroke="#ef4444"
                                                strokeWidth={2}
                                                dot={false}
                                                connectNulls
                                            />
                                        )}

                                        {chartData.some(d => d.secondsToGreen !== null) && (
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="secondsToGreen"
                                                data={chartData}
                                                name="Seconds To Green"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                dot={false}
                                                connectNulls
                                            />
                                        )}

                                        {chartData.some(d => d.glosaSpeedKph) && (
                                            <Line
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="glosaSpeedKph"
                                                data={chartData}
                                                name="GLOSA Advised Speed"
                                                stroke="#6366f1"
                                                strokeWidth={2}
                                                dot={false}
                                                connectNulls
                                            />
                                        )}

                                        {/* Distance line on right axis */}
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="distance"
                                            data={chartData}
                                            name="Distance to Stop"
                                            stroke="#9ca3af"
                                            strokeWidth={1}
                                            dot={false}
                                            connectNulls
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                        <p>Not enough data points for visualization. At least 2 data points are required.</p>
                    </div>
                )}
            </div>

            <div>
                <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>GLOSA Advice Analysis</h4>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <p style={{ marginBottom: '12px' }}>Based on the internal parameters, the GLOSA system determined advice for this signal group:</p>
                    <ul style={{ listStyleType: 'disc', marginLeft: '24px', marginTop: '8px' }}>
                        {primaryAdvice.includes('none_movement_event_unavailable') && (
                            <li>Movement events were not available from the traffic light controller.</li>
                        )}
                        {primaryAdvice.includes('none_ttg_unavailable') && (
                            <li>Time-to-green information was not available from the traffic light controller.</li>
                        )}
                        {primaryAdvice.includes('none_green_duration_unavailable') && (
                            <li>Green phase duration information was not available from the traffic light controller.</li>
                        )}
                        {primaryAdvice.includes('none_advice_speed_out_of_range') && (
                            <li>The calculated advisory speed was outside of allowed speed limits.</li>
                        )}
                        {primaryAdvice.includes('accelerate') && (
                            <li>The vehicle needed to increase speed to efficiently catch the green light.</li>
                        )}
                        {primaryAdvice.includes('decelerate') && (
                            <li>The vehicle needed to reduce speed to avoid arriving at a red light.</li>
                        )}
                        {primaryAdvice.includes('cruise') && (
                            <li>The vehicle's current speed was optimal for catching the green light.</li>
                        )}
                        {primaryAdvice.includes('cannotCatchGreen') && (
                            <li>Even at maximum allowed speed, the vehicle could not reach the intersection during the green phase.</li>
                        )}
                        {primaryAdvice.includes('willArriveTooEarly') && (
                            <li>Even at minimum allowed speed, the vehicle would arrive before the green phase begins.</li>
                        )}
                        {primaryAdvice === 'N/A' && (
                            <li>No GLOSA advice was calculated for this signal group.</li>
                        )}
                    </ul>

                    {clearanceTimeRange.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            <p style={{ marginBottom: '8px' }}><span style={{ fontWeight: '500' }}>Clearance Time Analysis:</span></p>
                            <p>Range: {Math.min(...clearanceTimeRange)} - {Math.max(...clearanceTimeRange)} seconds</p>
                            <p>Primary method: {Object.entries(signalGroup.summary.clearanceTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default SignalGroupGLOSAAnalysis;
