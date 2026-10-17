import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpFromLine, Check, ChevronDown, CircleHelp, ExternalLink, Focus, GitBranch, Layers, Link2, Minus, Network as NetworkIcon, Pencil, Plus, RotateCcw, Ruler, Search, Trash2, Users, UserRound, X } from 'lucide-react';
import { colors, isNetwork, loadNetwork, sampleNetwork, STORAGE_KEY, type Entity, type Network } from './data';
import RelationDetail from './RelationDetail';

type Modal = { type: 'entity'; entity?: Entity; kind?: Entity['kind'] } | { type: 'relation'; source?: string } | { type: 'help' | 'reset' } | null;
type View = { x: number; y: number; z: number };
const kindName = (kind: Entity['kind']) => kind === 'person' ? 'Orang' : 'Kelompok';
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase();

function ColorPicker({ initialColor }: { initialColor: string }) {
  const [color, setColor] = useState(initialColor);
  return <fieldset className="color-options"><legend>Warna titik</legend><input type="hidden" name="color" value={color} />{colors.map((swatch, i) => <label key={swatch} style={{ '--swatch': swatch } as React.CSSProperties}><input type="radio" name="swatch" value={swatch} aria-label={`Warna ${['pink', 'ungu', 'peach', 'biru', 'berry'][i]}`} checked={color === swatch} onChange={() => setColor(swatch)} /><span><Check size={16} /></span></label>)}<label className="custom-color" title="Pilih warna sendiri"><input type="color" aria-label="Warna kustom" value={color} onChange={e => setColor(e.target.value)} /></label></fieldset>;
}

function ModalDialog({ children, close, title, subtitle }: { children: React.ReactNode; close: () => void; title: string; subtitle: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} aria-label={title} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }} className="dialog">
    <div className="modal-heading"><div><span className="eyebrow">RUANG UNTUK KONEKSI BARU</span><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" aria-label="Tutup dialog" onClick={close}><X size={20} /></button></div>
    {children}
  </dialog>;
}

