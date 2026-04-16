import React from 'react';

interface StoreSelectorProps {
  stores: string[];
  selectedStore: string;
  onSelect: (store: string) => void;
  label?: string;
}

const StoreSelector: React.FC<StoreSelectorProps> = ({
  stores,
  selectedStore,
  onSelect,
  label = 'Store',
}) => {
  return (
    <div className="filter-group">
      <div className="filter-label">{label}</div>
      <select
        className="filter-select"
        aria-label={label}
        value={selectedStore}
        onChange={(e) => onSelect(e.target.value)}
      >
        {stores.map((s) => (
          <option key={s} value={s}>
            {s === 'ALL' ? 'All Stores' : s}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StoreSelector;
