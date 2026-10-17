export type Entity = { id: string; name: string; kind: 'person' | 'group'; note: string; color: string; x: number; y: number };
export type Relation = { id: string; source: string; target: string; label: string };
export type Network = { entities: Entity[]; relations: Relation[] };
export const STORAGE_KEY = 'jaringvisual.network.v1';
export const colors = ['#397f73', '#b98759', '#7d79a5', '#628da8', '#b77377'];
const people = [
  ['Andi', 350, 230], ['Budi', 535, 145], ['Cidi', 690, 255], ['Didi', 730, 425],
  ['Edi', 560, 480], ['Fredi', 365, 430], ['Gisdi', 190, 350], ['Haidi', 155, 185],
  ['Idi', 330, 75], ['Jedi', 510, 325],
] as const;
export function sampleNetwork(): Network {
  return {
    entities: [
      ...people.map(([name, x, y], i): Entity => ({ id: `p${i}`, name, x, y, kind: 'person', color: colors[0], note: `${name} adalah tokoh fiktif dalam jaringan contoh. Ubah catatan ini untuk menambahkan informasi.` })),
      { id: 'g0', name: 'Studio Utara', kind: 'group', note: 'Kelompok kolaborasi fiktif untuk proyek kreatif.', color: colors[1], x: 185, y: 505 },
      { id: 'g1', name: 'Kolektif Reka', kind: 'group', note: 'Komunitas fiktif tempat bertukar ide dan berkarya.', color: colors[2], x: 720, y: 90 },
    ],
    relations: [
      ['p0', 'p1', 'Berteman'], ['p0', 'p5', 'Berkolaborasi'], ['p0', 'p6', 'Berteman'],
      ['p0', 'p8', 'Bersaudara'], ['p0', 'p9', 'Bekerja sama'], ['p1', 'p2', 'Bekerja sama'],
      ['p1', 'p8', 'Berteman'], ['p2', 'p3', 'Berteman'], ['p2', 'g1', 'Anggota'],
      ['p1', 'g1', 'Anggota'], ['p3', 'p4', 'Berkolaborasi'], ['p4', 'p5', 'Berteman'],
      ['p4', 'p9', 'Bekerja sama'], ['p5', 'g0', 'Anggota'], ['p6', 'g0', 'Anggota'],
      ['p6', 'p7', 'Bersaudara'], ['p7', 'p8', 'Berteman'], ['p9', 'g1', 'Anggota'],
    ].map(([source, target, label], i) => ({ id: `r${i}`, source, target, label })),
  };
}
export function isNetwork(value: unknown): value is Network {
  if (!value || typeof value !== 'object') return false;
  const n = value as Network;
  if (!Array.isArray(n.entities) || !Array.isArray(n.relations) || n.entities.length > 2000 || n.relations.length > 10000) return false;
  const ids = new Set<string>();
  for (const e of n.entities) {
    if (!e || typeof e.id !== 'string' || !e.id || ids.has(e.id) || typeof e.name !== 'string' || !e.name.trim() || e.name.length > 80 || !['person', 'group'].includes(e.kind) || typeof e.note !== 'string' || !/^#[0-9a-f]{6}$/i.test(e.color) || !Number.isFinite(e.x) || !Number.isFinite(e.y)) return false;
    ids.add(e.id);
  }
  const relationIds = new Set<string>();
  return n.relations.every(r => {
    if (!r || typeof r.id !== 'string' || !r.id || relationIds.has(r.id) || !ids.has(r.source) || !ids.has(r.target) || r.source === r.target || typeof r.label !== 'string' || !r.label.trim() || r.label.length > 80) return false;
    relationIds.add(r.id); return true;
  });
}
export function loadNetwork(): { network: Network; warning: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { network: sampleNetwork(), warning: '' };
    const data: unknown = JSON.parse(saved);
    if (isNetwork(data)) return { network: data, warning: '' };
    return { network: sampleNetwork(), warning: 'Data tersimpan tidak valid. Contoh jaringan ditampilkan; gunakan ekspor untuk mencadangkan data.' };
  } catch {
    return { network: sampleNetwork(), warning: 'Penyimpanan browser tidak tersedia. Ekspor data agar perubahanmu tetap aman.' };
  }
}
