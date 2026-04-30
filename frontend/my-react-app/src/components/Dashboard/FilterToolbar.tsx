import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package } from 'lucide-react';
import ColorSelector from '../ColorSelector';
import StoreSelector from '../StoreSelector';
import type { SKUDetail } from '../../types';

interface FilterToolbarProps {
  detail: SKUDetail | null;
  selectedSku: string;
  colorOptions: string[];
  effectiveSelectedColor: string;
  setSelectedColor: (color: string) => void;
  storeOptions: string[];
  effectiveSelectedStore: string;
  setSelectedStore: (store: string) => void;
}

const FilterToolbar: React.FC<FilterToolbarProps> = ({
  detail,
  selectedSku,
  colorOptions,
  effectiveSelectedColor,
  setSelectedColor,
  storeOptions,
  effectiveSelectedStore,
  setSelectedStore
}) => {
  return (
    <AnimatePresence mode="popLayout">
      {detail?.storeBreakdown?.length ? (
        <motion.div
          key="sku-refinement-bar"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="filter-toolbar"
        >
          <div className="filter-group">
            <Package size={14} className="filter-icon" />
            <span className="filter-label-inline">
              <span className='font-bold text-md'>Active SKU:</span> <strong>{selectedSku}</strong>
            </span>
          </div>

          <div className="filter-divider"></div>

          <div className="refinement-controls">
            <ColorSelector
              colors={colorOptions}
              selectedColor={effectiveSelectedColor}
              onSelect={setSelectedColor}
              label="Color"
            />

            <StoreSelector
              stores={storeOptions}
              selectedStore={effectiveSelectedStore}
              onSelect={setSelectedStore}
              label="Store"
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default FilterToolbar;
