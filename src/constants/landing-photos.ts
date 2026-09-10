/**
 * Photographs on the landing page that are not the team's own.
 *
 * All three replaced generated images on 2026-09-10. Each is a real photo from
 * Wikimedia Commons, downsized in place under public/plant-leaves with the
 * original file kept out of the repo. The credit is rendered next to the
 * picture; CC0 does not demand it, CC BY does, and printing all three the same
 * way is simpler than remembering which is which. `sourceUrl` is the Commons
 * file page, which carries the licence text.
 */
export type LandingPhoto = {
  src: string;
  alt: string;
  altEn: string;
  /** Author · source · licence, as one printable line. */
  credit: string;
  sourceUrl: string;
  width: number;
  height: number;
};

export const landingPhotos = {
  heroTomato: {
    src: "/plant-leaves/hero-tomato-septoria.jpg",
    alt: "Lá cà chua có nhiều đốm nâu nhỏ do nấm Septoria, hệ thống đang đánh dấu vùng cần kiểm tra.",
    altEn: "Tomato leaflets with small brown Septoria spots, the system marking the area to inspect.",
    credit: "Wolan268 · Wikimedia Commons · CC0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tomato_septoria_leaf_spot_3007.jpg",
    width: 1600,
    height: 900,
  },
  storyGrape: {
    src: "/plant-leaves/story-grape-mildew.jpg",
    alt: "Lá nho có các mảng vàng nhạt do nấm mốc đang được kiểm tra",
    altEn: "Grape leaf with pale yellow mildew patches being examined",
    credit: "kvins.com · Wikimedia Commons · CC BY 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Grape_vine_leaf_afflicted_with_mildew.jpg",
    width: 1600,
    height: 1200,
  },
  featurePepper: {
    src: "/plant-leaves/feature-pepper-bacterial-spot.jpg",
    alt: "Lá ớt có các đốm vi khuẩn viền sẫm, quầng vàng quanh vết",
    altEn: "Pepper leaf with dark-edged bacterial spots ringed in yellow",
    credit: "Scot Nelson · Wikimedia Commons · CC0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Bacterial_leaf_spot_of_pepper_(Capsicum_sp.)_(43614805831).jpg",
    width: 1400,
    height: 1401,
  },
} satisfies Record<string, LandingPhoto>;
