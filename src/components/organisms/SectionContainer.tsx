// react component that only displays a div with container and mx auto
import React from 'react';

export const SectionContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...rest }) => {
    return <div className={`container mx-auto px-4 xs:px-6 sm:px-8 md:px-10 lg:px-12 ${className}`} {...rest}>{children}</div>;
}
