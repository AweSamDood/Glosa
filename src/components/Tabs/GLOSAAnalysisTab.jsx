// GLOSA Analysis Tab Component
import SignalGroupGLOSAAnalysis from "../SignalGroup/SignalGroupGLOSAAnalysis.jsx";

const GLOSAAnalysisTab = ({ passThrough }) => {
    // Safety check - if no signal groups are found
    if (!passThrough.signalGroups || Object.keys(passThrough.signalGroups).length === 0) {
        return (
            <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>GLOSA Analysis</h2>
                <p>No signal groups available for analysis in this pass-through.</p>
            </div>
        );
    }

    return (
        <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>GLOSA Analysis by Signal Group</h2>

            {Object.values(passThrough.signalGroups).map(signalGroup => (
                <SignalGroupGLOSAAnalysis key={signalGroup.name} signalGroup={signalGroup} />
            ))}
        </div>
    );
};
export default GLOSAAnalysisTab
