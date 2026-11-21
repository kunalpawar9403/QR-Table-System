import React from 'react';

export default function MediaFrame({ src, alt, tag, onDark = false, loading = 'lazy', className = '' }) {
  return (
    <figure className={`tm-media ${onDark ? 'is-on-dark' : ''} ${className}`}>
      <img src={src} alt={alt} loading={loading} decoding="async" />
      {tag && <figcaption className="tm-media-tag">{tag}</figcaption>}
    </figure>
  );
}
