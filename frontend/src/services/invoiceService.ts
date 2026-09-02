/**
 * SUBLIMAROC - Génération des factures PDF
 *
 * Construit la facture d'une vente avec jsPDF et la table jspdf-autotable,
 * puis la télécharge. Le rendu est identique quel que soit le navigateur,
 * contrairement à une impression HTML.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vente, VenteStatut } from '../types';

/** Couleurs de la charte, reprises de l'en-tête de l'application. */
const BRAND = { r: 66, g: 66, b: 114 };
const MUTED = { r: 108, g: 117, b: 125 };

const STATUT_LABELS: Record<VenteStatut, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

/** Coordonnées de l'émetteur affichées en tête de facture. */
const EMETTEUR = {
  nom: 'SUBLIMAROC',
  activite: 'Impression et personnalisation',
  ville: 'Maroc',
};

function formatMoney(value: number): string {
  return `${(value || 0).toFixed(2)} DH`;
}

function formatDate(value: any): string {
  if (!value) return '-';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
}

/** Nom de fichier sûr, dérivé de la référence de vente. */
function fileName(vente: Vente): string {
  const reference = (vente.referenceVente || vente.id || 'facture').replace(/[^\w.-]/g, '_');
  return `Facture-${reference}.pdf`;
}

/**
 * Construit le document. Séparé du téléchargement pour que l'aperçu et
 * l'enregistrement partagent exactement la même mise en page.
 */
function buildInvoice(vente: Vente): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 15;

  // ── En-tête ─────────────────────────────────────────────
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(EMETTEUR.nom, marginX, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(EMETTEUR.activite, marginX, 21);
  doc.text(EMETTEUR.ville, marginX, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FACTURE', pageWidth - marginX, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(vente.referenceVente || vente.id, pageWidth - marginX, 22, { align: 'right' });

  // ── Client et informations de vente ─────────────────────
  let y = 45;
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Facturé à', marginX, y);
  doc.text('Détails', pageWidth / 2 + 10, y);

  doc.setTextColor(33, 37, 41);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 6;

  const client = vente.client || ({} as any);
  const clientLines = [
    client.nom || 'Client non renseigné',
    client.adresse || '',
    client.ville || '',
    client.telephone || '',
    client.email || '',
  ].filter(Boolean);

  clientLines.forEach((line, index) => {
    doc.text(String(line), marginX, y + index * 5);
  });

  const detailLines = [
    ['Date de vente', formatDate(vente.dateVente)],
    ['Statut', STATUT_LABELS[vente.statut] || String(vente.statut || '-')],
    ['Nombre de lignes', String((vente.produits || []).length)],
  ];
  detailLines.forEach(([label, value], index) => {
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(`${label} :`, pageWidth / 2 + 10, y + index * 5);
    doc.setTextColor(33, 37, 41);
    doc.text(String(value), pageWidth - marginX, y + index * 5, { align: 'right' });
  });

  y += Math.max(clientLines.length, detailLines.length) * 5 + 8;

  // ── Lignes de la facture ────────────────────────────────
  const rows = (vente.produits || []).map((ligne, index) => [
    String(index + 1),
    ligne.designation || '-',
    String(ligne.quantite ?? 0),
    formatMoney(ligne.prixUnitaire),
    formatMoney(ligne.total ?? (ligne.prixUnitaire || 0) * (ligne.quantite || 0)),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Désignation', 'Qté', 'Prix unitaire', 'Total']],
    body: rows.length > 0 ? rows : [['-', 'Aucune ligne', '-', '-', '-']],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: marginX, right: marginX },
  });

  // `lastAutoTable` est posé sur le document par jspdf-autotable.
  const afterTable = (doc as any).lastAutoTable?.finalY ?? y + 20;

  // ── Total ───────────────────────────────────────────────
  const totalY = afterTable + 10;
  const boxWidth = 70;
  const boxX = pageWidth - marginX - boxWidth;

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(boxX, totalY - 6, boxWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL', boxX + 4, totalY + 2);
  doc.text(formatMoney(vente.total), boxX + boxWidth - 4, totalY + 2, { align: 'right' });

  // ── Notes et pied de page ───────────────────────────────
  let footerY = totalY + 18;
  if (vente.notes) {
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(`Notes : ${vente.notes}`, pageWidth - marginX * 2), marginX, footerY);
    footerY += 10;
  }

  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.setFontSize(8);
  doc.text(
    `Facture générée le ${new Date().toLocaleDateString('fr-FR')} — ${EMETTEUR.nom}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 12,
    { align: 'center' }
  );

  return doc;
}

/** Télécharge la facture d'une vente. */
export function downloadInvoice(vente: Vente): void {
  buildInvoice(vente).save(fileName(vente));
}

/**
 * URL blob du PDF, pour un aperçu dans un `<iframe>`.
 * Une URL `data:` serait refusée par le lecteur PDF de Chrome dans une iframe.
 * L'appelant doit libérer l'URL avec `URL.revokeObjectURL` après usage.
 */
export function invoiceObjectUrl(vente: Vente): string {
  return String(buildInvoice(vente).output('bloburl'));
}
