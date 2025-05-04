const TabButton = ({ label, isActive, onClick }) => (
    <button
        style={{
            padding: '16px',
            marginRight: '8px',
            fontWeight: '500',
            borderBottom: isActive ? '2px solid #3b82f6' : 'none',
            color: isActive ? '#3b82f6' : '#6b7280',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
        }}
        onClick={onClick}
    >
        {label}
    </button>
);
export default TabButton;