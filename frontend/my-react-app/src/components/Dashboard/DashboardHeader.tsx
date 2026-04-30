import React from 'react';
import { Menu } from 'lucide-react';
import SKUSelector from '../SKUSelector';
import type { SKUSummary } from '../../types';

interface DashboardHeaderProps {
  summary: SKUSummary | null;
  skus: string[];
  selectedSku: string;
  setSelectedSku: (sku: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  summary,
  skus,
  selectedSku,
  setSelectedSku,
  setIsSidebarOpen
}) => {
  return (
    <header className="enterprise-header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <div>
          <h1>Supply Chain Inventory Control</h1>
          <p>Real-time SKU performance across {summary?.storeCount || 0} locations</p>
        </div>
      </div>
      <div className="header-right">
        <SKUSelector
          skus={skus}
          selectedSku={selectedSku}
          onSelect={setSelectedSku}
        />
      </div>
    </header>
  );
};

export default DashboardHeader;
