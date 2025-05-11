// src/components/IntersectionList/SearchField.jsx
import React, { useState } from 'react';

const SearchField = ({ onSearch }) => {
    const [searchValue, setSearchValue] = useState('');

    const handleInputChange = (e) => {
        setSearchValue(e.target.value);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        onSearch(searchValue.trim());
    };

    const handleClear = () => {
        setSearchValue('');
        onSearch(''); // Clear search
    };

    return (
        <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
        }}>
            <form onSubmit={handleSearch}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    height: '38px'
                }}>
                    {/* Search Icon */}
                    <div style={{ paddingLeft: '10px', color: '#6b7280' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '20px', height: '20px' }}>
                            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                        </svg>
                    </div>

                    {/* Input */}
                    <input
                        type="text"
                        value={searchValue}
                        onChange={handleInputChange}
                        placeholder="Search by UUID..."
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            padding: '8px 0',
                            fontSize: '14px',
                            minWidth: 0 // Prevents input from overflowing container
                        }}
                    />

                    {/* Clear Button - show only when there's text */}
                    {searchValue && (
                        <button
                            type="button"
                            onClick={handleClear}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                padding: '0 10px',
                                cursor: 'pointer',
                                color: '#6b7280'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    )}

                    {/* Search Button */}
                    <button
                        type="submit"
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            height: '38px',
                            padding: '0 12px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '14px'
                        }}
                    >
                        Find
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SearchField;