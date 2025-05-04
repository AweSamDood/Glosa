const LoadingIndicator = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
            <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', margin: '0 auto' }}></div>
            <p style={{ marginTop: '16px', fontSize: '18px' }}>Loading GLOSA data...</p>
        </div>
    </div>
);
export default LoadingIndicator;