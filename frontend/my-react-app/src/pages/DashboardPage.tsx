import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  TrendingUp,
  RefreshCw,
  Truck
} from 'lucide-react';

import {
  fetchSKUList,
  fetchSKUDetail,
  fetchTransferSuggestions
} from '../api';

import type {
  SKUDetail,
  TransferSuggestion,
  StoreBreakdown,
  SKUSummary,
  SKUStatus,
} from '../types';

import Chatbot from '../components/Chatbot';

// Sub-components
import Sidebar from '../components/Dashboard/Sidebar';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import FilterToolbar from '../components/Dashboard/FilterToolbar';
import KPICard from '../components/Dashboard/KPICard';
import AnalyticsTab from '../components/Dashboard/AnalyticsTab';
import LogisticsTab from '../components/Dashboard/LogisticsTab';
import ConfirmUploadModal from '../components/Dashboard/ConfirmUploadModal';

const deriveStatus = (
  obsQty: number,
  cbsQty: number,
  saleThruPct: number,
  netSlsQty: number
): { status: SKUStatus; reason: string } => {
  const stockOnHand = cbsQty || 0;
  const sales = netSlsQty || 0;
  const velocity = sales;
  const sellThru = saleThruPct || 0;

  // 1. OUT OF STOCK
  if (stockOnHand <= 0 && velocity > 0) {
    return { status: 'OUT_OF_STOCK', reason: "Zero stock detected while active sales demand exists. Lost sales opportunity." };
  }

  // 2. STAGNANT
  if (velocity <= 0 && stockOnHand > 0) {
    return { status: 'STAGNANT', reason: "No sales recorded in this period. Stock is immobile and tying up capital." };
  }

  // 3. Velocity-Based Coverage (Weeks of Stock)
  if (velocity > 0) {
    const wos = stockOnHand / velocity;

    if (wos < 0.8) {
      return { status: 'CRITICAL', reason: `Dangerously low stock lasts only ${wos.toFixed(1)} weeks. Refill immediately.` };
    }
    if (wos < 1.8) {
      return { status: 'LOW_STOCK', reason: `Stock depleting fast with ${wos.toFixed(1)} weeks of coverage. Replenishment required.` };
    }
    if (wos > 10) {
      return { status: 'OVERSTOCK', reason: `Excessive stock on hand. Current sales velocity will take >10 weeks to clear.` };
    }
  }

  // 4. Fallback to Sell-Through
  if (sellThru > 80 && stockOnHand < (obsQty * 0.2)) {
    return { status: 'CRITICAL', reason: "Extremely high sell-through (80%+) with very low remaining stock." };
  }
  if (sellThru < 10 && stockOnHand > (obsQty * 0.7)) {
    return { status: 'OVERSTOCK', reason: "Stagnant sell-through (<10%) while holding over 70% of opening inventory." };
  }

  return { status: 'HEALTHY', reason: "Healthy stock-to-sales balance. Inventory levels are optimal for current demand." };
};

