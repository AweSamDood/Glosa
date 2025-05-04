// src/components/IntersectionList/PassThroughList.jsx
import React from 'react';
import PassThroughItem from './PassThroughItem';

const PassThroughList = ({ passThroughs, selectedPassIndex, onSelectPassThrough }) => {
    if (!passThroughs || passThroughs.length === 0) {
        return <div style={{ padding: '12px 32px', fontSize: '14px', color: '#6b7280' }}>No pass-throughs recorded.</div>;
    }

    return (
        <div style={{ backgroundColor: 'white' }}>
            {passThroughs.map((passThrough) => (
                <PassThroughItem
                    // Use passIndex as key if UUID might not be unique *within this list*
                    // Although UUID *should* be unique globally, passIndex is safer here.
                    key={passThrough.passIndex}
                    passThrough={passThrough}
                    isSelected={passThrough.passIndex === selectedPassIndex}
                    onSelect={() => onSelectPassThrough(passThrough.passIndex)}
                />
            ))}
        </div>
    );
};

export default PassThroughList;