import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap';
import CustomSelect from '../components/CustomSelect';
import { ChartCard, StackedColumnChart, BarChart, DonutChart, Sparkline } from '../components/charts/Charts';
import { VIZ, asLabel, formatMAD, formatCompact, formatNumber, toDate } from '../components/charts/chartUtils';
import {
  AchatService,
  ArticleService,
  ConsommableService,
  ProductService,
  SubProductService,
  VenteService,
} from '../services/apiService';
import { Product } from '../types';
import './Stats.css';

type PurchaseKind = 'materiel' | 'article' | 'consommable';

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
  { name: 'Matériels', color: VIZ.series[0] },
  { name: 'Articles', color: VIZ.series[1] },
  { name: 'Consommables', color: VIZ.series[2] },
];

/** Vente ramenée aux seules données utiles aux statistiques. */
interface Sale {
  id: string;
  total: number;
  date: Date | null;
  statut: string;
}

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
  const [subProductsCount, setSubProductsCount] = useState(0);
  const [articles, setArticles] = useState<CatalogArticle[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('12m');

  /**
   * Recharge toutes les collections qui alimentent la page.
   *
   * Les statistiques sont dérivées, jamais stockées : ce chargement suffit à
   * refléter toute modification faite ailleurs dans l'application.
   */
  const load = useCallback(async () => {
    try {
      setError(null);
      const [
        productsData,
        subProductsData,
        achatsData,
        achatsArticlesData,
        consommablesData,
        articlesData,
        ventesData,
      ] = await Promise.all([
        ProductService.getAllProducts(),
        SubProductService.getAllSubProducts(),
        AchatService.getAllAchats(),
        AchatService.getAllAchatsArticles(),
        ConsommableService.getAllConsommables(),
        ArticleService.getAllArticles(),
        VenteService.getAllVentes(),
      ]);

      setProducts(productsData);
      setSubProductsCount(subProductsData.length);
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
        ...consommablesData.map((a: any) => normalizePurchase(a, 'consommable')),
      ]);
      setSales(
        ventesData.map((v: any) => ({
          id: v.id,
          total: Number(v.total) || 0,
          date: toDate(v.dateVente) || toDate(v.createdAt),
          statut: asLabel(v.statut) || 'pending',
        }))
      );
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setError("Impossible de charger les données. Vérifiez votre connexion, puis rechargez la page.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Rechargement à chaque affichage de la page : les compteurs reflètent
  // donc les modifications faites sur les autres pages.
  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /* Années présentes dans les données, pour le filtre de période */
  const years = useMemo(() => {
    const set = new Set<number>();
    purchases.forEach((p) => p.date && set.add(p.date.getFullYear()));
    sales.forEach((v) => v.date && set.add(v.date.getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [purchases, sales]);

  /**
   * Découpage de la période en tranches, une par colonne du graphique.
   *
   * Mensuel pour les 12 derniers mois et pour une année donnée ; annuel
   * pour « toutes les périodes », où un découpage au mois produirait des
   * dizaines de colonnes illisibles.
   */
  const buckets = useMemo(() => {
    const monthBucket = (year: number, month: number) => ({
      label: MONTHS_SHORT[month],
      fullLabel: `${MONTHS_LONG[month]} ${year}`,
      start: new Date(year, month, 1).getTime(),
      end: new Date(year, month + 1, 1).getTime(),
    });

    if (period === 'all') {
      const set = new Set<number>();
      purchases.forEach((p) => p.date && set.add(p.date.getFullYear()));
      sales.forEach((v) => v.date && set.add(v.date.getFullYear()));

      const present = Array.from(set).sort((a, b) => a - b);
      if (present.length === 0) return [monthBucket(new Date().getFullYear(), new Date().getMonth())];

      // Années continues entre la plus ancienne et la plus récente, pour
      // qu'une année sans activité apparaisse comme un creux et non un trou.
      const list = [];
      for (let year = present[0]; year <= present[present.length - 1]; year++) {
        list.push({
          label: String(year),
          fullLabel: `Année ${year}`,
          start: new Date(year, 0, 1).getTime(),
          end: new Date(year + 1, 0, 1).getTime(),
        });
      }
      return list;
    }

    const list = [];
    if (period === '12m') {
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        list.push(monthBucket(d.getFullYear(), d.getMonth()));
      }
    } else {
      const year = Number(period);
      for (let m = 0; m < 12; m++) list.push(monthBucket(year, m));
    }
    return list;
  }, [period, purchases, sales]);

  const rangeStart = buckets[0]?.start ?? 0;
  const rangeEnd = buckets[buckets.length - 1]?.end ?? 0;

  const periodLabel =
    period === 'all'
      ? 'Toutes les périodes'
      : period === '12m'
      ? '12 derniers mois'
      : `Année ${period}`;

  const filteredPurchases = useMemo(
    () =>
      purchases.filter(
        (p) => p.date && p.date.getTime() >= rangeStart && p.date.getTime() < rangeEnd
      ),
    [purchases, rangeStart, rangeEnd]
  );

  /* Dépenses mensuelles, séparées matières / articles */
  const monthly = useMemo(
    () =>
      buckets.map((bucket) => {
        const inBucket = filteredPurchases.filter(
          (p) => p.date!.getTime() >= bucket.start && p.date!.getTime() < bucket.end
        );
        const sumOf = (kind: PurchaseKind) =>
          inBucket.filter((p) => p.kind === kind).reduce((s, p) => s + p.total, 0);
        return {
          label: bucket.label,
          fullLabel: bucket.fullLabel,
          values: [sumOf('materiel'), sumOf('article'), sumOf('consommable')],
        };
      }),
    [buckets, filteredPurchases]
  );

  const filteredSales = useMemo(
    () =>
      sales.filter((v) => v.date && v.date.getTime() >= rangeStart && v.date.getTime() < rangeEnd),
    [sales, rangeStart, rangeEnd]
  );

  const chiffreAffaires = filteredSales.reduce((sum, v) => sum + v.total, 0);
  const totalDepenses = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
  const marge = chiffreAffaires - totalDepenses;

  const enCours = filteredPurchases.filter((p) => p.etat !== 'Reçue').length;

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
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              title={
                lastUpdate
                  ? `Dernière mise à jour à ${lastUpdate.toLocaleTimeString('fr-FR')}`
                  : 'Actualiser les données'
              }
            >
              <i className={`bi bi-arrow-clockwise me-1 ${refreshing ? 'spin' : ''}`}></i>
              {refreshing ? 'Actualisation…' : 'Actualiser'}
            </Button>
            <span className="stats-filter-label">Période</span>
            <CustomSelect value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="12m">12 derniers mois</option>
              <option value="all">Toutes les périodes</option>
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
                    values={monthly.map((m) => m.values.reduce((a, b) => a + b, 0))}
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
                <div className="stat-label">Marge</div>
                <div className="stat-value" style={{ color: marge >= 0 ? VIZ.status.good : VIZ.status.critical }}>
                  {formatCompact(marge)}
                </div>
                <div className="stat-note">MAD · ventes − dépenses</div>
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
        </Row>

        {/* Compteurs du catalogue et de l'activité */}
        <Row className="g-3 mb-4">
          <Col xs={6} lg={2}>
            <Card className="stat-tile h-100">
              <Card.Body>
                <div className="stat-label">Produits</div>
                <div className="stat-value">{formatNumber(products.length)}</div>
                <div className="stat-note">au catalogue</div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={2}>
            <Card className="stat-tile h-100">
              <Card.Body>
                <div className="stat-label">Sous-Produits</div>
                <div className="stat-value">{formatNumber(subProductsCount)}</div>
                <div className="stat-note">déclinaisons</div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={2}>
            <Card className="stat-tile h-100">
              <Card.Body>
                <div className="stat-label">Articles</div>
                <div className="stat-value">{formatNumber(articles.length)}</div>
                <div className="stat-note">référencés</div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={2}>
            <Card className="stat-tile h-100">
              <Card.Body>
                <div className="stat-label">Achats</div>
                <div className="stat-value">{formatNumber(filteredPurchases.length)}</div>
                <div className="stat-note">
                  {formatNumber(purchases.length)} au total
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={2}>
            <Card className="stat-tile h-100">
              <Card.Body>
                <div className="stat-label">Ventes</div>
                <div className="stat-value">{formatNumber(filteredSales.length)}</div>
                <div className="stat-note">
                  {formatNumber(sales.length)} au total
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={6} lg={2}>
            <Card className="stat-tile h-100">
              <Card.Body>
                <div className="stat-label">Chiffre d'affaires</div>
                <div className="stat-value">{formatCompact(chiffreAffaires)}</div>
                <div className="stat-note">MAD · {periodLabel.toLowerCase()}</div>
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
