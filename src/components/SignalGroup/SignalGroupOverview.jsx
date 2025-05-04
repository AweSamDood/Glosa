// Signal Group Overview Component
const SignalGroupOverview = ({ signalGroup }) => {
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Distance & Speed</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ fontSize: '14px' }}><span style={{ fontWeight: '500' }}>Distance:</span> {signalGroup.summary.distanceRange.min.toFixed(1)} - {signalGroup.summary.distanceRange.max.toFixed(1)} m</p>
                        <p style={{ fontSize: '14px' }}><span style={{ fontWeight: '500' }}>Speed:</span> {signalGroup.summary.speedRange.min.toFixed(1)} - {signalGroup.summary.speedRange.max.toFixed(1)} km/h</p>
                        <p style={{ fontSize: '14px' }}><span style={{ fontWeight: '500' }}>Avg Speed:</span> {signalGroup.summary.speedRange.avg.toFixed(1)} km/h</p>
                    </div>
                </div>

                <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>GLOSA Advice</h4>
                    {Object.keys(signalGroup.summary.glosaAdvice).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {Object.entries(signalGroup.summary.glosaAdvice)
                                .sort((a, b) => b[1] - a[1])
                                .map(([advice, count], i) => (
                                    <p key={i} style={{ fontSize: '14px' }}>
                                        <span style={{ fontWeight: i === 0 ? '500' : 'normal' }}>{advice}:</span> {count} times
                                    </p>
                                ))
                            }
                        </div>
                    ) : (
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>No GLOSA advice data</p>
                    )}
                </div>

                <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Clearance Types</h4>
                    {Object.keys(signalGroup.summary.clearanceTypes).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {Object.entries(signalGroup.summary.clearanceTypes)
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count], i) => (
                                    <p key={i} style={{ fontSize: '14px' }}>
                                        <span style={{ fontWeight: i === 0 ? '500' : 'normal' }}>{type}:</span> {count} times
                                    </p>
                                ))
                            }
                        </div>
                    ) : (
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>No clearance type data</p>
                    )}
                </div>
            </div>
        </div>
    );
};
export default SignalGroupOverview;