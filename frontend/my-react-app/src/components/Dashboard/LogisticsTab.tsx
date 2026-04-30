import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, AlertCircle } from 'lucide-react';
import TransferManifest from '../TransferManifest';
import type { SKUDetail, TransferSuggestion, StoreBreakdown, SKUSummary } from '../../types';

interface LogisticsTabProps {
  detail: SKUDetail | null;
  transfers: TransferSuggestion[];
  selectedRows: StoreBreakdown[];
  summary: SKUSummary | null;
}

const LogisticsTab: React.FC<LogisticsTabProps> = ({
  detail,
  transfers,
  selectedRows,
  summary
}) => {
  return (
    <motion.div
      key="logistics"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="dash-col-right"
    >
      <div className="dash-card transfer-panel">
        <div className="card-header">
          <div className="header-icon"><ArrowRightLeft size={16} /></div>
          <div>
            <h3>Inter-store Transfer Engine</h3>
            <p>Optimized suggestions to balance stock levels</p>
          </div>
        </div>

        <div className="card-body no-padding">
          <div className="transfer-list">
            {detail?.storeBreakdown.some(s => s.locationName === 'NETWORK_WIDE') ? (
              <div className="empty-state">
                <AlertCircle size={48} opacity={0.2} style={{ margin: '0 auto 16px' }} />
                <h3>Multi-Store Context Required</h3>
                <p>Inter-store transfers are disabled for consolidated reports as specific source and destination locations are not defined.</p>
              </div>
            ) : (
              <TransferManifest suggestions={transfers} />
            )}
          </div>
        </div>
      </div>

      <div className="dash-card critical-alert" role="alert" aria-live="polite">
        <AlertCircle size={20} className="shake" />
        <div>
          <h4>System Diagnostic</h4>
          <p>Checked {selectedRows.length || 0} active rows and validated {(summary?.totalCbs || 0).toLocaleString()} units. Recommendations computed by SCM rules.</p>
        </div>
      </div>
    </motion.div>
  );
};

export default LogisticsTab;
