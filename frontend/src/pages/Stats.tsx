import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import CustomSelect from '../components/CustomSelect';
import { ChartCard, StackedColumnChart, BarChart, DonutChart, Sparkline } from '../components/charts/Charts';
import { VIZ, asLabel, formatMAD, formatCompact, formatNumber, toDate } from '../components/charts/chartUtils';
import { AchatService, ArticleService, ProductService } from '../services/apiService';
import { Product } from '../types';
import './Stats.css';

type PurchaseKind = 'materiel' | 'article';

interface Purchase {
  id: string;
  reference: string;
  fournisseur: string;
  total: number;
  date: Date | null;
  etat: string;
  kind: PurchaseKind;
}

interface CatalogArticle {
  id: string;
  prixUnitaire: number;
  quantite: number;
}

const MONTHS_SHORT = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];
const MONTHS_LONG = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const SERIES = [
  { name: 'Matières', color: VIZ.series[0] },
  { name: 'Articles', color: VIZ.series[1] },
];

/** Normalise un achat Firestore (matières ou articles) vers un format commun. */
const normalizePurchase = (raw: any, kind: PurchaseKind): Purchase => ({
  id: raw.id,
  reference: asLabel(raw.referenceAchat) || raw.id,
  fournisseur: asLabel(raw.fournisseur?.nom) || 'Fournisseur non renseigné',
  total: Number(raw.totalAchat) || 0,
  date: toDate(raw.dateCommande) || toDate(raw.dateAchat) || toDate(raw.createdAt),
  etat: asLabel(raw.etat) || 'En cours',
  kind,
});

