// react component that only displays a div with container and mx auto
import React from 'react';

export const SectionContainer: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => {
    return <div className={`container mx-auto px-4 sm:px-12 ${className}`}>{children}</div>;
}
