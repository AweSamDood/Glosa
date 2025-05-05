const TabButton = ({ label, isActive, onClick }) => (
    <button
        style={{
            padding: '16px',
            marginRight: '8px',
            fontWeight: '500',
            borderWidth: isActive ? '0 0 2px 0' : '0',
            borderStyle: isActive ? 'solid' : 'none',
            borderColor: isActive ? '#3b82f6' : 'transparent',
            color: isActive ? '#3b82f6' : '#6b7280',
            background: 'none',
            cursor: 'pointer'
        }}
        onClick={onClick}
    >
        {label}
    </button>
);
export default TabButton;