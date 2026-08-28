import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

interface OptionItem {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function parseOptions(children: React.ReactNode): OptionItem[] {
  const options: OptionItem[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === 'option') {
      const props = child.props as { value?: string; children?: React.ReactNode };
      options.push({
        value: props.value ?? '',
        label: String(props.children ?? ''),
      });
    }
  });
  return options;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value = '',
  onChange,
  children,
  disabled,
  className = '',
  style,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = parseOptions(children);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    const syntheticEvent = {
      target: { value: optionValue },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange?.(syntheticEvent);
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      className={`custom-select-wrapper ${className} ${disabled ? 'disabled' : ''}`}
      style={style}
    >
      <div
        className={`custom-select-trigger ${open ? 'open' : ''}`}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setOpen((prev) => !prev);
          }
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <span className={!selected || selected.value === '' ? 'cs-placeholder' : ''}>
          {selected ? selected.label : (options[0]?.label ?? '')}
        </span>
      </div>
      {open && (
        <ul className="custom-select-dropdown">
          {options.map((opt) => (
            <li
              key={opt.value}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''} ${opt.value === '' ? 'cs-placeholder' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
