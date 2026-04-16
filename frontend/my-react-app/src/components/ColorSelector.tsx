import React from 'react';
import SearchableFilter from './SearchableFilter';

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
    <SearchableFilter
      options={colors}
      selected={selectedColor}
      onSelect={onSelect}
      label={label}
      placeholder="Search colors..."
      width="180px"
    />
  );
};

export default ColorSelector;
