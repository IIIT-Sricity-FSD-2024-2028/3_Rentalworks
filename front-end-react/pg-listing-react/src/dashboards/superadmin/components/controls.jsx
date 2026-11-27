// Small building blocks shared by the super admin control pages.

import { iconBtn } from './controlUtils';
import useScreenState from '../../../app/useScreenState';

const TONES = {
  green: ['#dcfce7', '#15803d'],
  amber: ['#fef3c7', '#b45309'],
  red: ['#fee2e2', '#b91c1c'],
  blue: ['#dbeafe', '#1d4ed8'],
  indigo: ['#e0e7ff', '#4338ca'],
  slate: ['#f1f5f9', '#475569'],
  purple: ['#f3e8ff', '#7e22ce'],
};

export function Pill({ tone = 'slate', children, title }) {
  const [bg, fg] = TONES[tone] || TONES.slate;
  return (
    <span title={title} style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
      {children}
    </span>
  );
}

/** Centered dialog using the portal's modal styles. */
export function Dialog({ title, onClose, children, footer, width = 480 }) {
  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal" style={{ width, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-hdr">
          <h3>{title}</h3>
          <span className="modal-close" onClick={onClose} aria-label="Close">×</span>
        </div>
        <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Label / value rows inside a dialog. */
export function Facts({ rows }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, columnGap: 12 }}>
      {rows.filter(Boolean).map(([label, value]) => (
        <FactRow key={label} label={label} value={value} />
      ))}
    </div>
  );
}
function FactRow({ label, value }) {
  return (
    <>
      <span style={{ color: '#64748b' }}>{label}</span>
      <strong style={{ fontWeight: 600, wordBreak: 'break-word' }}>{value ?? '—'}</strong>
    </>
  );
}

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useScreenState(false);
  return (
    <button
      type="button"
      className="btn-cancel"
      style={{ padding: '6px 12px' }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

/** Small tab strip with counts. */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
      {tabs.map(([key, label, count]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1.5px solid ${value === key ? '#2563eb' : '#e2e8f0'}`,
            background: value === key ? '#eff6ff' : 'white', color: value === key ? '#1d4ed8' : '#475569',
          }}
        >
          {label}{count !== undefined && <span style={{ marginLeft: 6, opacity: 0.7 }}>{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function IconAction({ icon, title, onClick, danger, disabled }) {
  return (
    <button type="button" title={title} aria-label={title} style={{ ...iconBtn(danger), opacity: disabled ? 0.4 : 1 }} onClick={onClick} disabled={disabled}>
      <span className="material-icons-outlined" style={{ fontSize: 18 }}>{icon}</span>
    </button>
  );
}

