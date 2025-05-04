// src/components/Tabs/IntersectionTab.jsx
import React from 'react';
import IntersectionOverview from '../Intersection/IntersectionOverview';

const IntersectionTab = ({ intersection }) => {
    if (!intersection) {
        return (
            <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Intersection Analysis</h2>
                <p>No intersection selected.</p>
            </div>
        );
    }

    return (
        <div>
            <IntersectionOverview intersection={intersection} />
        </div>
    );
};

export default IntersectionTab;