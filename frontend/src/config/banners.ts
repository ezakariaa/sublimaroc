// Configuration des bannières - SubliMaroc
// Pour ajouter une nouvelle bannière, ajoutez simplement une ligne ici

export interface BannerImage {
  src: string;
  alt: string;
}

export const bannerImages: BannerImage[] = [
  { src: '/banners/bann1.jpg', alt: 'Bannière SubliMaroc 1 - Services de sublimation' },
  { src: '/banners/bann2.jpg', alt: 'Bannière SubliMaroc 2 - Produits personnalisés' },
  { src: '/banners/bann3.webp', alt: 'Bannière SubliMaroc 3 - Qualité et innovation' },
  { src: '/banners/bann4.jpg', alt: 'Bannière SubliMaroc 4 - Innovation' },
  { src: '/banners/bann5.webp', alt: 'Bannière SubliMaroc 5 - WebP' },
  { src: '/banners/bann6.png', alt: 'Bannière Hero 1 - WebP' },
  { src: '/banners/bann7.webp', alt: 'Bannière SubliMaroc 5 - WebP' },
  { src: '/banners/bann8.gif', alt: 'Bannière Promo - GIF animé' },
  { src: '/banners/bann9.jpg', alt: 'Bannière SubliMaroc 4 - Innovation' },
  { src: '/banners/bann10.jpg', alt: 'Bannière SubliMaroc 4 - Innovation' },
];

// Fonction pour ajouter facilement de nouvelles bannières
export const addBanner = (src: string, alt: string): BannerImage => {
  return { src, alt };
};

// Exemple d'utilisation pour ajouter une nouvelle bannière :
// { src: '/banners/ma-nouvelle-banniere.jpg', alt: 'Ma nouvelle bannière' }
