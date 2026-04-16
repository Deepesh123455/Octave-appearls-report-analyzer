import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchableFilterProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  label: string;
  placeholder?: string;
  width?: string;
}

const SearchableFilter: React.FC<SearchableFilterProps> = ({
  options,
  selected,
  onSelect,
  label,
  placeholder = 'Search...',
  width = '200px'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt => 
      opt.toLowerCase().includes(searchTerm.toLowerCase()) || opt === 'ALL'
    );
  }, [options, searchTerm]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        e.preventDefault();
        break;
      case 'ArrowUp':
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        e.preventDefault();
        break;
      case 'Enter':
        if (activeIndex >= 0) {
          onSelect(filteredOptions[activeIndex]);
          setIsOpen(false);
          setSearchTerm('');
        }
        e.preventDefault();
        break;
      case 'Escape':
        setIsOpen(false);
        e.preventDefault();
        break;
    }
  };

  return (
    <div className="filter-group" ref={dropdownRef} style={{ width, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
      <div className="filter-label" style={{ 
        fontSize: '10px', 
        fontWeight: 700, 
        letterSpacing: '0.12em', 
        color: '#A8A29E',
        marginBottom: '2px',
        marginLeft: '4px'
      }}>
        {label.toUpperCase()}
      </div>
      <div 
        className="filter-select"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          position: 'relative',
          padding: '8px 14px',
          background: selected !== 'ALL' ? 'rgba(212, 168, 90, 0.05)' : '#FFFFFF',
          border: isOpen ? '1px solid var(--primary-light)' : '1px solid rgba(212, 168, 90, 0.18)',
          borderRadius: '12px',
          boxShadow: isOpen 
            ? '0 4px 12px rgba(176, 125, 58, 0.12)' 
            : '0 2px 4px rgba(0, 0, 0, 0.02)',
          transition: 'all 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
          minWidth: '100%'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '85%' }}>
          {selected !== 'ALL' && (
            <div style={{ 
              width: '5px', 
              height: '5px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary)',
              boxShadow: '0 0 8px var(--primary-glow)'
            }} />
          )}
          <span style={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            fontSize: '13px',
            fontWeight: 600,
            color: selected !== 'ALL' ? 'var(--text-main)' : 'var(--text-muted)'
          }}>
            {selected === 'ALL' ? `All ${label}s` : selected}
          </span>
        </div>
        <ChevronDown 
          size={14} 
          style={{ 
            opacity: 0.5, 
            transform: isOpen ? 'rotate(180deg)' : 'none', 
            transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)' 
          }} 
        />

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 12, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#FFFFFF',
                border: '1px solid rgba(212, 168, 90, 0.25)',
                borderRadius: '14px',
                boxShadow: '0 20px 25px -5px rgba(176, 125, 58, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                zIndex: 1000,
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ 
                padding: '10px', 
                background: 'rgba(212, 168, 90, 0.02)',
                borderBottom: '1px solid rgba(212, 168, 90, 0.08)'
              }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#B07D3A', opacity: 0.6 }} />
                  <input
                    autoFocus
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                      width: '100%',
                      background: '#FFFFFF',
                      border: '1px solid rgba(212, 168, 90, 0.12)',
                      padding: '8px 10px 8px 32px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      outline: 'none',
                      color: '#1C1917',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  />
                </div>
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px' }} className="premium-scrollbar">
                {filteredOptions.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>No matches found</div>
                ) : (
                  filteredOptions.map((opt, idx) => (
                    <div
                      key={opt}
                      onClick={() => {
                        onSelect(opt);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        color: opt === selected || idx === activeIndex ? 'var(--primary)' : '#4B5563',
                        background: opt === selected || idx === activeIndex ? 'rgba(212, 168, 90, 0.06)' : 'transparent',
                        fontWeight: opt === selected ? 700 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{opt === 'ALL' ? `All ${label}s` : opt}</span>
                      {opt === selected && (
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SearchableFilter;