const DashboardPage: React.FC = () => {
  const [skus, setSkus] = useState<string[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [detail, setDetail] = useState<SKUDetail | null>(null);
  const [transfers, setTransfers] = useState<TransferSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'logistics'>('analytics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [confirmUploadOpen, setConfirmUploadOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('ALL');
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const toggleRow = (key: string) => {
    setExpandedRowKey(expandedRowKey === key ? null : key);
  };
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const skuRes = await fetchSKUList();

        if (skuRes.success) {
          setSkus(skuRes.data);
          if (skuRes.data.length > 0) {
            setSelectedSku(skuRes.data[0]);
          }
        }
      } catch (err) {
        console.error('Init dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedSku) {
      const loadDetail = async () => {
        setDetailLoading(true);
        try {
          // Fetch BOTH detail and SKU-specific transfers
          const [detailRes, transferRes] = await Promise.all([
            fetchSKUDetail(selectedSku),
            fetchTransferSuggestions(selectedSku)
          ]);

          if (detailRes.success) {
            setDetail(detailRes.data);
          }
          if (transferRes.success) {
            setTransfers(transferRes.data);
          }
        } catch (err) {
          console.error('Load SKU data error:', err);
        } finally {
          setDetailLoading(false);
        }
      };
      loadDetail();
    }
  }, [selectedSku]);

  useEffect(() => {
    // Reset filters when user switches SKU
    setSelectedColor('ALL');
    setSelectedStore('ALL');
    setCurrentPage(1);
  }, [selectedSku]);

  const colorOptions = React.useMemo(() => {
    const rows = detail?.storeBreakdown || [];
    const uniq = Array.from(new Set(rows.map(r => r.colorName).filter(Boolean)));
    uniq.sort();
    return ['ALL', ...uniq];
  }, [detail]);

  const storeOptions = React.useMemo(() => {
    const rows = detail?.storeBreakdown || [];
    const uniq = Array.from(new Set(rows.map(r => r.locationName).filter(Boolean)));
    uniq.sort();
    return ['ALL', ...uniq];
  }, [detail]);

  const effectiveSelectedColor = colorOptions.includes(selectedColor) ? selectedColor : 'ALL';
  const effectiveSelectedStore = storeOptions.includes(selectedStore) ? selectedStore : 'ALL';

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveSelectedColor, effectiveSelectedStore]);

  useEffect(() => {
    if (!confirmUploadOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmUploadOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmUploadOpen]);

  const selectedRows = React.useMemo<StoreBreakdown[]>(() => {
    let rows = detail?.storeBreakdown || [];
    if (effectiveSelectedColor !== 'ALL') {
      rows = rows.filter(r => r.colorName === effectiveSelectedColor);
    }
    if (effectiveSelectedStore !== 'ALL') {
      rows = rows.filter(r => r.locationName === effectiveSelectedStore);
    }
    return rows;
  }, [detail, effectiveSelectedColor, effectiveSelectedStore]);

  const enrichedRows = React.useMemo<StoreBreakdown[]>(() => {
    return (selectedRows || []).map((r) => {
      const { status, reason } = deriveStatus(r.obsQty, r.cbsQty, r.saleThruPct, r.netSlsQty);
      return {
        ...r,
        status,
        statusReason: reason,
        inTransit: r.gitQty > 0,
      };
    });
  }, [selectedRows]);

  const totalPages = Math.ceil(enrichedRows.length / pageSize);
  const paginatedRows = enrichedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const aggregatedRowsForChart = React.useMemo<StoreBreakdown[]>(() => {
    const byLoc = new Map<
      string,
      { locationName: string; obsQty: number; cbsQty: number; gitQty: number; netSlsQty: number; saleThruWeightedSum: number }
    >();

    for (const r of selectedRows) {
      const key = r.locationName;
      if (!byLoc.has(key)) {
        byLoc.set(key, {
          locationName: key,
          obsQty: 0,
          cbsQty: 0,
          gitQty: 0,
          netSlsQty: 0,
          saleThruWeightedSum: 0,
        });
      }

      const item = byLoc.get(key)!;
      item.obsQty += r.obsQty || 0;
      item.cbsQty += r.cbsQty || 0;
      item.gitQty += r.gitQty || 0;
      item.netSlsQty += r.netSlsQty || 0;
      item.saleThruWeightedSum += (r.netSlsQty || 0) * (r.saleThruPct || 0);
    }

    return Array.from(byLoc.values()).map(item => {
      const avgSaleThru = item.netSlsQty > 0 ? item.saleThruWeightedSum / item.netSlsQty : 0;
      const { status, reason } = deriveStatus(item.obsQty, item.cbsQty, avgSaleThru, item.netSlsQty);
      return {
        locationName: item.locationName,
        sectionName: 'N/A',
        colorName: effectiveSelectedColor,
        obsQty: item.obsQty,
        cbsQty: item.cbsQty,
        gitQty: item.gitQty,
        netSlsQty: item.netSlsQty,
        saleThruPct: avgSaleThru,
        status,
        statusReason: reason,
        inTransit: item.gitQty > 0,
      };
    });
  }, [effectiveSelectedColor, selectedRows]);

  const summary = React.useMemo<SKUSummary>(() => {
    const totalObs = enrichedRows.reduce((sum, r) => sum + (r.obsQty || 0), 0);
    const totalCbs = enrichedRows.reduce((sum, r) => sum + (r.cbsQty || 0), 0);
    const totalGit = enrichedRows.reduce((sum, r) => sum + (r.gitQty || 0), 0);
    const totalSales = enrichedRows.reduce((sum, r) => sum + (r.netSlsQty || 0), 0);
    const totalWeightedSaleThru = enrichedRows.reduce(
      (sum, r) => sum + (r.netSlsQty || 0) * (r.saleThruPct || 0),
      0
    );

    const avgSaleThru = totalSales > 0 ? totalWeightedSaleThru / totalSales : 0;
    const storeCount = new Set(enrichedRows.map(r => r.locationName)).size;

    const { status: overallStatus, reason: overallReason } = deriveStatus(totalObs, totalCbs, avgSaleThru, totalSales);

    return {
      totalObs,
      totalCbs,
      totalGit,
      totalSales,
      avgSaleThru: Math.round(avgSaleThru * 10) / 10,
      overallStatus,
      overallReason,
      inTransit: totalGit > 0,
      storeCount,
    };
  }, [enrichedRows]);

  if (loading) {
    return (
      <div className="enterprise-overlay">
        <div className="enterprise-loader">
          <RefreshCw className="animate-spin" size={48} />
          <p>Initializing Intelligence Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enterprise-shell">
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        setConfirmUploadOpen={setConfirmUploadOpen} 
      />

      <main className="enterprise-main">
        <DashboardHeader 
          summary={summary}
          skus={skus}
          selectedSku={selectedSku}
          setSelectedSku={setSelectedSku}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        <FilterToolbar 
          detail={detail}
          selectedSku={selectedSku}
          colorOptions={colorOptions}
          effectiveSelectedColor={effectiveSelectedColor}
          setSelectedColor={setSelectedColor}
          storeOptions={storeOptions}
          effectiveSelectedStore={effectiveSelectedStore}
          setSelectedStore={setSelectedStore}
        />

        <div className="dashboard-tabs">
          <button
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <TrendingUp size={16} />
            Inventory Analytics
          </button>
          <button
            className={`tab-btn ${activeTab === 'logistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('logistics')}
          >
            <Package size={16} />
            Logistics Hub
          </button>
        </div>

        {/* KPI Strip */}
        <div className="kpi-strip">
          <KPICard
            label="Closing Stock"
            value={summary?.totalCbs || 0}
            icon={<Package size={20} />}
            tooltip="Current live inventory standing in physical locations"
          />
          <KPICard
            label="Net Sales Qty"
            value={summary?.totalSales || 0}
            icon={<TrendingUp size={20} />}
            color="#4A7C59"
            tooltip="Total units sold (minus returns) during the period"
          />
          <KPICard
            label="Stock In-Transit"
            value={summary?.totalGit || 0}
            icon={<Truck size={20} />}
            color="#B07D3A"
            tooltip="Inventory currently between warehouses or stores"
          />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' ? (
            <AnalyticsTab 
              detailLoading={detailLoading}
              aggregatedRowsForChart={aggregatedRowsForChart}
              summary={summary}
              paginatedRows={paginatedRows}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              enrichedRows={enrichedRows}
              expandedRowKey={expandedRowKey}
              toggleRow={toggleRow}
            />
          ) : (
            <LogisticsTab 
              detail={detail}
              transfers={transfers}
              selectedRows={selectedRows}
              summary={summary}
            />
          )}
        </AnimatePresence>
      </main>

      {confirmUploadOpen && (
        <ConfirmUploadModal 
          onClose={() => setConfirmUploadOpen(false)}
          onContinue={() => {
            setConfirmUploadOpen(false);
            navigate('/');
          }}
        />
      )}
      <Chatbot />
    </div>
  );
};

export default DashboardPage;
