/**
 * SUBLIMAROC - Autres dépenses
 *
 * Même page que « Matériels » et « Consommables », branchée sur la
 * collection Firestore « AutresDepenses » : loyer, électricité, internet,
 * produits d'entretien… Toute la logique est dans `Achats.tsx` ; la
 * variante est décrite dans `config/achats.ts`.
 */

import React from 'react';
import Achats from './Achats';

const AutresDepenses: React.FC = () => <Achats variant="autredepense" />;

export default AutresDepenses;
