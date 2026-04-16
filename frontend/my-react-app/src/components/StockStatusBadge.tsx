import React from 'react';
import type { SKUStatus } from '../types';

interface StockStatusBadgeProps {
  status: SKUStatus;
  inTransit?: boolean;
}

const StockStatusBadge: React.FC<StockStatusBadgeProps> = ({ status, inTransit }) => {
  const getStyles = (s: SKUStatus) => {
    switch (s) {
      case 'CRITICAL':
        return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'CRITICAL STOCK' };
      case 'OVERSTOCK':
        return { bg: 'rgba(176, 125, 58, 0.12)', color: '#B07D3A', label: 'OVERSTOCK' };
      case 'HEALTHY':
        return { bg: 'rgba(74, 124, 89, 0.12)', color: '#4A7C59', label: 'HEALTHY' };
      case 'IN_TRANSIT':
        return { bg: 'rgba(212, 168, 90, 0.12)', color: '#D4A85A', label: 'IN TRANSIT' };
      default:
        return { bg: 'rgba(120, 113, 108, 0.1)', color: '#78716c', label: 'UNKNOWN' };
    }
  };

  const current = getStyles(status);

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span style={{
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.02em',
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.color}30`
      }}>
        {current.label}
      </span>
      {inTransit && (
        <span style={{
          padding: '2px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.02em',
          backgroundColor: 'rgba(212, 168, 90, 0.12)',
          color: '#D4A85A',
          border: '1px solid rgba(212, 168, 90, 0.35)'
        }}>
          + IN TRANSIT
        </span>
      )}
    </div>
  );
};

export default StockStatusBadge;
