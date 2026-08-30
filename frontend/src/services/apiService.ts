/**
 * SUBLIMAROC - Service de données (Firebase Firestore)
 *
 * L'API publique de ce module est volontairement identique à celle de la
 * version PHP/MySQL : aucune page ni modal n'a besoin d'être modifiée.
 *
 * Note sur les dates : les documents Firestore contiennent des Timestamp.
 * Ils sont renvoyés bruts, car les pages font déjà `x?.toDate ? x.toDate() : ...`.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  limit,
  DocumentReference,
  DocumentData,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { ref, listAll, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';

import { db, auth, storage } from '../firebase';
import { Product, SubProduct } from '../types';

// ── Noms des collections (repris de la base existante) ────

const COL_PRODUITS        = 'Produits';
const COL_SOUS_PRODUITS   = 'SousProduits';
const COL_ARTICLES        = 'Articles';
const COL_ACHATS          = 'Achats';
const COL_ACHATS_ARTICLES = 'AchatsArticles';
const COL_CONSOMMABLES    = 'Consommables';
const COL_SETTINGS        = 'Settings';
const COL_USERS           = 'users';

const DOC_LABELS = 'characteristicLabels';

// ── Helpers ───────────────────────────────────────────────

/** Données du document + son identifiant tel qu'affiché dans l'interface. */
function withId(snap: { id: string; data: () => DocumentData }): any {
  const data = snap.data();
  // Les documents historiques ont un ID de document en slug (`bloc-notes`)
  // et un champ `id` métier (`GRA-BLO`) qui est celui montré à l'utilisateur.
  return { ...data, id: data.id ?? snap.id };
}

/**
 * Retrouve la référence d'un document à partir de l'identifiant manipulé par
 * le frontend : ID du document, champ `id` métier, ou tout autre champ servant
 * de clé (les articles sont adressés par `referenceArticle`).
 */
async function resolveRef(
  collectionName: string,
  id: string,
  fields: string[] = ['id']
): Promise<DocumentReference | null> {
  if (!id) return null;

  const direct = doc(db, collectionName, id);
  const snap = await getDoc(direct);
  if (snap.exists()) return direct;

  for (const field of fields) {
    const found = await getDocs(
      query(collection(db, collectionName), where(field, '==', id), limit(1))
    );
    if (!found.empty) return found.docs[0].ref;
  }
  return null;
}

/** Champs de recherche pour la collection Articles. */
const ARTICLE_KEYS = ['id', 'referenceArticle'];

