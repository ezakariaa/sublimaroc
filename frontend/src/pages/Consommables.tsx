/**
 * SUBLIMAROC - Achats de consommables
 *
 * Même page que « Matériels », branchée sur la collection Firestore
 * « Consommables ». Toute la logique est dans `Achats.tsx` ; la variante est
 * décrite dans `config/achats.ts`.
 */

import React from 'react';
import Achats from './Achats';

const Consommables: React.FC = () => <Achats variant="consommable" />;

export default Consommables;
