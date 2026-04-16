import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface SKUSelectorProps {
  skus: string[];
  selectedSku: string;
  onSelect: (sku: string) => void;
}

const SKUSelector: React.FC<SKUSelectorProps> = ({ skus, selectedSku, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSkus = useMemo(() => {
    if (!searchTerm) return skus.slice(0, 50);
    return skus
      .filter(sku => sku.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 50);
  }, [skus, searchTerm]);

  // Reset active index when search changes or dropdown opens
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm, isOpen]);

  // Accessibility: Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        setActiveIndex(prev => (prev < filteredSkus.length - 1 ? prev + 1 : prev));
        e.preventDefault();
        break;
      case 'ArrowUp':
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        e.preventDefault();
        break;
      case 'Enter':
        if (activeIndex >= 0) {
          onSelect(filteredSkus[activeIndex]);
          setIsOpen(false);
          setSearchTerm('');
        }
        e.preventDefault();
        break;
      case 'Escape':
        setIsOpen(false);
        e.preventDefault();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className="sku-selector-container" 
      style={{ position: 'relative', width: '320px' }}
      ref={dropdownRef}
    >
      <div 
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="sku-listbox"
        tabIndex={0}
        className="sku-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'rgba(212, 168, 90, 0.10)',
          border: '1px solid rgba(212, 168, 90, 0.22)',
          borderRadius: '12px',
          cursor: 'pointer',
          color: '#1C1917',
          outline: 'none'
        }}
      >
        <span style={{ fontWeight: 600 }}>{selectedSku || 'Select SKU...'}</span>
        <ChevronDown size={18} opacity={0.5} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {isOpen && (
        <div 
          id="sku-listbox"
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            background: '#FFFFFF',
            border: '1px solid rgba(212, 168, 90, 0.28)',
            borderRadius: '12px',
            zIndex: 1000,
            boxShadow: '0 20px 25px -5px rgba(176, 125, 58, 0.18)',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '12px', borderBottom: '1px solid rgba(212, 168, 90, 0.14)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#78716C' }} />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                placeholder="Search SKUs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  background: 'rgba(212, 168, 90, 0.06)',
                  border: 'none',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  color: '#1C1917',
                  outline: 'none',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {filteredSkus.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No SKUs found</div>
            ) : (
              filteredSkus.map((sku, index) => (
                <div
                  key={sku}
                  role="option"
                  aria-selected={sku === selectedSku || index === activeIndex}
                  onClick={() => {
                    onSelect(sku);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: (sku === selectedSku || index === activeIndex) ? 'var(--ent-accent)' : '#78716C',
                    background: (sku === selectedSku || index === activeIndex) ? 'rgba(212, 168, 90, 0.14)' : 'transparent',
                    borderLeft: (sku === selectedSku || index === activeIndex) ? '3px solid var(--ent-accent)' : '3px solid transparent',
                    transition: 'all 0.1s ease'
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {sku}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SKUSelector;
