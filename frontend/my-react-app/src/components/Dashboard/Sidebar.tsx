import React from 'react';
import {
  LayoutDashboard,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  X,
  Plus
} from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  setConfirmUploadOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  setConfirmUploadOpen
}) => {
  return (
    <aside className={`enterprise-sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
      <div className="brand-header">
        <div className="brand-logo-css">S</div>
        <div>
          <div className="brand-name">SHEETSENSE</div>
          <div className="text-xs text-zinc-500 font-medium !mt-1">Powered by InvisibleCTO</div>
        </div>
        <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <nav className="side-nav">
        <button className="side-nav-link active">
          <LayoutDashboard size={18} />
          <span>Inventory Master</span>
          <ChevronRight size={14} className="chevron" />
        </button>
        <button className="side-nav-link" onClick={() => setConfirmUploadOpen(true)}>
          <ArrowLeft size={18} />
          <span>Upload New Data</span>
        </button>
        <button className="side-nav-link" onClick={() => { }}>
          <Plus size={18} />
          <span>Add more files</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <div className="dot pulse"></div>
          System Online: v1.5.0-LTS
        </div>
        <button
          className="sidebar-reset-btn"
          onClick={async () => {
            if (window.confirm("ARE YOU SURE? This will permanently delete ALL uploaded inventory records. You will need to re-upload your Excel files.")) {
              const { resetInventoryData } = await import('../../api');
              try {
                await resetInventoryData();
                window.location.reload();
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                alert("Reset failed: " + errorMessage);
              }
            }
          }}
        >
          <RefreshCw size={14} /> Reset All Data
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
