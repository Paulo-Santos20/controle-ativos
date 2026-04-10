import React, { useState, useRef, useEffect } from 'react';

const Tooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef(null);
  const childrenRef = useRef(null);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mouseenter', handleClickOutside);
      document.addEventListener('mouseleave', hideTooltip);
    }

    return () => {
      document.removeEventListener('mouseenter', handleClickOutside);
      document.removeEventListener('mouseleave', hideTooltip);
    };
  }, [isVisible]);

  const positionStyles = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' }
  };

  const styles = {
    container: {
      position: 'relative',
      display: 'inline-flex'
    },
    tooltip: {
      position: 'absolute',
      ...positionStyles[position],
      backgroundColor: 'var(--color-text-primary)',
      color: 'var(--color-bg-page)',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      whiteSpace: 'nowrap',
      zIndex: 1000,
      opacity: isVisible ? 1 : 0,
      visibility: isVisible ? 'visible' : 'hidden',
      transition: 'all 0.2s ease',
      pointerEvents: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    arrow: {
      position: 'absolute',
      width: '8px',
      height: '8px',
      backgroundColor: 'var(--color-text-primary)',
      transform: 'rotate(45deg)',
      ...(position === 'top' && { bottom: '-4px', left: '50%', marginLeft: '-4px' }),
      ...(position === 'bottom' && { top: '-4px', left: '50%', marginLeft: '-4px' }),
      ...(position === 'left' && { right: '-4px', top: '50%', marginTop: '-4px' }),
      ...(position === 'right' && { left: '-4px', top: '50%', marginTop: '-4px' })
    }
  };

  return (
    <div 
      ref={tooltipRef} 
      style={styles.container}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {React.cloneElement(children, { ref: childrenRef })}
      <div 
        role="tooltip" 
        id={`tooltip-${content}`}
        style={styles.tooltip}
        aria-hidden={!isVisible}
      >
        {content}
        <div style={styles.arrow} />
      </div>
    </div>
  );
};

export default Tooltip;