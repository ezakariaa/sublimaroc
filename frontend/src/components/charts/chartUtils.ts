import { useEffect, useRef, useState } from 'react';

/**
 * Jetons de couleur des graphiques.
 * Palette catégorielle validée (écart CVD ΔE ≥ 8 sur les paires adjacentes,
 * ΔE normal ≥ 15) sur la surface blanche des cartes. Les teintes aqua / jaune /
 * magenta passent sous 3:1 de contraste : elles ne sont jamais seules porteuses
 * de sens — étiquettes visibles + vue tableau accompagnent systématiquement.
 */
export const VIZ = {
  surface: '#ffffff',
  ink: '#0b0b0b',
  inkSecondary: '#52514e',
  inkMuted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
  neutral: '#b9b7ae',
  status: {
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
  },
};

/** Largeur réelle du conteneur : les SVG sont rendus à la taille disponible. */
export function useContainerWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/** Graduations arrondies (0 / 1 000 / 2 000 …) couvrant la valeur max. */
export function niceTicks(max: number, count = 4): number[] {
  if (!isFinite(max) || max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const ticks: number[] = [];
  for (let value = 0; value < max - step * 1e-6; value += step) ticks.push(value);
  ticks.push(ticks.length ? ticks[ticks.length - 1] + step : step);
  return ticks;
}

const nfInt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nfCompact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

/** 12 480 → « 12 480 MAD » */
export const formatMAD = (value: number): string => `${nfInt.format(Math.round(value))} MAD`;

/** 12 480 → « 12,5 k » (axes et grands nombres) */
export const formatCompact = (value: number): string =>
  Math.abs(value) < 1000 ? nfInt.format(Math.round(value)) : nfCompact.format(value);

export const formatNumber = (value: number): string => nfInt.format(Math.round(value));

/** Rectangle à extrémité haute arrondie (4 px), pied carré sur la ligne de base. */
export function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return [
    `M${x},${y + h}`,
    `L${x},${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    `L${x + w - rr},${y}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `L${x + w},${y + h}`,
    'Z',
  ].join(' ');
}

/** Rectangle à extrémité droite arrondie (barres horizontales). */
export function rightRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w, h / 2));
  return [
    `M${x},${y}`,
    `L${x + w - rr},${y}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `L${x + w},${y + h - rr}`,
    `Q${x + w},${y + h} ${x + w - rr},${y + h}`,
    `L${x},${y + h}`,
    'Z',
  ].join(' ');
}

/** Secteur d'anneau entre deux angles (radians, 0 = midi, sens horaire). */
export function donutArc(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
): string {
  const point = (radius: number, angle: number) => ({
    x: cx + radius * Math.sin(angle),
    y: cy - radius * Math.cos(angle),
  });
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const o1 = point(rOuter, startAngle);
  const o2 = point(rOuter, endAngle);
  const i2 = point(rInner, endAngle);
  const i1 = point(rInner, startAngle);
  return [
    `M${o1.x},${o1.y}`,
    `A${rOuter},${rOuter} 0 ${largeArc} 1 ${o2.x},${o2.y}`,
    `L${i2.x},${i2.y}`,
    `A${rInner},${rInner} 0 ${largeArc} 0 ${i1.x},${i1.y}`,
    'Z',
  ].join(' ');
}

/**
 * Ramène un champ Firestore à un libellé affichable.
 * Les documents existants stockent parfois un tableau (ou un nombre) là où le
 * modèle annonce une chaîne — d'où la normalisation avant tout `.trim()`.
 */
export function asLabel(value: any): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(asLabel).filter(Boolean).join(', ');
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/** Convertit un champ date Firestore / ISO / Date en Date exploitable. */
export function toDate(value: any): Date | null {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return isNaN(date?.getTime?.() ?? NaN) ? null : date;
}
