/**
 * SUBLIMAROC - Tags de caractéristiques
 *
 * Rend les valeurs de caractéristiques d'un produit, d'un sous-produit ou
 * d'une variation, chacune dans la couleur de sa caractéristique
 * (voir `config/characteristics.ts`).
 *
 * Un seul composant pour tous les emplacements (tableaux et aperçus), afin
 * qu'une même caractéristique ait partout exactement la même couleur.
 */

import React from 'react';
import {
  BASE_CHARACTERISTIC_TYPES,
  getCharacteristicStyle,
  getCharacteristicIcon,
} from '../config/characteristics';

/** Champs d'un produit qui ne sont pas des caractéristiques. */
const NON_CHARACTERISTIC_FIELDS = [
  'id', 'nom', 'description', 'prix', 'image', 'images', 'categorie',
  'stock', 'fournisseur', 'dateCreation', 'dateModification',
  'productId', 'variations',
];

interface CharacteristicTagsProps {
  /**
   * Produit, sous-produit, ou objet `characteristics` d'une variation.
   * Les valeurs peuvent être des tableaux (produits) ou des chaînes
   * (variations) : les deux formes sont acceptées.
   */
  source: Record<string, any> | null | undefined;
  /** Taille de police des tags. */
  fontSize?: string;
  /** Préfixe chaque valeur du nom de sa caractéristique (« Couleurs: Rouge »). */
  showLabel?: boolean;
  /** Masque les icônes, pour les contextes très denses. */
  hideIcons?: boolean;
}

/** Ramène une valeur brute à une liste de chaînes non vides. */
function toValues(raw: any): string[] {
  if (Array.isArray(raw)) return raw.filter((v) => v !== null && v !== undefined && v !== '');
  if (raw === null || raw === undefined || raw === '') return [];
  if (typeof raw === 'object') return [];
  return [String(raw)];
}

const CharacteristicTags: React.FC<CharacteristicTagsProps> = ({
  source,
  fontSize = '0.7rem',
  showLabel = false,
  hideIcons = false,
}) => {
  if (!source) return null;

  // Caractéristiques d'origine d'abord, dans leur ordre habituel, puis les
  // caractéristiques personnalisées ajoutées par l'utilisateur.
  const baseKeys = BASE_CHARACTERISTIC_TYPES.map((c) => c.key);
  const customKeys = Object.keys(source).filter(
    (key) => !baseKeys.includes(key) && !NON_CHARACTERISTIC_FIELDS.includes(key)
  );

  const tags: React.ReactNode[] = [];

  [...BASE_CHARACTERISTIC_TYPES, ...customKeys.map((key) => ({ key, label: key }))].forEach(
    (charType) => {
      const values = toValues(source[charType.key]);
      if (values.length === 0) return;

      values.forEach((value, index) => {
        tags.push(
          <span
            key={`${charType.key}-${index}`}
            className="badge"
            title={`${charType.label} : ${value}`}
            style={{ ...getCharacteristicStyle(charType.key), fontSize }}
          >
            {!hideIcons && <i className={`bi ${getCharacteristicIcon(charType.key)} me-1`}></i>}
            {showLabel ? `${charType.label} : ${value}` : value}
          </span>
        );
      });
    }
  );

  if (tags.length === 0) return null;

  return <>{tags}</>;
};

export default CharacteristicTags;