const Stats: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<CatalogArticle[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('12m');

  useEffect(() => {
    const load = async () => {
      try {
        const [productsData, achatsData, achatsArticlesData, articlesData] = await Promise.all([
          ProductService.getAllProducts(),
          AchatService.getAllAchats(),
          AchatService.getAllAchatsArticles(),
          ArticleService.getAllArticles(),
        ]);

        setProducts(productsData);
        setArticles(
          articlesData.map((a: any) => ({
            id: a.id,
            prixUnitaire: Number(a.prixUnitaire) || 0,
            quantite: Number(a.quantite) || 0,
          }))
        );
        setPurchases([
          ...achatsData.map((a: any) => normalizePurchase(a, 'materiel')),
          ...achatsArticlesData.map((a: any) => normalizePurchase(a, 'article')),
        ]);
      } catch (err) {
        console.error('Erreur lors du chargement des statistiques:', err);
        setError("Impossible de charger les données. Vérifiez votre connexion, puis rechargez la page.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* Années présentes dans les données, pour le filtre de période */
  const years = useMemo(() => {
    const set = new Set<number>();
    purchases.forEach((p) => p.date && set.add(p.date.getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [purchases]);

  /* Fenêtre de 12 mois : glissante par défaut, calendaire si une année est choisie */
  const months = useMemo(() => {
    const list: { year: number; month: number }[] = [];
    if (period === '12m') {
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        list.push({ year: d.getFullYear(), month: d.getMonth() });
      }
    } else {
      const year = Number(period);
      for (let m = 0; m < 12; m++) list.push({ year, month: m });
    }
    return list;
  }, [period]);

  const periodLabel = period === '12m' ? '12 derniers mois' : `Année ${period}`;

  const filteredPurchases = useMemo(() => {
    const first = months[0];
    const last = months[months.length - 1];
    const start = new Date(first.year, first.month, 1).getTime();
    const end = new Date(last.year, last.month + 1, 1).getTime();
    return purchases.filter((p) => p.date && p.date.getTime() >= start && p.date.getTime() < end);
  }, [purchases, months]);

  /* Dépenses mensuelles, séparées matières / articles */
  const monthly = useMemo(
    () =>
      months.map(({ year, month }) => {
        const inMonth = filteredPurchases.filter(
          (p) => p.date!.getFullYear() === year && p.date!.getMonth() === month
        );
        const materiel = inMonth.filter((p) => p.kind === 'materiel').reduce((s, p) => s + p.total, 0);
        const article = inMonth.filter((p) => p.kind === 'article').reduce((s, p) => s + p.total, 0);
        return {
          label: MONTHS_SHORT[month],
          fullLabel: `${MONTHS_LONG[month]} ${year}`,
          values: [materiel, article],
        };
      }),
    [months, filteredPurchases]
  );

  const totalDepenses = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
  const enCours = filteredPurchases.filter((p) => p.etat !== 'Reçue').length;
  const panierMoyen = filteredPurchases.length ? totalDepenses / filteredPurchases.length : 0;

  const valeurStock = useMemo(
    () =>
      products.reduce((sum, p) => sum + (Number(p.prix) || 0) * (Number(p.stock) || 0), 0) +
      articles.reduce((sum, a) => sum + a.prixUnitaire * a.quantite, 0),
    [products, articles]
  );

  /* Top 5 fournisseurs sur la période */
  const topFournisseurs = useMemo(() => {
    const map = new Map<string, { total: number; commandes: number }>();
    filteredPurchases.forEach((p) => {
      const entry = map.get(p.fournisseur) || { total: 0, commandes: 0 };
      entry.total += p.total;
      entry.commandes += 1;
      map.set(p.fournisseur, entry);
    });
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, value: v.total, commandes: v.commandes }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredPurchases]);

  /* Catalogue par catégorie : 5 premières + « Autres » en gris neutre */
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const key = asLabel(p.categorie) || 'Sans catégorie';
      map.set(key, (map.get(key) || 0) + 1);
    });
    const sorted = Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const head = sorted.slice(0, 5).map((d, i) => ({ ...d, color: VIZ.series[i] }));
    const tail = sorted.slice(5);
    if (tail.length) {
      head.push({
        label: `Autres (${tail.length})`,
        value: tail.reduce((s, d) => s + d.value, 0),
        color: VIZ.neutral,
      });
    }
    return head;
  }, [products]);

  /* Produits sous le seuil d'alerte */
  const stockAlerts = useMemo(
    () =>
      products
        .map((p) => ({ id: p.id, nom: asLabel(p.nom) || 'Produit sans nom', stock: Number(p.stock) || 0 }))
        .filter((p) => p.stock <= 10)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 8),
    [products]
  );

  const severity = (stock: number) =>
    stock === 0
      ? { color: VIZ.status.critical, icon: 'bi-x-octagon-fill', label: 'Rupture' }
      : stock <= 5
      ? { color: VIZ.status.serious, icon: 'bi-exclamation-triangle-fill', label: 'Critique' }
      : { color: VIZ.status.warning, icon: 'bi-exclamation-circle-fill', label: 'Faible' };

  if (loading) {
    return (
      <div className="stats-page">
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Chargement des statistiques…</p>
        </Container>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <Container className="py-5">
        {/* En-tête + filtre unique, en haut, appliqué à tous les graphiques */}
        <div className="stats-header">
          <h1>
            <i className="bi bi-graph-up-arrow"></i>
            Statistiques
          </h1>
          <div className="stats-filter">
            <span className="stats-filter-label">Période</span>
            <CustomSelect value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="12m">12 derniers mois</option>
              {years.map((year) => (
                <option key={year} value={String(year)}>
                  Année {year}
                </option>
              ))}
            </CustomSelect>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Indicateurs clés */}
        <Row className="g-3 mb-4">
          <Col lg={4}>
            <Card className="stat-tile stat-tile-hero h-100">
              <Card.Body>
                <div className="stat-label">Dépenses d'achat · {periodLabel}</div>
                <div className="stat-hero-value">{formatMAD(totalDepenses)}</div>
                <div className="stat-hero-foot">
                  <Sparkline
                    values={monthly.map((m) => m.values[0] + m.values[1])}
                    color="rgba(255, 255, 255, 0.92)"
                  />
                  <span className="stat-hero-hint">
                    {formatNumber(filteredPurchases.length)} commande
                    {filteredPurchases.length > 1 ? 's' : ''} sur la période
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={2}>
            <Card className="stat-tile h-100">
              <Card.Body>
                <div className="stat-label">Commandes</div>
                <div className="stat-value">{formatNumber(filteredPurchases.length)}</div>
                <div className="stat-note">
                  <i
                    className={`bi ${enCours ? 'bi-hourglass-split' : 'bi-check-circle-fill'}`}
                    style={{ color: enCours ? VIZ.status.warning : VIZ.status.good }}
                  ></i>
                  {enCours ? `${enCours} en cours` : 'Toutes reçues'}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={2}>
            <Card className="stat-tile h-100">
              <Card.Body>
                <div className="stat-label">Valeur du stock</div>
                <div className="stat-value">{formatCompact(valeurStock)}</div>
                <div className="stat-note">MAD · produits + articles</div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={2}>
            <Card className="stat-tile h-100">
              <Card.Body>
                <div className="stat-label">Catalogue</div>
                <div className="stat-value">{formatNumber(products.length)}</div>
                <div className="stat-note">{formatNumber(articles.length)} articles référencés</div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={2}>
            <Card className="stat-tile h-100">
              <Card.Body>
                <div className="stat-label">Panier moyen</div>
                <div className="stat-value">{formatCompact(panierMoyen)}</div>
                <div className="stat-note">MAD par commande</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Évolution + répartition du catalogue */}
        <Row className="g-4 mb-4">
          <Col lg={8}>
            <ChartCard
              title="Dépenses d'achat par mois"
              subtitle={`${periodLabel} · matières et articles`}
              legend={SERIES}
              isEmpty={totalDepenses === 0}
              table={
                <table className="viz-table">
                  <thead>
                    <tr>
                      <th>Mois</th>
                      <th className="num">Matières</th>
                      <th className="num">Articles</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.fullLabel}>
                        <td>{m.fullLabel}</td>
                        <td className="num">{formatMAD(m.values[0])}</td>
                        <td className="num">{formatMAD(m.values[1])}</td>
                        <td className="num">{formatMAD(m.values[0] + m.values[1])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <StackedColumnChart data={monthly} series={SERIES} formatValue={formatMAD} />
            </ChartCard>
          </Col>

          <Col lg={4}>
            <ChartCard
              title="Catalogue par catégorie"
              subtitle={`${formatNumber(products.length)} produits`}
              isEmpty={categories.length === 0}
              emptyMessage="Aucun produit au catalogue"
              table={
                <table className="viz-table">
                  <thead>
                    <tr>
                      <th>Catégorie</th>
                      <th className="num">Produits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.label}>
                        <td>{c.label}</td>
                        <td className="num">{formatNumber(c.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <DonutChart data={categories} centerLabel="produits" formatValue={formatNumber} />
            </ChartCard>
          </Col>
        </Row>

        {/* Fournisseurs + alertes de stock */}
        <Row className="g-4">
          <Col lg={7}>
            <ChartCard
              title="Principaux fournisseurs"
              subtitle={`Montant commandé · ${periodLabel}`}
              isEmpty={topFournisseurs.length === 0}
              table={
                <table className="viz-table">
                  <thead>
                    <tr>
                      <th>Fournisseur</th>
                      <th className="num">Commandes</th>
                      <th className="num">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topFournisseurs.map((f) => (
                      <tr key={f.label}>
                        <td>{f.label}</td>
                        <td className="num">{formatNumber(f.commandes)}</td>
                        <td className="num">{formatMAD(f.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <BarChart data={topFournisseurs} formatValue={formatMAD} />
            </ChartCard>
          </Col>

          <Col lg={5}>
            <ChartCard
              title="Alertes de stock"
              subtitle="Produits à 10 unités ou moins"
              isEmpty={stockAlerts.length === 0}
              emptyMessage="Aucun produit sous le seuil d'alerte"
            >
              <div className="stock-alerts">
                {stockAlerts.map((p) => {
                  const level = severity(p.stock);
                  return (
                    <div className="stock-alert-row" key={p.id}>
                      <i className={`bi ${level.icon}`} style={{ color: level.color }}></i>
                      <span className="stock-alert-name">{p.nom}</span>
                      <span className="stock-alert-state" style={{ color: level.color }}>
                        {level.label}
                      </span>
                      <span className="stock-alert-qty">{formatNumber(p.stock)}</span>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Stats;
