/**
 * AP Political Watch — central media catalogue for the TDP leadership in
 * Andhra Pradesh (N. Chandrababu Naidu & Nara Lokesh).
 *
 * All URLs are fetched from public sources (Wikipedia's stable Special:FilePath
 * redirect, which always serves the current version of a Commons file). If any
 * URL fails to load, the image helper falls back to /policelogo.jpg shipped
 * with the app, so the UI never breaks.
 *
 * To swap any image, just edit the `src` field. No other code needs to change.
 */

const wiki = (filename) =>
  `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;

/* ─── Portrait & action shots of the TDP leadership ─────────── */
export const TDP_PORTRAITS = [
  {
    id: 'portrait-primary',
    src: wiki('The portrait of CM Shri Nara Chandrababu Naidu.jpg'),
    alt: 'Nara Chandrababu Naidu — Chief Minister of Andhra Pradesh',
    caption: 'Chief Minister · Andhra Pradesh',
  },
  {
    id: 'portrait-lokesh',
    src: '/custom_lokesh.jpg',
    alt: 'Nara Lokesh — Minister & TDP National Working President',
    caption: 'TDP Leadership',
  },
];

/* The "hero" image used across the app (login, header, dashboard avatar). */
export const TDP_HERO = TDP_PORTRAITS[0];

/* ─── Andhra Pradesh constituency imagery ────────────────────────── */
export const AP_GALLERY = [
  {
    id: 'ap-amaravati',
    src: wiki('Prakasam Barrage.jpg'),
    alt: 'Prakasam Barrage, Vijayawada',
    caption: 'Prakasam Barrage · Vijayawada',
  },
  {
    id: 'ap-undavalli',
    src: wiki('Undavalli Caves 02.jpg'),
    alt: 'Undavalli Caves near Amaravati',
    caption: 'Undavalli Caves · Amaravati region',
  },
  {
    id: 'ap-tirumala',
    src: wiki('Tirumala 090615.jpg'),
    alt: 'Tirumala Venkateswara Temple, Tirupati',
    caption: 'Tirumala · Tirupati',
  },
  {
    id: 'ap-vizag',
    src: wiki('RK Beach Visakhapatnam.jpg'),
    alt: 'RK Beach, Visakhapatnam',
    caption: 'RK Beach · Visakhapatnam',
  },
];

/* ─── TDP party visual marks ─────────────────────────────────────── */
export const TDP_MARK = {
  flag: wiki('Telugu Desam Party Flag.svg'),
  logo: wiki('Telugu Desam Party Logo.png'),
};

/* ─── Local fallback served from /public  ────────────────────────── */
export const LOCAL_FALLBACK = '/policelogo.jpg';

/* ─── Key TDP / NDA constituencies in Andhra Pradesh ─────────────── */
export const TDP_KEY_CONSTITUENCIES = [
  { name: 'Kuppam',        district: 'Chittoor' },
  { name: 'Mangalagiri',   district: 'Guntur' },
  { name: 'Pithapuram',    district: 'East Godavari' },
  { name: 'Amaravati',     district: 'Guntur' },
  { name: 'Visakhapatnam', district: 'Visakhapatnam' },
  { name: 'Tirupati',      district: 'Chittoor' },
  { name: 'Vijayawada',    district: 'Krishna' },
];

/* ─── Talking-points the TDP champions (used by AI summary / dashboard) */
export const TDP_FOCUS_TOPICS = [
  'Amaravati capital development',
  'Welfare schemes (Super Six)',
  'Andhra Pradesh state politics',
  'TDP-NDA governance',
  'Anti-corruption',
  'Industrial investment & jobs',
  'Backward classes welfare',
  'Farmer issues',
  'Drinking water & irrigation',
  'IT & infrastructure growth',
];
