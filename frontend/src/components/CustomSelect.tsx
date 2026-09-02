import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

/** Aplatit le contenu d'une `<option>` en texte, y compris `{a}{b}`. */
function optionLabel(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((part) => (typeof part === 'object' ? '' : String(part)))
    .join('');
}

function parseOptions(children: React.ReactNode): OptionItem[] {
  const options: OptionItem[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === 'option') {
      const props = child.props as { value?: string; children?: React.ReactNode };
      options.push({
        value: props.value ?? '',
        label: optionLabel(props.children),
      });
    }
  });
  return options;
}

/** Hauteur maximale de la liste déroulante, en pixels. */
const MAX_DROPDOWN_HEIGHT = 260;
const GAP = 2;

const CustomSelect: React.FC<CustomSelectProps> = ({
  value = '',
  onChange,
  children,
  disabled,
  className = '',
  style,
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<React.CSSProperties | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const options = parseOptions(children);
  const selected = options.find((o) => o.value === value);

  /**
   * Position de la liste en coordonnées écran.
   *
   * La liste est rendue dans un portail sur `document.body` : sans cela, un
   * parent défilant (le corps des modales, en `overflow-y: auto`) la rognerait
   * et seules les premières options resteraient visibles.
   */
  const computePosition = useCallback((): React.CSSProperties | null => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    // Ouvrir vers le haut seulement si le bas est trop à l'étroit
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;

    return {
      position: 'fixed',
      left: rect.left,
      right: 'auto',
      width: rect.width,
      maxHeight: Math.max(120, Math.min(MAX_DROPDOWN_HEIGHT, available)),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + GAP }
        : { top: rect.bottom + GAP }),
    };
  }, []);

  const openDropdown = useCallback(() => {
    setPosition(computePosition());
    setOpen(true);
  }, [computePosition]);

  const toggle = useCallback(() => {
    if (disabled) return;
    if (open) setOpen(false);
    else openDropdown();
  }, [disabled, open, openDropdown]);

  // Fermeture au clic extérieur : la liste étant dans un portail, elle n'est
  // pas contenue dans le wrapper — il faut tester les deux éléments.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };

    // Un défilement déplacerait le champ sans déplacer la liste : on suit.
    const handleReposition = () => setPosition(computePosition());

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, computePosition]);

  const handleSelect = (optionValue: string) => {
    const syntheticEvent = {
      target: { value: optionValue },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange?.(syntheticEvent);
    setOpen(false);
  };

  const dropdown =
    open && position ? (
      <ul ref={dropdownRef} className="custom-select-dropdown" style={position}>
        {options.length === 0 ? (
          <li className="custom-select-option cs-placeholder">Aucune option disponible</li>
        ) : (
          options.map((opt) => (
            <li
              key={opt.value}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''} ${
                opt.value === '' ? 'cs-placeholder' : ''
              }`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))
        )}
      </ul>
    ) : null;

  return (
    <div
      ref={wrapperRef}
      className={`custom-select-wrapper ${className} ${disabled ? 'disabled' : ''}`}
      style={style}
    >
      <div
        className={`custom-select-trigger ${open ? 'open' : ''}`}
        onClick={toggle}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <span className={!selected || selected.value === '' ? 'cs-placeholder' : ''}>
          {selected ? selected.label : options[0]?.label ?? ''}
        </span>
      </div>
      {dropdown && createPortal(dropdown, document.body)}
    </div>
  );
};

export default CustomSelect;
