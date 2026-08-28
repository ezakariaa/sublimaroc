/**
 * SUBLIMAROC - Script de migration Firebase → MySQL
 *
 * Usage:
 *   cd migration
 *   npm install
 *   node migrate.js
 */

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const mysql = require('mysql2/promise');

// ── Firebase ──────────────────────────────────────────────
const firebaseApp = initializeApp({
  apiKey:        process.env.FIREBASE_API_KEY,
  authDomain:    process.env.FIREBASE_AUTH_DOMAIN,
  projectId:     process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});
const firestore = getFirestore(firebaseApp);

// ── MySQL ─────────────────────────────────────────────────
async function getMySQL() {
  return mysql.createConnection({
    host:     process.env.MYSQL_HOST,
    port:     parseInt(process.env.MYSQL_PORT || '3306'),
    database: process.env.MYSQL_DATABASE,
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    ssl: process.env.MYSQL_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined,
  });
}

// ── Helpers ───────────────────────────────────────────────
function toDate(val) {
  if (!val) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (val.toDate) return val.toDate().toISOString().slice(0, 19).replace('T', ' ');
  if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function jArr(val) {
  return JSON.stringify(Array.isArray(val) ? val : []);
}

// ── Migration Produits ────────────────────────────────────
async function migrateProducts(db) {
  console.log('\n📦 Migration des produits (collection: Produits)...');
  const snap = await getDocs(collection(firestore, 'Produits'));
  console.log(`   ${snap.docs.length} produit(s) trouvé(s) dans Firebase`);

  const standardFields = ['id','nom','description','prix','image','images','categorie','stock',
    'fournisseur','type','anse','dimensions','couleurs','materiau','capacite',
    'poids','qualite','manches','col','dateCreation','dateModification'];

  let success = 0, errors = 0;

  for (const docSnap of snap.docs) {
    const d = docSnap.data();

    // Collecter les champs personnalisés dynamiques
    const customFields = {};
    Object.keys(d).forEach(k => {
      if (!standardFields.includes(k) && Array.isArray(d[k])) {
        customFields[k] = d[k];
      }
    });

    const fournisseur = d.fournisseur || {};
    const productId = d.id || docSnap.id;

    try {
      await db.execute(`
        INSERT INTO products
          (id, nom, description, prix, image, images, categorie, stock,
           fournisseur_nom, fournisseur_ville,
           type, anse, dimensions, couleurs, materiau, capacite, poids, qualite, manches, col,
           custom_fields, date_creation, date_modification)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          nom=VALUES(nom), description=VALUES(description), prix=VALUES(prix),
          image=VALUES(image), images=VALUES(images), categorie=VALUES(categorie),
          stock=VALUES(stock), fournisseur_nom=VALUES(fournisseur_nom),
          fournisseur_ville=VALUES(fournisseur_ville), type=VALUES(type),
          anse=VALUES(anse), dimensions=VALUES(dimensions), couleurs=VALUES(couleurs),
          materiau=VALUES(materiau), capacite=VALUES(capacite), poids=VALUES(poids),
          qualite=VALUES(qualite), manches=VALUES(manches), col=VALUES(col),
          custom_fields=VALUES(custom_fields), date_modification=VALUES(date_modification)
      `, [
        productId,
        d.nom || 'Sans nom',
        d.description || '',
        d.prix || 0,
        d.image || '',
        jArr(d.images),
        d.categorie || '',
        d.stock || 0,
        fournisseur.nom || '',
        fournisseur.ville || '',
        jArr(d.type),
        jArr(d.anse),
        jArr(d.dimensions),
        jArr(d.couleurs),
        jArr(d.materiau),
        jArr(d.capacite),
        jArr(d.poids),
        jArr(d.qualite),
        jArr(d.manches),
        jArr(d.col),
        JSON.stringify(customFields),
        toDate(d.dateCreation),
        toDate(d.dateModification),
      ]);
      console.log(`   ✅ Produit migré: ${productId} (${d.nom})`);
      success++;
    } catch (err) {
      console.error(`   ❌ Erreur produit ${productId}:`, err.message);
      errors++;
    }
  }

  console.log(`   → ${success} succès, ${errors} erreurs`);
  return snap.docs; // retourner pour migrer les sous-produits
}

// ── Migration Sous-produits ───────────────────────────────
async function migrateSubProducts(db) {
  console.log('\n📦 Migration des sous-produits (collection: SousProduits)...');

  let snap;
  try {
    snap = await getDocs(collection(firestore, 'SousProduits'));
  } catch {
    // Essayer un autre nom de collection
    try {
      snap = await getDocs(collection(firestore, 'subProducts'));
    } catch {
      console.log('   ⚠️  Collection sous-produits non trouvée, passage...');
      return;
    }
  }

  console.log(`   ${snap.docs.length} sous-produit(s) trouvé(s)`);
  let success = 0, errors = 0;

  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    const standardFields = ['id','nom','description','prix','image','images','stock',
      'productId','product_id','type','anse','dimensions','couleurs','materiau',
      'capacite','poids','qualite','manches','col','dateCreation','dateModification'];

    const customFields = {};
    Object.keys(d).forEach(k => {
      if (!standardFields.includes(k) && Array.isArray(d[k])) customFields[k] = d[k];
    });

    try {
      await db.execute(`
        INSERT INTO sub_products
          (id, product_id, nom, description, prix, image, images, stock,
           type, anse, dimensions, couleurs, materiau, capacite, poids, qualite, manches, col,
           custom_fields, date_creation, date_modification)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          nom=VALUES(nom), description=VALUES(description), prix=VALUES(prix),
          date_modification=VALUES(date_modification)
      `, [
        d.id || docSnap.id,
        d.productId || d.product_id || '',
        d.nom || '',
        d.description || '',
        d.prix || 0,
        d.image || '',
        jArr(d.images),
        d.stock || 0,
        jArr(d.type), jArr(d.anse), jArr(d.dimensions), jArr(d.couleurs),
        jArr(d.materiau), jArr(d.capacite), jArr(d.poids), jArr(d.qualite),
        jArr(d.manches), jArr(d.col),
        JSON.stringify(customFields),
        toDate(d.dateCreation),
        toDate(d.dateModification),
      ]);
      console.log(`   ✅ Sous-produit migré: ${d.id || docSnap.id}`);
      success++;
    } catch (err) {
      console.error(`   ❌ Erreur sous-produit:`, err.message);
      errors++;
    }
  }
  console.log(`   → ${success} succès, ${errors} erreurs`);
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log('🚀 Démarrage de la migration Firebase → MySQL');
  console.log(`   Source  : Firebase (${process.env.FIREBASE_PROJECT_ID})`);
  console.log(`   Cible   : MySQL (${process.env.MYSQL_DATABASE} @ ${process.env.MYSQL_HOST})`);

  let db;
  try {
    db = await getMySQL();
    console.log('\n✅ Connexion MySQL établie');
  } catch (err) {
    console.error('❌ Impossible de se connecter à MySQL:', err.message);
    console.error('   Vérifiez les credentials dans migration/.env');
    process.exit(1);
  }

  try {
    await migrateProducts(db);
    await migrateSubProducts(db);
    console.log('\n🎉 Migration terminée avec succès !');
    console.log('   Vous pouvez maintenant déployer le site sur Hostinger.');
  } catch (err) {
    console.error('\n❌ Erreur lors de la migration:', err);
  } finally {
    await db.end();
  }
}

main();
