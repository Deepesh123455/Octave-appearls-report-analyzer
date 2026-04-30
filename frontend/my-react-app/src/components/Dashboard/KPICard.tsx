import React from 'react';
import { motion } from 'framer-motion';

interface KPICardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  trend?: string;
  tooltip?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon, color = '#D4A85A', trend, tooltip }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="kpi-card-enterprise !px-6 !py-4"
    title={tooltip}
    aria-label={`${label}: ${value}`}
  >
    <div className="kpi-top">
      <div className="kpi-icon-box" style={{ color }}>{icon}</div>
      {trend && <div className="kpi-trend" aria-label="Trend indicator">{trend}</div>}
    </div>
    <div className="kpi-val">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    <div className="kpi-lab">{label}</div>
  </motion.div>
);

export default KPICard;
