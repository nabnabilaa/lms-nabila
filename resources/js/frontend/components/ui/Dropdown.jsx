import React, { useState, useRef, useEffect } from 'react';

/**
 * Reusable Dropdown Component
 * @param {React.ReactNode} trigger - The element that toggles the dropdown
 * @param {React.ReactNode} children - The content of the dropdown menu
 * @param {string} align - Alignment of the dropdown ('left' or 'right')
 * @param {string} width - Width class (default: 'w-80')
 */
export const Dropdown = ({ trigger, children, align = 'right', width = 'w-80', className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && (
                <div 
                    className={`absolute z-50 mt-2 ${align === 'right' ? 'right-0' : 'left-0'} ${width} bg-white rounded-xl shadow-lg border border-gray-100 ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-100 ${className}`}
                >
                    {children}
                </div>
            )}
        </div>
    );
};
