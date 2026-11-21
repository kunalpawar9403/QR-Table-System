import React from 'react';

export default function PageContainer({
  children,
  className = '',
  maxWidth,
  style = {}
}) {
  return (
    <div className={`tm-page-container ${className}`} style={style}>
      <div className="tm-content-wrapper" style={maxWidth ? { maxWidth } : undefined}>
        {children}
      </div>
    </div>
  );
}
