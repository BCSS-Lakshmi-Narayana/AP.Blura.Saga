/**
 * Shared 5-bucket sentiment_index (-100..100) → color scale, used by both
 * the State Overview heatmap and the Historical Playback heatmap so the
 * same district always reads the same color regardless of which tab it's
 * viewed from.
 */
export const MOOD_LEGEND = [
  { color: '#16a34a', label: 'Very Positive (60 to 100)' },
  { color: '#84cc16', label: 'Positive (20 to 59)' },
  { color: '#eab308', label: 'Neutral (-19 to 19)' },
  { color: '#f97316', label: 'Negative (-59 to -20)' },
  { color: '#dc2626', label: 'Very Negative (-100 to -60)' },
  { color: '#e2e8f0', label: 'No Data' },
];

export const bucketColorForIndex = (entry) => {
  if (!entry) return '#e2e8f0';
  const idx = entry.sentiment_index;
  if (idx >= 60) return '#16a34a';
  if (idx >= 20) return '#84cc16';
  if (idx >= -19) return '#eab308';
  if (idx >= -59) return '#f97316';
  return '#dc2626';
};

export const DISTRICT_GEOJSON_SOURCES = ['/andhra_pradesh_districts.geojson', '/andhra_pradesh.geojson'];

export const formatGeoName = (rawName) => {
  if (!rawName) return '';
  const s = String(rawName).trim();
  const lower = s.toLowerCase().replace(/[\s._\-]/g, '');
  
  if (lower === 'ysrkadapa' || lower === 'kadapa') return 'YSR Kadapa';
  if (lower === 'westgodavari') return 'West Godavari';
  if (lower === 'eastgodavari') return 'East Godavari';
  if (lower === 'drbrambedkarkonaseema' || lower === 'konaseema') return 'Dr. B.R. Ambedkar Konaseema';
  if (lower === 'spsrnellore' || lower === 'nellore') return 'SPSR Nellore';
  if (lower === 'srisathyasai' || lower === 'sathyasai') return 'Sri Sathya Sai';
  if (lower === 'parvathipurammanyam' || lower === 'manyam') return 'Parvathipuram Manyam';
  if (lower === 'allurisitharamaraju' || lower === 'asr') return 'Alluri Sitharama Raju';
  if (lower === 'annamayya') return 'Annamayya';
  if (lower === 'bapatla') return 'Bapatla';
  if (lower === 'palnadu') return 'Palnadu';
  if (lower === 'nandyal') return 'Nandyal';
  if (lower === 'eluru') return 'Eluru';
  if (lower === 'kakinada') return 'Kakinada';
  if (lower === 'anakapalli') return 'Anakapalli';
  if (lower === 'vizianagaram') return 'Vizianagaram';
  if (lower === 'srikakulam') return 'Srikakulam';
  if (lower === 'visakhapatnam' || lower === 'vizag') return 'Visakhapatnam';
  if (lower === 'ntr') return 'NTR';
  if (lower === 'guntur') return 'Guntur';
  if (lower === 'prakasam') return 'Prakasam';
  if (lower === 'chittoor') return 'Chittoor';
  if (lower === 'tirupati') return 'Tirupati';
  if (lower === 'kurnool') return 'Kurnool';
  if (lower === 'anantapur' || lower === 'ananthapuramu') return 'Ananthapuramu';

  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};
