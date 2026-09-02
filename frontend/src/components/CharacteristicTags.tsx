/**
 * SUBLIMAROC - Tags de caractéristiques
 *
 * Rend les valeurs de caractéristiques d'un produit, d'un sous-produit,
 * d'un article ou d'une variation, chacune dans la couleur de sa
 * caractéristique (voir `config/characteristics.ts`).
 *
 * Deux présentations :
 *  - par défaut, une suite de tags (tableaux, cellules denses) ;
 *  - `grouped`, une ligne par caractéristique : « Épaisseur : » en texte,
 *    puis ses valeurs en tags (fiches et aperçus).
 *
 * Un seul composant pour tous les emplacements, afin qu'une même
 * caractéristique ait partout exactement la même couleur.
 */

import React from 'react';
import {
  BASE_CHARACTERISTIC_TYPES,
  getCharacteristicStyle,
  getCharacteristicIcon,
  getCharacteristicColor,
} from '../config/characteristics';
import './CharacteristicTags.css';

/** Champs d'un produit qui ne sont pas des caractéristiques. */
const NON_CHARACTERISTIC_FIELDS = [
  'id', 'nom', 'description', 'prix', 'image', 'images', 'categorie',
  'stock', 'fournisseur', 'dateCreation', 'dateModification',
  'productId', 'variations',
];

interface CharacteristicTagsProps {
  /**
   * Produit, sous-produit, article, ou objet `characteristics` d'une variation.
   * Les valeurs peuvent être des tableaux (produits) ou des chaînes
   * (variations) : les deux formes sont acceptées.
   */
  source: Record<string, any> | null | undefined;
  /** Taille de police des tags. */
  fontSize?: string;
  /** Une ligne par caractéristique : nom en texte, valeurs en tags. */
  grouped?: boolean;
  /** Variante resserrée du mode groupé, pour les cellules de tableau. */
  compact?: boolean;
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

interface Group {
  key: string;
  label: string;
  values: string[];
}

const CharacteristicTags: React.FC<CharacteristicTagsProps> = ({
  source,
  fontSize = '0.7rem',
  grouped = false,
  compact = false,
  hideIcons = false,
}) => {
  if (!source) return null;

  // Caractéristiques d'origine d'abord, dans leur ordre habituel, puis les
  // caractéristiques personnalisées ajoutées par l'utilisateur.
  const baseKeys = BASE_CHARACTERISTIC_TYPES.map((c) => c.key);
  const customKeys = Object.keys(source).filter(
    (key) => !baseKeys.includes(key) && !NON_CHARACTERISTIC_FIELDS.includes(key)
  );

  const groups: Group[] = [
    ...BASE_CHARACTERISTIC_TYPES,
    ...customKeys.map((key) => ({ key, label: key })),
  ]
    .map((charType) => ({
      key: charType.key,
      label: charType.label,
      values: toValues(source[charType.key]),
    }))
    .filter((group) => group.values.length > 0);

  if (groups.length === 0) return null;

  const valueTag = (key: string, value: string, index: number) => (
    <span
      key={`${key}-${index}`}
      className="badge char-tag"
      style={{ ...getCharacteristicStyle(key), fontSize }}
    >
      {value}
    </span>
  );

  // Une ligne par caractéristique : « Nom : » puis les valeurs
  if (grouped) {
    return (
      <div className={`char-groups${compact ? ' char-groups--compact' : ''}`}>
        {groups.map((group) => (
          <div className="char-group" key={group.key}>
            <span className="char-group-label">
              {!hideIcons && (
                <i
                  className={`bi ${getCharacteristicIcon(group.key)} me-1`}
                  style={{ color: getCharacteristicColor(group.key) }}
                ></i>
              )}
              {group.label} :
            </span>
            <span className="char-group-values">
              {group.values.map((value, index) => valueTag(group.key, value, index))}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Suite de tags, pour les cellules de tableau
  return (
    <>
      {groups.map((group) =>
        group.values.map((value, index) => (
          <span
            key={`${group.key}-${index}`}
            className="badge char-tag"
            title={`${group.label} : ${value}`}
            style={{ ...getCharacteristicStyle(group.key), fontSize }}
          >
            {!hideIcons && (
              <i className={`bi ${getCharacteristicIcon(group.key)} me-1`}></i>
            )}
            {value}
          </span>
        ))
      )}
    </>
  );
};

export default CharacteristicTags;
