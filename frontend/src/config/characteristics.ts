/**
 * SUBLIMAROC - Couleurs des caractéristiques produit
 *
 * Chaque type de caractéristique (Type, Anse, Couleurs…) reçoit sa propre
 * couleur, identique partout dans l'application : page Caractéristiques,
 * aperçu produit, aperçu sous-produit.
 *
 * La palette est une palette catégorielle validée (8 teintes) : bande de
 * luminosité, plancher de chroma, séparation en vision des couleurs déficiente
 * et contraste ont été vérifiés avec un validateur, pas choisis à l'œil.
 *
 * Comme il y a plus de types que de teintes distinguables, un second canal
 * prend le relais au-delà de 8 : les slots suivants réutilisent les mêmes
 * teintes en version « douce » (fond teinté + bordure colorée), visuellement
 * différente d'un aplat. Inventer une 9e teinte a été essayé et rejeté :
 * les candidates tombaient sous le plancher de chroma et sous le seuil de
 * différenciation (ΔE 13,1 — indistinguables même en vision normale).
 *
 * La couleur suit la caractéristique, jamais sa position dans une liste :
 * elle reste donc stable quel que soit le produit affiché ou les filtres.
 */

/** Palette catégorielle validée, dans son ordre de validation. */
const PALETTE = [
  '#256abf', // bleu
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // jaune
  '#e87ba4', // magenta
  '#008300', // vert
  '#4a3aa7', // violet
  '#e34948', // rouge
];

/**
 * Couleur du texte sur chaque aplat, choisie pour un contraste WCAG >= 4,5:1
 * (texte de petite taille). Calculée, pas devinée.
 */
const ON_COLOR = [
  '#ffffff', // sur bleu    5,39:1
  '#111111', // sur orange  5,90:1
  '#111111', // sur aqua    6,71:1
  '#111111', // sur jaune   8,72:1
  '#111111', // sur magenta 7,01:1
  '#ffffff', // sur vert    4,95:1
  '#ffffff', // sur violet  8,56:1
  '#111111', // sur rouge   4,78:1
];

export interface CharacteristicType {
  key: string;
  label: string;
  /** Icône Bootstrap Icons affichée dans les tags. */
  icon: string;
}

/** Types de caractéristiques fournis d'origine, dans leur ordre d'affichage. */
export const BASE_CHARACTERISTIC_TYPES: CharacteristicType[] = [
  { key: 'type',       label: 'Type',       icon: 'bi-box' },
  { key: 'anse',       label: 'Anse',       icon: 'bi-handbag' },
  { key: 'couleurs',   label: 'Couleurs',   icon: 'bi-palette' },
  { key: 'dimensions', label: 'Dimensions', icon: 'bi-rulers' },
  { key: 'materiau',   label: 'Matière',    icon: 'bi-layers' },
  { key: 'capacite',   label: 'Capacité',   icon: 'bi-cup' },
  { key: 'poids',      label: 'Poids',      icon: 'bi-speedometer2' },
  { key: 'qualite',    label: 'Qualité',    icon: 'bi-award' },
  { key: 'manches',    label: 'Manches',    icon: 'bi-person-arms-up' },
  { key: 'col',        label: 'Col',        icon: 'bi-person-bounding-box' },
];

/** Slot fixe de chaque type d'origine : la couleur ne bouge jamais. */
const FIXED_SLOTS: Record<string, number> = BASE_CHARACTERISTIC_TYPES.reduce(
  (acc, charType, index) => {
    acc[charType.key] = index;
    return acc;
  },
  {} as Record<string, number>
);

/** Nombre de slots avant réutilisation d'une teinte dans l'autre variante. */
const SLOT_COUNT = PALETTE.length * 2;

/** Hachage stable d'une clé : la même caractéristique garde sa couleur. */
function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  }
  return hash;
}

/**
 * Slot d'une caractéristique : fixe pour les types d'origine, dérivé de la clé
 * pour les types personnalisés (au-delà des 10 premiers slots).
 */
function slotFor(key: string): number {
  const fixed = FIXED_SLOTS[key];
  if (fixed !== undefined) return fixed;

  const custom = BASE_CHARACTERISTIC_TYPES.length;
  const range = SLOT_COUNT - custom;
  return custom + (hashKey(key) % range);
}

export interface CharacteristicStyle {
  backgroundColor: string;
  color: string;
  border: string;
}

/**
 * Style d'un tag de caractéristique, à appliquer en `style={...}`.
 * Slots 0-7 : aplat de couleur. Slots 8+ : même teinte en version douce.
 */
export function getCharacteristicStyle(key: string): CharacteristicStyle {
  const slot = slotFor(key);
  const hue = PALETTE[slot % PALETTE.length];
  const isSoft = Math.floor(slot / PALETTE.length) % 2 === 1;

  if (isSoft) {
    return {
      // Teinte à faible opacité : le texte reste sur un fond quasi blanc,
      // donc lisible, et la bordure porte l'identité de la couleur.
      backgroundColor: `${hue}22`,
      color: '#1a1a1a',
      border: `1.5px solid ${hue}`,
    };
  }

  return {
    backgroundColor: hue,
    color: ON_COLOR[slot % PALETTE.length],
    border: '1.5px solid transparent',
  };
}

/** Couleur seule d'une caractéristique (pastille, bordure, point de légende). */
export function getCharacteristicColor(key: string): string {
  return PALETTE[slotFor(key) % PALETTE.length];
}

/** Icône d'une caractéristique ; les types personnalisés reçoivent une étiquette. */
export function getCharacteristicIcon(key: string): string {
  return BASE_CHARACTERISTIC_TYPES.find((c) => c.key === key)?.icon || 'bi-tag';
}

/** Catégories proposées pour un produit, dans l'ordre du menu. */
export const PRODUCT_CATEGORIES = [
  'Carterie',
  'Papeterie',
  'Textile',
  'Supports',
  'Packaging',
  'Accessoires',
];
