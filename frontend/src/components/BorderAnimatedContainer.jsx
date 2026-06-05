import React from 'react';

/**
 * BorderAnimatedContainer
 * Wraps children in a container with a spinning indigo/violet/lavender conic-gradient border.
 * Uses CSS @property --border-angle for smooth animation.
 */
function BorderAnimatedContainer({ children, className = '', style = {} }) {
  return (
    <div
      className={`aether-border rounded-2xl ${className}`}
      style={{
        ...style,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

export default BorderAnimatedContainer;
