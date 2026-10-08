'use client';

import { useState, useCallback, useRef } from 'react';

/* ----------------------------- Status badge ----------------------------- */
const BADGE_MAP = {
  BAIK: ['ok', 'Baik'],
  AKTIF: ['ok', 'Aktif'],
  DIPINJAM: ['warn', 'Dipinjam'],
  RUSAK: ['bad', 'Rusak'],
  'PERLU PERBAIKAN': ['warn', 'Perlu Perbaikan'],
  SUDAH: ['info', 'Tercetak'],
  BELUM: ['gray', 'Belum cetak'],
};

export function Badge({ value }) {
  const [cls, label] = BADGE_MAP[value] || ['gray', value];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function ScannedBadge({ n }) {
  if (!n) return <span className="badge gray">Belum discan</span>;
  return <span className="badge ok">{n}× discan</span>;
}

/* ---------------------------- Statistic card ---------------------------- */
export function Stat({ icon, num, label, tone = '' }) {
  return (
    <div className="stat">
      <div className="num" style={{ color: tone ? `var(--${tone})` : undefined }}>
        {icon} {num}
      </div>
      <div className="lbl">{label}</div>
    </div>
  );
}

/* ---------------------------- Page header ---------------------------- */
export function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {sub ? <p>{sub}</p> : null}
    </div>
  );
}

/* ---------------------------- Empty state ---------------------------- */
export function Empty({ icon = '🗂️', text }) {
  return (
    <div className="empty">
      <span className="ic">{icon}</span>
      {text}
    </div>
  );
}

/* ---------------------------- Toast hook ---------------------------- */
export function useToast(duration = 2200) {
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);

  const show = useCallback(
    (text) => {
      setMsg(text);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMsg(null), duration);
    },
    [duration],
  );

  const node = <div className={`toast${msg ? ' show' : ''}`}>{msg}</div>;
  return [node, show];
}

/* ---------------------------- fetch helper ---------------------------- */
export async function jfetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`Gagal (${res.status})`);
  return res.json();
}