/** Tri décroissant sur une date Firestore, une chaîne ou un Date. */
function toMillis(value: any): number {
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function sortByDateDesc(items: any[], field = 'dateCreation'): any[] {
  return [...items].sort((a, b) => toMillis(b[field]) - toMillis(a[field]));
}

/** Reproduit la génération d'ID de l'ancienne API PHP : « Bloc Notes » → GRA-BLO. */
function generateProductId(nom: string): string {
  const letters = (nom || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  return `GRA-${letters || 'XXX'}`;
}

// ── Products ──────────────────────────────────────────────

export class ProductService {

  static async getAllProducts(): Promise<Product[]> {
    const snap = await getDocs(collection(db, COL_PRODUITS));
    return sortByDateDesc(snap.docs.map(withId)) as Product[];
  }

  static async getProductById(id: string): Promise<Product | null> {
    const ref = await resolveRef(COL_PRODUITS, id);
    if (!ref) return null;
    const snap = await getDoc(ref);
    return snap.exists() ? (withId(snap) as Product) : null;
  }

  static async createProduct(
    product: Omit<Product, 'id' | 'dateCreation' | 'dateModification'>
  ): Promise<string> {
    const data = product as any;
    const newId: string = data.id || generateProductId(data.nom);

    await setDoc(doc(db, COL_PRODUITS, newId), {
      ...data,
      id: newId,
      dateCreation: data.dateCreation ?? new Date(),
      dateModification: new Date(),
    });
    return newId;
  }

  static async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    const ref = await resolveRef(COL_PRODUITS, id);
    if (!ref) throw new Error(`Produit introuvable : ${id}`);
    await updateDoc(ref, { ...product, dateModification: new Date() } as DocumentData);
  }

  /**
   * Retire complètement un ou plusieurs champs du document d'un seul produit.
   * `updateDoc` avec `null` ne supprimerait pas le champ : il resterait présent
   * avec la valeur null et réapparaîtrait dans l'interface au rechargement.
   */
  static async deleteProductFields(id: string, fields: string[]): Promise<void> {
    if (fields.length === 0) return;

    const ref = await resolveRef(COL_PRODUITS, id);
    if (!ref) throw new Error(`Produit introuvable : ${id}`);

    const payload: DocumentData = { dateModification: new Date() };
    fields.forEach((field) => {
      payload[field] = deleteField();
    });
    await updateDoc(ref, payload);
  }

  /** L'ID métier n'est jamais modifié par l'interface : mise à jour en place. */
  static async updateProductWithIdChange(oldId: string, productData: any): Promise<string> {
    await this.updateProduct(oldId, productData);
    return oldId;
  }

  static async deleteProduct(id: string): Promise<void> {
    const ref = await resolveRef(COL_PRODUITS, id);
    if (!ref) return;
    await deleteDoc(ref);
  }

  // Stubs de compatibilité conservés depuis la version PHP
  static async testConnection(): Promise<boolean> { return true; }
  static async testSimpleConnection(): Promise<boolean> { return true; }
  static async ensureCollectionExists(): Promise<void> {}
  static async migrateProductIds(): Promise<void> {}
  static async migrateAllIdsFromSubToGra(): Promise<void> {}
}

// ── SubProducts ───────────────────────────────────────────

export class SubProductService {

  static async getSubProductsByProductId(productId: string): Promise<SubProduct[]> {
    const snap = await getDocs(
      query(collection(db, COL_SOUS_PRODUITS), where('productId', '==', productId))
    );
    return sortByDateDesc(snap.docs.map(withId)) as SubProduct[];
  }

  static async getSubProductById(id: string): Promise<SubProduct | null> {
    const ref = await resolveRef(COL_SOUS_PRODUITS, id);
    if (!ref) return null;
    const snap = await getDoc(ref);
    return snap.exists() ? (withId(snap) as SubProduct) : null;
  }

  static async createSubProduct(
    subProduct: Omit<SubProduct, 'id' | 'dateCreation' | 'dateModification'>
  ): Promise<string> {
    const data = subProduct as any;
    const payload = {
      ...data,
      dateCreation: data.dateCreation ?? new Date(),
      dateModification: new Date(),
    };

    if (data.id) {
      await setDoc(doc(db, COL_SOUS_PRODUITS, data.id), payload);
      return data.id;
    }
    const created = await addDoc(collection(db, COL_SOUS_PRODUITS), payload);
    await updateDoc(created, { id: created.id });
    return created.id;
  }

  static async updateSubProduct(id: string, subProduct: Partial<SubProduct>): Promise<void> {
    const ref = await resolveRef(COL_SOUS_PRODUITS, id);
    if (!ref) throw new Error(`Sous-produit introuvable : ${id}`);
    await updateDoc(ref, { ...subProduct, dateModification: new Date() } as DocumentData);
  }

  static async deleteSubProduct(id: string): Promise<void> {
    const ref = await resolveRef(COL_SOUS_PRODUITS, id);
    if (!ref) return;
    await deleteDoc(ref);
  }

  static async migrateSubProductIds(_oldProductId: string, _newProductId: string): Promise<void> {}
}

// ── Images (Firebase Storage) ─────────────────────────────

const IMAGES_FOLDER = 'images';

/** URLs de téléchargement des images stockées dans Storage. */
export async function getImages(): Promise<string[]> {
  try {
    const result = await listAll(ref(storage, IMAGES_FOLDER));
    return await Promise.all(result.items.map((item) => getDownloadURL(item)));
  } catch {
    return [];
  }
}

/** Téléverse un fichier dans Storage et renvoie son URL publique. */
export async function uploadImage(file: File, folder = IMAGES_FOLDER): Promise<string> {
  const safeName = file.name.replace(/[^\w.-]/g, '_');
  const path = `${folder}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

/**
 * Téléverse le contenu d'une URL `blob:` (aperçu local) dans Storage.
 * Remplace l'ancienne conversion en base64, qui gonflait les documents
 * Firestore et tronquait les images au-delà de 1 Mo.
 */
export async function uploadBlobUrl(blobUrl: string, folder = IMAGES_FOLDER): Promise<string> {
  const blob = await (await fetch(blobUrl)).blob();
  const extension = (blob.type.split('/')[1] || 'jpg').replace(/\+.*$/, '');
  const suffix = Math.random().toString(36).slice(2, 8);
  const fileRef = ref(storage, `${folder}/${Date.now()}-${suffix}.${extension}`);
  await uploadBytes(fileRef, blob);
  return getDownloadURL(fileRef);
}

/**
 * Normalise une image avant sauvegarde : les aperçus locaux et les fichiers
 * sont téléversés dans Storage, les URLs déjà stockées sont conservées.
 */
export async function resolveImageUrl(
  image: string | undefined,
  file?: File | null,
  folder = IMAGES_FOLDER
): Promise<string> {
  if (file instanceof File) return uploadImage(file, folder);
  if (image && image.startsWith('blob:')) return uploadBlobUrl(image, folder);
  return image || '';
}

// ── Images en base64 (stockées dans le document Firestore) ──

/**
 * Budget total des images d'un même document, en caractères base64.
 * Firestore plafonne un document à 1 Mio ; on garde de la marge pour le
 * reste des champs (fournisseur, dates, lignes d'achat…).
 */
export const FIRESTORE_IMAGE_TOTAL_BUDGET = 700 * 1024;

/**
 * Budget d'une image parmi plusieurs dans un même document (galerie d'un
 * sous-produit, images de variations…). Plus serré que le budget total pour
 * qu'une dizaine d'images tiennent dans la limite d'un document Firestore.
 */
export const FIRESTORE_IMAGE_ITEM_BUDGET = 120 * 1024;

/** Paliers d'encodage essayés successivement jusqu'à tenir dans le budget. */
const IMAGE_STEPS = [
  { maxSize: 800, quality: 0.75 },
  { maxSize: 600, quality: 0.65 },
  { maxSize: 400, quality: 0.55 },
];

/** Charge une image à partir d'un File ou d'une URL (blob:, data:, http). */
function loadImageElement(source: File | string): Promise<HTMLImageElement> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  const isTemporary = typeof source !== 'string';

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (isTemporary) URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      if (isTemporary) URL.revokeObjectURL(url);
      reject(new Error("Image illisible ou format non supporté"));
    };
    img.src = url;
  });
}

/** Redessine l'image sur un canvas, réduite pour tenir dans `maxSize`. */
function drawScaled(img: HTMLImageElement, maxSize: number): HTMLCanvasElement {
  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * ratio));
  canvas.height = Math.max(1, Math.round(img.height * ratio));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible dans ce navigateur');

  // Fond blanc : les PNG transparents restent lisibles après conversion JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Convertit une image en data URL compressée, prête à être écrite
 * directement dans un document Firestore. Réduit progressivement la
 * définition et la qualité jusqu'à tenir dans le budget.
 */
export async function imageToDataUrl(
  source: File | string,
  budget = FIRESTORE_IMAGE_TOTAL_BUDGET
): Promise<string> {
  const img = await loadImageElement(source);
  let smallest = '';

  for (const step of IMAGE_STEPS) {
    const dataUrl = drawScaled(img, step.maxSize).toDataURL('image/jpeg', step.quality);
    if (dataUrl.length <= budget) return dataUrl;
    smallest = dataUrl;
  }

  throw new Error(
    `Image trop lourde même après compression (${Math.round(smallest.length / 1024)} Ko). ` +
    `Utilisez un fichier plus léger.`
  );
}

/**
 * Équivalent de `resolveImageUrl`, mais sans Storage : les nouveaux fichiers
 * et les aperçus locaux sont encodés en base64 ; les valeurs déjà
 * enregistrées (URL Storage historique ou data URL) sont conservées telles quelles.
 */
export async function resolveImageData(
  image: string | undefined,
  file?: File | null,
  budget = FIRESTORE_IMAGE_TOTAL_BUDGET
): Promise<string> {
  if (file instanceof File) return imageToDataUrl(file, budget);
  if (image && image.startsWith('blob:')) return imageToDataUrl(image, budget);
  return image || '';
}

/** Supprime une image de Storage à partir de son URL. Sans effet si absente. */
export async function deleteImage(url: string): Promise<void> {
  if (!url || !url.includes('firebasestorage')) return;
  try {
    await deleteObject(ref(storage, url));
  } catch {
    /* déjà supprimée ou non accessible */
  }
}

// ── Achats (matériels & articles) ─────────────────────────

export class AchatService {

  private static async getAll(collectionName: string): Promise<any[]> {
    const snap = await getDocs(collection(db, collectionName));
    return sortByDateDesc(snap.docs.map(withId), 'createdAt');
  }

  private static async create(collectionName: string, data: any): Promise<string> {
    const created = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: new Date(),
    });
    return created.id;
  }

  static async getAllAchats(): Promise<any[]> {
    return this.getAll(COL_ACHATS);
  }

  static async createAchat(data: any): Promise<string> {
    return this.create(COL_ACHATS, data);
  }

  static async updateAchat(id: string, data: any): Promise<void> {
    const ref = await resolveRef(COL_ACHATS, id);
    if (!ref) throw new Error(`Achat introuvable : ${id}`);
    await updateDoc(ref, { ...data, updatedAt: new Date() });
  }

  static async deleteAchat(id: string): Promise<void> {
    const ref = await resolveRef(COL_ACHATS, id);
    if (!ref) return;
    await deleteDoc(ref);
  }

  static async getAllAchatsArticles(): Promise<any[]> {
    return this.getAll(COL_ACHATS_ARTICLES);
  }

  static async createAchatArticle(data: any): Promise<string> {
    return this.create(COL_ACHATS_ARTICLES, data);
  }

  static async deleteAchatArticle(id: string): Promise<void> {
    const ref = await resolveRef(COL_ACHATS_ARTICLES, id);
    if (!ref) return;
    await deleteDoc(ref);
  }
}

// ── Consommables ────────────────────────────────

/**
 * Même structure de document que les achats de matériel, dans la collection
 * « Consommables » : la page Consommables réutilise le code de la page Matériels.
 */
export class ConsommableService {

  static async getAllConsommables(): Promise<any[]> {
    const snap = await getDocs(collection(db, COL_CONSOMMABLES));
    return sortByDateDesc(snap.docs.map(withId), 'createdAt');
  }

  static async createConsommable(data: any): Promise<string> {
    const created = await addDoc(collection(db, COL_CONSOMMABLES), {
      ...data,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: new Date(),
    });
    return created.id;
  }

  static async updateConsommable(id: string, data: any): Promise<void> {
    const ref = await resolveRef(COL_CONSOMMABLES, id);
    if (!ref) throw new Error(`Consommable introuvable : ${id}`);
    await updateDoc(ref, { ...data, updatedAt: new Date() });
  }

  static async deleteConsommable(id: string): Promise<void> {
    const ref = await resolveRef(COL_CONSOMMABLES, id);
    if (!ref) return;
    await deleteDoc(ref);
  }
}

// ── Articles ──────────────────────────────────────────────

export class ArticleService {

  static async getAllArticles(): Promise<any[]> {
    const snap = await getDocs(collection(db, COL_ARTICLES));
    return sortByDateDesc(snap.docs.map(withId));
  }

  static async getArticleById(id: string): Promise<any | null> {
    const ref = await resolveRef(COL_ARTICLES, id, ARTICLE_KEYS);
    if (!ref) return null;
    const snap = await getDoc(ref);
    return snap.exists() ? withId(snap) : null;
  }

  static async createArticle(data: any): Promise<string> {
    const created = await addDoc(collection(db, COL_ARTICLES), {
      ...data,
      dateCreation: data.dateCreation ?? new Date(),
      dateModification: new Date(),
    });
    return created.id;
  }

  static async updateArticle(id: string, data: any): Promise<void> {
    const ref = await resolveRef(COL_ARTICLES, id, ARTICLE_KEYS);
    if (!ref) throw new Error(`Article introuvable : ${id}`);
    await updateDoc(ref, { ...data, dateModification: new Date() });
  }

  static async deleteArticle(id: string): Promise<void> {
    const ref = await resolveRef(COL_ARTICLES, id, ARTICLE_KEYS);
    if (!ref) return;
    await deleteDoc(ref);
  }
}

// ── Libellés des caractéristiques ─────────────────────────

export class LabelService {

  static async getLabels(): Promise<Record<string, string>> {
    try {
      const snap = await getDoc(doc(db, COL_SETTINGS, DOC_LABELS));
      return snap.exists() ? (snap.data() as Record<string, string>) : {};
    } catch {
      return {};
    }
  }

  /** Fusionne avec les libellés existants, comme le faisait labels.php. */
  static async updateLabels(labels: Record<string, string>): Promise<Record<string, string>> {
    const ref = doc(db, COL_SETTINGS, DOC_LABELS);
    await setDoc(ref, labels, { merge: true });
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Record<string, string>) : labels;
  }
}

// ── Auth (Firebase Authentication) ────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  nom: string;
  role: 'admin' | 'user';
}

/**
 * Construit le profil applicatif d'un compte Firebase.
 * Le rôle et le nom proviennent de `users/{uid}` s'il existe ;
 * à défaut, le compte est considéré comme admin (usage interne du back-office).
 */
export async function buildApiUser(fbUser: FirebaseUser): Promise<ApiUser> {
  let nom = fbUser.displayName || fbUser.email?.split('@')[0] || 'Utilisateur';
  let role: 'admin' | 'user' = 'admin';

  try {
    const profile = await getDoc(doc(db, COL_USERS, fbUser.uid));
    if (profile.exists()) {
      const data = profile.data();
      if (data.nom) nom = data.nom;
      if (data.role === 'admin' || data.role === 'user') role = data.role;
    }
  } catch {
    /* profil absent ou lecture refusée : on garde les valeurs par défaut */
  }

  return { id: fbUser.uid, email: fbUser.email || '', nom, role };
}

/** Messages d'erreur Firebase traduits pour l'interface. */
function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Adresse email invalide.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email ou mot de passe incorrect.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/network-request-failed':
      return 'Connexion au serveur impossible.';
    default:
      return 'Connexion impossible. Réessayez.';
  }
}

export class AuthService {

  static async login(email: string, password: string): Promise<ApiUser> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return await buildApiUser(credential.user);
    } catch (err: any) {
      throw new Error(authErrorMessage(err?.code || ''));
    }
  }

  static async logout(): Promise<void> {
    await signOut(auth);
  }
}
