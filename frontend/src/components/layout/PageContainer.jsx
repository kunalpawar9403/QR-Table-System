import React from 'react';

export default function PageContainer({ 
  children, 
  className = '', 
  maxWidth = '1280px',
  style = {} 
}) {
  return (
    <div 
      className={`tm-page-container ${className}`} 
      style={{ width: '100%', ...style }}
    >
      <div 
        className="tm-content-wrapper" 
        style={{ maxWidth, margin: '0 auto' }}
      >
        {children}
      </div>
    </div>
  );
}