export default function App() {
  const [initial] = useState(loadNetwork);
  const [network, setNetwork] = useState<Network>(initial.network);
  const [selectedId, setSelectedId] = useState<string | null>(initial.network.entities[0]?.id ?? null);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Entity['kind']>('all');
  const [page, setPage] = useState<'network' | 'entities'>('network');
  const [modal, setModal] = useState<Modal>(null);
  const [message, setMessage] = useState(initial.warning);
  const [storageError, setStorageError] = useState(false);
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 1 });
  const [hover, setHover] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id?: string; x: number; y: number; view: View } | null>(null);
  const selected = network.entities.find(e => e.id === selectedId);
  const selectedRelation = network.relations.find(r => r.id === selectedRelationId);
  const connections = network.relations.filter(r => r.source === selectedId || r.target === selectedId);
  const visible = network.entities.filter(e => (filter === 'all' || e.kind === filter) && e.name.toLocaleLowerCase('id').includes(search.toLocaleLowerCase('id')));
  const visibleIds = new Set(visible.map(e => e.id));
  const personCount = network.entities.filter(e => e.kind === 'person').length;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(network)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [network]);
  useEffect(() => { setDeleteConfirm(false); }, [selectedId]);
  useEffect(() => { setFormError(''); }, [modal]);
  useEffect(() => { if (!message) return; const t = setTimeout(() => setMessage(''), 7000); return () => clearTimeout(t); }, [message]);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (e.key === '/' && !modal && !(e.target instanceof HTMLElement && (e.target.matches('input,textarea,select') || e.target.isContentEditable))) {
        e.preventDefault(); document.querySelector<HTMLInputElement>('.search input')?.focus();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [modal]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
      setView(v => { const z = Math.max(.35, Math.min(2.5, v.z * (e.deltaY > 0 ? .92 : 1.08))); return { z, x: point.x - (point.x - v.x) * z / v.z, y: point.y - (point.y - v.y) * z / v.z }; });
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [page]);

  const select = (id: string) => { setSelectedId(id); setSelectedRelationId(null); };
  const resizeRelation = (id: string, requestedLength: number) => {
    if (!Number.isFinite(requestedLength)) return;
    const length = Math.max(80, Math.min(5000, requestedLength));
    setNetwork(n => {
      const relation = n.relations.find(r => r.id === id);
      const source = n.entities.find(e => e.id === relation?.source);
      const target = n.entities.find(e => e.id === relation?.target);
      if (!source || !target) return n;
      const dx = target.x - source.x, dy = target.y - source.y;
      const distance = Math.hypot(dx, dy);
      const ux = distance === 0 ? 1 : dx / distance;
      const uy = distance === 0 ? 0 : dy / distance;
      return { ...n, entities: n.entities.map(e => e.id === target.id ? { ...e, x: source.x + ux * length, y: source.y + uy * length } : e) };
    });
  };
  const fit = () => {
    if (!visible.length) { setView({ x: 0, y: 0, z: 1 }); return; }
    const xs = visible.map(e => e.x), ys = visible.map(e => e.y);
    const left = Math.min(...xs) - 80, top = Math.min(...ys) - 75;
    const width = Math.max(...xs) + 80 - left, height = Math.max(...ys) + 80 - top;
    const z = Math.min(1.3, 850 / width, 550 / height);
    setView({ z, x: (900 - width * z) / 2 - left * z, y: (600 - height * z) / 2 - top * z });
  };
  const zoom = (factor: number) => setView(v => { const z = Math.max(.35, Math.min(2.5, v.z * factor)); return { z, x: 450 - (450 - v.x) * z / v.z, y: 300 - (300 - v.y) * z / v.z }; });
  const point = (e: ReactPointerEvent<SVGSVGElement>) => {
    const matrix = svgRef.current?.getScreenCTM();
    return matrix ? new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse()) : new DOMPoint();
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const p = point(e), d = drag.current;
    if (d.id) setNetwork(n => ({ ...n, entities: n.entities.map(entity => entity.id === d.id ? { ...entity, x: (p.x - view.x) / view.z, y: (p.y - view.y) / view.z } : entity) }));
    else setView({ ...d.view, x: d.view.x + p.x - d.x, y: d.view.y + p.y - d.y });
  };
  const saveEntity = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget), name = String(form.get('name')).trim();
    if (!name) { setFormError('Nama tidak boleh kosong.'); return; }
    const editing = modal?.type === 'entity' ? modal.entity : undefined;
    const kind = form.get('kind') as Entity['kind'];
    const color = String(form.get('color') || colors[0]);
    const entity: Entity = { id: editing?.id ?? crypto.randomUUID(), name, kind, note: String(form.get('note')).trim(), color, x: editing?.x ?? 450 + Math.sin(network.entities.length * 2.4) * 130, y: editing?.y ?? 300 + Math.cos(network.entities.length * 2.4) * 130 };
    setNetwork(n => ({ ...n, entities: editing ? n.entities.map(old => old.id === editing.id ? entity : old) : [...n.entities, entity] }));
    select(entity.id); setSearch(''); setFilter('all'); setModal(null); setMessage(`${name} berhasil ${editing ? 'diperbarui' : 'ditambahkan'}.`);
  };
  const saveRelation = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    const source = String(form.get('source')), target = String(form.get('target')), label = String(form.get('label')).trim();
    if (source === target) { setFormError('Pilih dua entitas yang berbeda.'); return; }
    if (!label) { setFormError('Tuliskan nama hubungannya.'); return; }
    if (network.relations.some(r => r.source === source && r.target === target && r.label.toLowerCase() === label.toLowerCase())) { setFormError('Hubungan ini sudah ada.'); return; }
    setNetwork(n => ({ ...n, relations: [...n.relations, { id: crypto.randomUUID(), source, target, label }] }));
    select(source); setModal(null); setMessage('Hubungan baru berhasil ditambahkan.');
  };
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(network, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'jaringvisual.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Cadangan jaringan berhasil diekspor.');
  };
  const importData = async (file?: File) => {
    if (!file) return;
    if (file.size > 5_000_000) { setMessage('File terlalu besar. Batas ukuran impor adalah 5 MB.'); return; }
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isNetwork(data)) throw new Error('invalid');
      // Merge imports: keep the current network and preserve imported IDs when possible.
      const entityIds = new Map<string, string>();
      for (const entity of data.entities) entityIds.set(entity.id, network.entities.some(e => e.id === entity.id) ? crypto.randomUUID() : entity.id);
      const relationIds = new Set(network.relations.map(r => r.id));
      const importedEntities = data.entities.map(e => ({ ...e, id: entityIds.get(e.id)! }));
      const importedRelations = data.relations.map(r => ({ ...r, id: relationIds.has(r.id) ? crypto.randomUUID() : r.id, source: entityIds.get(r.source)!, target: entityIds.get(r.target)! }));
      if (network.entities.length + importedEntities.length > 2000 || network.relations.length + importedRelations.length > 10000) throw new Error('limit');
      setNetwork(n => ({ entities: [...n.entities, ...importedEntities], relations: [...n.relations, ...importedRelations] }));
      setSearch(''); setFilter('all'); setSelectedRelationId(null); setSelectedId(importedEntities[0]?.id ?? selectedId); setMessage(`${importedEntities.length} entitas diimpor dan ditambahkan ke jaringan.`);
    } catch { setMessage('Impor gagal. Gunakan file JSON ekspor JaringVisual yang valid (maksimal 2.000 entitas dan 10.000 hubungan).'); }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); setPage('network'); }}><span className="brand-mark"><NetworkIcon size={23} strokeWidth={1.6} /></span><span>jaring<span className="brand-light">visual</span><sup>®</sup></span></a>
      <div className="workspace-label"><span className="workspace-avatar">JV</span><div>Ruang eksplorasi<small>Workspace pribadi</small></div><ChevronDown size={14} /></div>
      <span className="nav-caption">WORKSPACE</span>
      <nav aria-label="Navigasi utama">
        <button className={page === 'network' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('network')}><GitBranch size={18} />Peta hubungan<span className="nav-dot" /></button>
        <button className={page === 'entities' ? 'nav-item active' : 'nav-item'} onClick={() => setPage('entities')}><Layers size={18} />Semua entitas<span className="nav-count">{network.entities.length}</span></button>
      </nav>
      <div className="sidebar-section-heading"><span>ENTITAS JARINGAN</span><button className="small-icon" aria-label="Tambah entitas dari sidebar" onClick={() => setModal({ type: 'entity' })}><Plus size={16} /></button></div>
      <div className="sidebar-entities">
        {network.entities.map(e => <button key={e.id} className={`sidebar-entity ${selectedId === e.id ? 'chosen' : ''}`} onClick={() => { select(e.id); setPage('network'); setSearch(''); setFilter('all'); }}><span className={`entity-dot ${e.kind}`} style={{ background: e.color }} /><span>{e.name}</span>{e.kind === 'group' && <Users size={13} />}</button>)}
        {!network.entities.length && <p className="sidebar-empty">Tambahkan entitas pertamamu.</p>}
      </div>
      <div className="sidebar-bottom"><div className="local-note"><span className="local-status" /><span>Ruang ide, tanpa batas.<small>Setiap koneksi punya cerita.</small></span></div><button className="nav-item" onClick={() => setModal({ type: 'help' })}><CircleHelp size={17} />Panduan singkat<ExternalLink size={13} /></button><div className="version"><span>JARINGVISUAL</span><span>V 0.2 / BETA</span></div></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span><strong>{page === 'network' ? 'Peta hubungan' : 'Semua entitas'}</strong></div><div className={`save-state ${storageError ? 'error' : ''}`}><span />{storageError ? 'Belum tersimpan · ekspor data' : 'Tersimpan di browser ini'}</div></header>
      <section className="page-heading"><div><div className="eyebrow"><span /> CONNECT THE DOTS</div><h1>{page === 'network' ? 'Lihat hubungan. Temukan cerita.' : 'Orang, kelompok, dan cerita mereka.'}</h1><p>{page === 'network' ? 'Jelajahi koneksi antar orang dan kelompok dalam satu ruang visual.' : 'Kenali setiap entitas yang membentuk jaringanmu.'}</p></div><button className="button primary" onClick={() => setModal({ type: 'entity' })}><Plus size={17} />Tambah entitas</button></section>
      <section className="stats" aria-label="Ringkasan jaringan"><div><span className="stat-icon"><UserRound size={19} /></span><strong>{personCount.toString().padStart(2, '0')}</strong><span>Orang</span></div><div><span className="stat-icon warm"><Users size={19} /></span><strong>{(network.entities.length - personCount).toString().padStart(2, '0')}</strong><span>Kelompok</span></div><div><span className="stat-icon violet"><Link2 size={19} /></span><strong>{network.relations.length.toString().padStart(2, '0')}</strong><span>Hubungan</span></div><p><span className="tiny-dot" />Satu jaringan, banyak kemungkinan.</p></section>
      <section className="network-card">
        <div className="canvas-toolbar"><div className="filter-tabs" aria-label="Filter jenis entitas">{(['all', 'person', 'group'] as const).map(f => <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>{f === 'all' ? <Layers size={14} /> : f === 'person' ? <UserRound size={14} /> : <Users size={14} />}{f === 'all' ? 'Semua' : kindName(f)}</button>)}</div><div className="toolbar-right"><label className="search"><Search size={16} /><input aria-label="Cari entitas" placeholder="Cari entitas…" value={search} onChange={e => setSearch(e.target.value)} /><kbd>/</kbd></label><button className="button subtle relation-button" disabled={network.entities.length < 2} onClick={() => setModal({ type: 'relation', source: selectedId ?? undefined })}><Link2 size={15} /><span>Tambah hubungan</span></button></div></div>
        {page === 'network' ? <div className={`network-body ${selected || selectedRelation ? 'has-detail' : ''}`}>
          <div className="canvas">
            <div className="canvas-caption"><span className="live-dot" />JARINGAN UTAMA <span className="canvas-count">{visible.length} entitas</span></div>
            <svg ref={svgRef} className="network-svg" viewBox="0 0 900 600" aria-label="Peta jaringan hubungan interaktif" onPointerDown={e => { if (e.button !== 0) return; const p = point(e); drag.current = { x: p.x, y: p.y, view }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
              <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="var(--edge-arrow)" /></marker></defs>
              <g transform={`translate(${view.x} ${view.y}) scale(${view.z})`}>
                {network.relations.map(r => {
                  const a = network.entities.find(e => e.id === r.source), b = network.entities.find(e => e.id === r.target);
                  if (!a || !b || !visibleIds.has(a.id) || !visibleIds.has(b.id)) return null;
                  const active = selectedRelation ? r.id === selectedRelation.id : r.source === (hover || selectedId) || r.target === (hover || selectedId);
                  const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy) || 1;
                  const x2 = b.x - dx / distance * 33, y2 = b.y - dy / distance * 33;
                  return <g key={r.id} className={`edge ${active ? 'edge-active' : ''} ${selectedRelationId === r.id ? 'edge-selected' : ''}`} role="button" tabIndex={0} aria-label={`Atur panjang hubungan ${a.name} ke ${b.name}: ${r.label}`} onPointerDown={e => e.stopPropagation()} onClick={() => setSelectedRelationId(r.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRelationId(r.id); } }}><line className="edge-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><line className="edge-line" x1={a.x} y1={a.y} x2={x2} y2={y2} markerEnd={active ? 'url(#arrow)' : undefined} /><title>{a.name} → {r.label} → {b.name}</title>{active && <g className="edge-label" transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`}><rect x={-r.label.length * 3.2 - 9} y="-9" width={r.label.length * 6.4 + 18} height="18" rx="5" /><text textAnchor="middle" dy="3">{r.label}</text></g>}</g>;
                })}
                {visible.map(entity => <g key={entity.id} className={`graph-node ${entity.id === selectedId ? 'node-selected' : ''}`} transform={`translate(${entity.x} ${entity.y})`} role="button" tabIndex={0} aria-label={`${kindName(entity.kind)} ${entity.name}`} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(entity.id); } }} onPointerDown={e => { if (e.button !== 0) return; e.stopPropagation(); select(entity.id); drag.current = { id: entity.id, x: 0, y: 0, view }; svgRef.current?.setPointerCapture(e.pointerId); }} onMouseEnter={() => setHover(entity.id)} onMouseLeave={() => setHover(null)}>
                  {entity.id === selectedId && <circle r="39" className="selection-halo" />}
                  {entity.kind === 'person' ? <><circle r="27" fill={entity.color} className="node-shape" /><circle r="24" fill="none" stroke="white" strokeOpacity=".16" /></> : <rect x="-28" y="-25" width="56" height="50" rx="15" fill={entity.color} className="node-shape" />}
                  {entity.kind === 'person' ? <text className="node-initials" textAnchor="middle" dy="6">{initials(entity.name)}</text> : <g transform="translate(-11 -11)" color="white"><Users size={22} strokeWidth={1.6} /></g>}
                  <text className="node-name" textAnchor="middle" dy="48">{entity.name}</text>
                  {entity.id === selectedId && <text className="node-type" textAnchor="middle" dy="64">{kindName(entity.kind)}</text>}
                </g>)}
              </g>
            </svg>
            {!visible.length && <div className="canvas-empty"><Search size={30} /><h3>{network.entities.length ? 'Entitas tidak ditemukan' : 'Mulai dari satu koneksi.'}</h3><p>{network.entities.length ? 'Coba nama lain atau ubah filter jenis entitas.' : 'Tambahkan orang atau kelompok untuk membangun jaringanmu.'}</p><button className="button subtle" onClick={() => network.entities.length ? (setSearch(''), setFilter('all')) : setModal({ type: 'entity' })}>{network.entities.length ? 'Hapus filter' : 'Tambah entitas'}</button></div>}
            <div className="canvas-bottom"><div className="legend"><span><i style={{ background: colors[0] }} />Orang</span><span><i className="square" style={{ background: colors[1] }} />Kelompok</span></div><div className="zoom-controls"><button aria-label="Perkecil peta" onClick={() => zoom(1 / 1.2)}><Minus size={16} /></button><span>{Math.round(view.z * 100)}%</span><button aria-label="Perbesar peta" onClick={() => zoom(1.2)}><Plus size={16} /></button><i /><button aria-label="Sesuaikan peta" onClick={fit}><Focus size={17} /></button></div></div>
          </div>
          {selectedRelation && <RelationDetail relation={selectedRelation} source={network.entities.find(e => e.id === selectedRelation.source)!} target={network.entities.find(e => e.id === selectedRelation.target)!} onResize={resizeRelation} onSelect={select} onClose={() => setSelectedRelationId(null)} onFit={fit} onDelete={() => { setNetwork(n => ({ ...n, relations: n.relations.filter(r => r.id !== selectedRelation.id) })); setSelectedRelationId(null); setMessage('Hubungan dihapus.'); }} />}
          {!selectedRelation && selected && <aside className="detail-panel" aria-label="Detail entitas"><div className="detail-top"><span>DETAIL ENTITAS</span><button className="small-icon" aria-label="Tutup detail" onClick={() => setSelectedId(null)}><X size={16} /></button></div><div className="detail-identity"><span className={`detail-avatar ${selected.kind}`} style={{ background: `${selected.color}19`, color: selected.color }}>{selected.kind === 'person' ? initials(selected.name) : <Users size={30} />}</span><span className="kind-badge">{selected.kind === 'person' ? <UserRound size={11} /> : <Users size={11} />}{kindName(selected.kind)}</span><h2>{selected.name}</h2><p>{selected.note || 'Belum ada catatan. Tambahkan cerita tentang entitas ini.'}</p></div><button className="button edit-button" onClick={() => setModal({ type: 'entity', entity: selected })}><Pencil size={13} />Edit entitas</button><div className="connection-heading"><h3>Terhubung dengan</h3><span>{connections.length}</span></div><div className="connection-list">{connections.map(r => { const other = network.entities.find(e => e.id === (r.source === selected.id ? r.target : r.source))!; return <div className="connection" key={r.id}><button onClick={() => select(other.id)}><span className={`mini-avatar ${other.kind}`} style={{ background: `${other.color}19`, color: other.color }}>{other.kind === 'person' ? initials(other.name) : <Users size={14} />}</span><span><strong>{other.name}</strong><small>{r.source === selected.id ? <ArrowRight size={10} /> : <ArrowLeft size={10} />}{r.label}</small></span></button><button className="length-link" aria-label={`Atur panjang hubungan ${selected.name} dengan ${other.name}`} title="Atur panjang garis" onClick={() => setSelectedRelationId(r.id)}><Ruler size={14} /></button><button className="delete-link" aria-label={`Hapus hubungan ${selected.name} dengan ${other.name}`} onClick={() => { setNetwork(n => ({ ...n, relations: n.relations.filter(x => x.id !== r.id) })); setMessage('Hubungan dihapus.'); }}><X size={12} /></button></div>; })}{!connections.length && <p className="empty-connections">Belum ada hubungan. Mulai koneksi pertamanya.</p>}</div><button className="add-connection" disabled={network.entities.length < 2} onClick={() => setModal({ type: 'relation', source: selected.id })}><Plus size={14} />Hubungkan entitas</button><div className="delete-entity">{deleteConfirm ? <div><p>Hapus {selected.name} dan {connections.length} hubungannya?</p><button className="danger" onClick={() => { setNetwork(n => ({ entities: n.entities.filter(e => e.id !== selected.id), relations: n.relations.filter(r => r.source !== selected.id && r.target !== selected.id) })); setSelectedId(null); setMessage(`${selected.name} dihapus.`); }}>Ya, hapus</button><button onClick={() => setDeleteConfirm(false)}>Batal</button></div> : <button onClick={() => setDeleteConfirm(true)}><Trash2 size={12} />Hapus entitas</button>}</div></aside>}
        </div> : <div className="entity-directory"><div className="directory-header"><span>{visible.length} entitas dalam jaringan</span><span>Klik entitas untuk melihat koneksinya <ArrowRight size={14} /></span></div><div className="entity-grid">{visible.map(e => <button className="entity-card" key={e.id} onClick={() => { select(e.id); setPage('network'); }}><span className={`detail-avatar ${e.kind}`} style={{ background: `${e.color}19`, color: e.color }}>{e.kind === 'person' ? initials(e.name) : <Users size={24} />}</span><span className="kind-badge">{kindName(e.kind)}</span><h3>{e.name}</h3><p>{e.note || 'Belum ada catatan.'}</p><span className="entity-card-footer"><Link2 size={13} />{network.relations.filter(r => r.source === e.id || r.target === e.id).length} hubungan<ArrowRight size={15} /></span></button>)}</div>{!visible.length && <p className="directory-empty">Tidak ada entitas yang sesuai. Ubah pencarian atau tambahkan entitas baru.</p>}</div>}
        <footer className="card-footer"><span><span className="tiny-dot" />{page === 'network' ? 'Klik garis untuk atur panjang · Geser titik · Scroll untuk zoom' : 'Semua orang dan kelompok dalam jaringanmu'}</span><span>DATA CONTOH FIKTIF <span className="footer-divider">/</span> MILIKMU UNTUK DIKEMBANGKAN</span></footer>
      </section>
      <div className="below-canvas"><p><span className="sparkle">♡</span> Jaringan besar selalu dimulai dari satu koneksi kecil.</p><div><button onClick={() => setModal({ type: 'reset' })} title="Kembalikan data contoh"><RotateCcw size={13} /><span>Reset contoh</span></button><button onClick={() => uploadRef.current?.click()}><ArrowUpFromLine size={13} />Impor JSON</button><button onClick={exportData}><ArrowDownToLine size={13} />Ekspor data</button><input type="file" ref={uploadRef} hidden accept="application/json,.json" onChange={e => { void importData(e.target.files?.[0]); e.target.value = ''; }} /></div></div>
      <div className="page-footer"><span>Dibuat untuk melihat gambaran yang lebih besar.</span><span>JaringVisual <span>↗</span></span></div>
    </main>
    {message && <div className="toast" role="status"><Check size={17} /><span>{message}</span><button aria-label="Tutup pemberitahuan" onClick={() => setMessage('')}><X size={15} /></button></div>}
    {modal?.type === 'entity' && <ModalDialog close={() => setModal(null)} title={modal.entity ? 'Edit entitas' : 'Tambahkan entitas.'} subtitle="Setiap cerita dimulai dari seseorang. Atau sekelompok orang."><form onSubmit={saveEntity}><fieldset className="kind-options"><legend>Jenis entitas</legend><label><input type="radio" name="kind" value="person" defaultChecked={(modal.entity?.kind ?? modal.kind ?? 'person') === 'person'} /><span><UserRound size={21} /><strong>Orang</strong><small>Satu individu</small></span></label><label><input type="radio" name="kind" value="group" defaultChecked={(modal.entity?.kind ?? modal.kind) === 'group'} /><span><Users size={21} /><strong>Kelompok</strong><small>Kumpulan individu</small></span></label></fieldset><label className="field">Nama entitas <span>*</span><input name="name" placeholder="Contoh: Andi atau Studio Utara" maxLength={80} required autoFocus defaultValue={modal.entity?.name} /></label><label className="field">Catatan <span className="optional">opsional</span><textarea name="note" placeholder="Ceritakan sedikit tentang entitas ini…" rows={3} maxLength={2000} defaultValue={modal.entity?.note} /></label><ColorPicker initialColor={modal.entity?.color ?? colors[0]} />{formError && <p className="form-error" role="alert">{formError}</p>}<div className="modal-footer"><button type="button" className="button subtle" onClick={() => setModal(null)}>Batal</button><button type="submit" className="button primary"><Plus size={16} />{modal.entity ? 'Simpan perubahan' : 'Tambah entitas'}</button></div></form></ModalDialog>}
    {modal?.type === 'relation' && <ModalDialog close={() => setModal(null)} title="Buat sebuah koneksi." subtitle="Hubungkan dua entitas dan beri nama hubungannya."><form onSubmit={saveRelation}><label className="field">Dari entitas<select name="source" defaultValue={modal.source ?? network.entities[0]?.id}>{network.entities.map(e => <option key={e.id} value={e.id}>{e.name} · {kindName(e.kind)}</option>)}</select></label><div className="relation-direction"><ArrowDownToLine size={17} /><span>Arah hubungan: dari → ke</span></div><label className="field">Ke entitas<select name="target" defaultValue={network.entities.find(e => e.id !== (modal.source ?? network.entities[0]?.id))?.id}>{network.entities.map(e => <option key={e.id} value={e.id}>{e.name} · {kindName(e.kind)}</option>)}</select></label><label className="field">Nama hubungan <span>*</span><input name="label" list="relation-suggestions" required maxLength={80} placeholder="Contoh: Berteman, Anggota, Pendiri…" /><datalist id="relation-suggestions">{['Berteman', 'Bersaudara', 'Berkolaborasi', 'Bekerja sama', 'Anggota', 'Pendiri'].map(l => <option key={l} value={l} />)}</datalist></label><p className="field-hint">Bebas gunakan jenis hubungan yang sesuai dengan ceritamu.</p>{formError && <p className="form-error" role="alert">{formError}</p>}<div className="modal-footer"><button type="button" className="button subtle" onClick={() => setModal(null)}>Batal</button><button type="submit" className="button primary"><Link2 size={15} />Simpan hubungan</button></div></form></ModalDialog>}
    {modal?.type === 'help' && <ModalDialog close={() => setModal(null)} title="Kenali jaringanmu." subtitle="Panduan kecil untuk melihat gambaran yang lebih besar."><div className="help-content"><p><strong>01 · Bangun entitas</strong>Tambahkan Orang untuk individu atau Kelompok untuk komunitas, organisasi, dan kumpulan orang. Nama, catatan, dan warna bisa diubah kapan saja.</p><p><strong>02 · Hubungkan ceritanya</strong>Klik Tambah hubungan, pilih dua entitas, lalu tuliskan hubungannya. Panah menunjukkan arah dari entitas asal ke tujuan; hubungan pertemanan dapat dibaca dua arah secara makna.</p><p><strong>03 · Jelajahi peta</strong>Klik titik untuk melihat detail. Geser titik untuk mengatur posisi, geser area kosong untuk memindahkan peta, dan scroll untuk zoom. Klik garis hubungan atau ikon penggaris di daftar koneksi untuk mengatur panjangnya. Entitas tujuan akan bergeser dan garis lain yang terhubung ikut menyesuaikan. Gunakan tombol fokus untuk menampilkan seluruh hasil filter.</p><p><strong>04 · Simpan karyamu</strong>Perubahan disimpan otomatis di browser ini. Ekspor JSON untuk cadangan; impor menambahkan isi file ke jaringan yang ada. Data belum disinkronkan antar perangkat.</p><p className="help-note">Kesepuluh orang dan dua kelompok awal beserta semua hubungannya adalah contoh fiktif.</p></div><div className="modal-footer"><button className="button primary" onClick={() => setModal(null)}>Mengerti <Check size={16} /></button></div></ModalDialog>}
    {modal?.type === 'reset' && <ModalDialog close={() => setModal(null)} title="Kembali ke titik awal?" subtitle="Reset mengganti seluruh jaringan dengan 10 orang dan 2 kelompok contoh."><p className="reset-note">Perubahanmu akan dihapus dari browser ini. Ekspor data terlebih dahulu jika ingin menyimpannya.</p><div className="modal-footer"><button className="button subtle" onClick={exportData}><ArrowDownToLine size={15} />Ekspor dulu</button><button className="button subtle" onClick={() => setModal(null)}>Batal</button><button className="button primary" onClick={() => { setNetwork(sampleNetwork()); select('p0'); setSearch(''); setFilter('all'); setView({ x: 0, y: 0, z: 1 }); setModal(null); setMessage('Jaringan contoh dipulihkan.'); }}>Reset jaringan</button></div></ModalDialog>}
  </div>;
}
