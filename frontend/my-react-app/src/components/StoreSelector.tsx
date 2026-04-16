import React from 'react';
import SearchableFilter from './SearchableFilter';

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
    <SearchableFilter
      options={stores}
      selected={selectedStore}
      onSelect={onSelect}
      label={label}
      placeholder="Search stores..."
      width="220px"
    />
  );
};

export default StoreSelector;
