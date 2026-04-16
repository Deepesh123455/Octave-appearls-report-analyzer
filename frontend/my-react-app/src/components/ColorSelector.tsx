import React from 'react';

interface ColorSelectorProps {
  colors: string[];
  selectedColor: string;
  onSelect: (color: string) => void;
  label?: string;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({
  colors,
  selectedColor,
  onSelect,
  label = 'Color',
}) => {
  return (
    <div className="filter-group">
      <div className="filter-label">{label}</div>
      <select
        className="filter-select"
        aria-label={label}
        value={selectedColor}
        onChange={(e) => onSelect(e.target.value)}
      >
        {colors.map((c) => (
          <option key={c} value={c}>
            {c === 'ALL' ? 'All Colors' : c}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ColorSelector;

