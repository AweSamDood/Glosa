// Overview Tab Component
import SignalGroupOverview from "../SignalGroup/SignalGroupOverview.jsx";

const OverviewTab = ({ passThrough }) => {
    return (
        <div>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Pass-Through Summary</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p><span style={{ fontWeight: '500' }}>UUID:</span> {passThrough.uuid}</p>
                    <p><span style={{ fontWeight: '500' }}>Timestamp:</span> {passThrough.timestamp.toLocaleString()}</p>
                    <p><span style={{ fontWeight: '500' }}>Total events:</span> {passThrough.summary.eventCount}</p>
                    <p><span style={{ fontWeight: '500' }}>Duration:</span> {((passThrough.summary.timeRange.end - passThrough.summary.timeRange.start) / 1000).toFixed(1)} seconds</p>
                    <p><span style={{ fontWeight: '500' }}>Signal groups:</span> {Object.keys(passThrough.signalGroups || {}).length}</p>
                    <p><span style={{ fontWeight: '500' }}>Movement events:</span> {passThrough.summary.anySignalGroupHasMovementEvents ? 'Available' : 'Unavailable'}</p>
                </div>
            </div>

            {passThrough.signalGroups && Object.keys(passThrough.signalGroups).length > 0 ? (
                <>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Signal Group Analysis</h2>

                    {Object.values(passThrough.signalGroups).map(signalGroup => (
                        <SignalGroupOverview key={signalGroup.name} signalGroup={signalGroup} />
                    ))}
                </>
            ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px' }}>
                    <p>No signal groups available for this pass-through.</p>
                </div>
            )}
        </div>
    );
};
export default OverviewTab;

