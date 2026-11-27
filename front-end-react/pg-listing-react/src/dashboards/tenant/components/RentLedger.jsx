import React from 'react';
import { formatINR } from '../../../utils/normalize';
import ServiceUsageList from './ServiceUsageList';

const fmt = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const STATUS = {
  paid: { label: 'Paid', bg: '#dcfce7', fg: '#15803d' },
  upcoming: { label: 'Upcoming', bg: '#e0e7ff', fg: '#4338ca' },
  due_soon: { label: 'Due Soon', bg: '#fef3c7', fg: '#b45309' },
  overdue: { label: 'Overdue', bg: '#fee2e2', fg: '#b91c1c' },
  waived: { label: 'Waived', bg: '#f1f5f9', fg: '#475569' },
};

/** Billing & Rent Ledger: past cycles with receipts, current/next cycle with Pay Now. */
export default function RentLedger({ dues, pendingCharges = [], onPay, onReceipt }) {
  const rows = [...dues].sort((a, b) => String(a.periodStart).localeCompare(String(b.periodStart)));
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-body">
        <div className="card-title">Billing &amp; Rent Ledger</div>
        {pendingCharges.length > 0 && (
          <section className="service-usage-pending" aria-label="Unbilled service usage">
            <strong>Completed services awaiting a rent bill</strong>
            <ServiceUsageList charges={pendingCharges} formatDate={fmt} />
          </section>
        )}
        {rows.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 10 }}>No billing cycles yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '8px 6px' }}>Cycle</th>
                  <th>Period</th>
                  <th>Due date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const st = d.effectiveStatus || d.status;
                  const tag = STATUS[st] || STATUS.upcoming;
                  return (
                    <tr key={d.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 6px' }}>#{d.cycleNo}</td>
                      <td>{fmt(d.periodStart)} – {fmt(d.periodEnd)}</td>
                      <td>{fmt(d.dueDate)}</td>
                      <td>
                        {formatINR(d.amount)}
                        {d.serviceCharges?.length > 0 && (
                          <details className="service-usage-details">
                            <summary>Rent {formatINR(d.rentAmount)} + services {formatINR(d.serviceAmount)}</summary>
                            <ServiceUsageList charges={d.serviceCharges} formatDate={fmt} />
                          </details>
                        )}
                      </td>
                      <td>
                        <span style={{ background: tag.bg, color: tag.fg, padding: '3px 10px', borderRadius: 99, fontWeight: 700, fontSize: 11 }}>
                          {tag.label}
                        </span>
                        {st === 'overdue' && typeof d.daysUntilDue === 'number' && (
                          <span style={{ color: '#b91c1c', marginLeft: 8, fontSize: 11 }}>{Math.abs(d.daysUntilDue)}d late</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {st === 'paid' ? (
                          <button className="btn btn-outline btn-sm" onClick={() => onReceipt(d)}>
                            <span className="material-icons-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>download</span> Receipt
                          </button>
                        ) : st === 'waived' ? (
                          <span style={{ color: '#64748b' }}>—</span>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={() => onPay(d)}>[ Pay Now ]</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
