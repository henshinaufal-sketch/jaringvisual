import { ArrowRight, Focus, Link2, Minus, Plus, Ruler, Trash2, X } from 'lucide-react';
import type { Entity, Relation } from './data';

type Props = {
  relation: Relation;
  source: Entity;
  target: Entity;
  onResize: (id: string, length: number) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
  onFit: () => void;
  onDelete: () => void;
};

export default function RelationDetail({ relation, source, target, onResize, onSelect, onClose, onFit, onDelete }: Props) {
  const distance = Math.round(Math.hypot(target.x - source.x, target.y - source.y));
  const max = Math.max(600, distance);

  return <aside className="detail-panel relationship-detail" aria-label="Detail hubungan">
    <div className="detail-top"><span>DETAIL HUBUNGAN</span><button className="small-icon" aria-label="Tutup detail hubungan" onClick={onClose}><X size={16} /></button></div>
    <div className="relationship-symbol"><Link2 size={26} /></div>
    <span className="kind-badge">Satu koneksi, satu cerita</span>
    <h2>{relation.label}</h2>
    <div className="relationship-endpoints">
      <button onClick={() => onSelect(source.id)}><i style={{ background: source.color }} /><span>{source.name}</span></button>
      <ArrowRight size={15} />
      <button onClick={() => onSelect(target.id)}><i style={{ background: target.color }} /><span>{target.name}</span></button>
    </div>
    <div className="length-control">
      <label htmlFor="relationship-length"><Ruler size={15} />Panjang garis<output htmlFor="relationship-length" aria-live="polite">{distance}</output></label>
      <p>Atur ruang untuk koneksi ini.</p>
      <input id="relationship-length" type="range" min={80} max={max} step={1} value={Math.max(80, distance)} onChange={e => onResize(relation.id, Number(e.target.value))} />
      <div className="range-labels"><span>Pendek</span><span>Panjang</span></div>
      <div className="length-buttons"><button className="button subtle" aria-label="Perpendek garis" disabled={distance <= 80} onClick={() => onResize(relation.id, distance - 25)}><Minus size={14} />Pendekkan</button><button className="button subtle" aria-label="Perpanjang garis" disabled={distance >= 5000} onClick={() => onResize(relation.id, distance + 25)}><Plus size={14} />Panjangkan</button></div>
    </div>
    <p className="relationship-hint">Mengubah panjang menggeser <strong>{target.name}</strong> dari <strong>{source.name}</strong>. Garis lain yang terhubung ke {target.name} ikut menyesuaikan. Angka menunjukkan jarak antartitik dalam peta.</p>
    <button className="button edit-button" onClick={onFit}><Focus size={14} />Lihat seluruh jaringan</button>
    <div className="relationship-saved"><span />Posisi tersimpan otomatis di browser.</div>
    <div className="delete-entity"><button onClick={onDelete}><Trash2 size={12} />Hapus hubungan</button></div>
  </aside>;
}
