// src/components/IntersectionList/PassThroughList.jsx
import React from 'react';
import PassThroughItem from './PassThroughItem';

const PassThroughList = ({
                             passThroughs,
                             selectedPassIndex,
                             onSelectPassThrough,
                             isFilteredOut = false
                         }) => {
    if (!passThroughs || passThroughs.length === 0) {
        return <div style={{
            padding: '12px 32px',
            fontSize: '14px',
            color: isFilteredOut ? '#991b1b' : '#6b7280',
            backgroundColor: isFilteredOut ? '#fef2f2' : 'white',
            opacity: isFilteredOut ? 0.8 : 1
        }}>
            No pass-throughs recorded.
        </div>;
    }

    return (
        <div style={{ backgroundColor: isFilteredOut ? '#fff1f2' : 'white' }}>
            {passThroughs.map((passThrough) => (
                <PassThroughItem
                    // Use passIndex as key if UUID might not be unique *within this list*
                    // Although UUID *should* be unique globally, passIndex is safer here.
                    key={passThrough.passIndex}
                    passThrough={passThrough}
                    isSelected={passThrough.passIndex === selectedPassIndex}
                    onSelect={() => onSelectPassThrough(passThrough.passIndex)}
                    isFilteredOut={isFilteredOut}
                />
            ))}
        </div>
    );
};

export default PassThroughList;