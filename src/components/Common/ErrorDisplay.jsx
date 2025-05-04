const ErrorDisplay = ({ message }) => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '16px' }}>
            <p style={{ fontWeight: 'bold' }}>Error</p>
            <p>{message}</p>
        </div>
    </div>
);
export default ErrorDisplay;