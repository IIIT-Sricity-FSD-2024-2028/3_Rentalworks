import React, { useMemo } from 'react';
import Icon from '../components/Icon';
import { formatINR, formatDate } from '../../../utils/normalize';
import useScreenState from '../../../app/useScreenState';

const DUE_BADGE = { paid: 'badge-active', waived: 'badge-active', overdue: 'badge-open', due_soon: 'badge-pending', upcoming: 'badge-pending' };

function DueBadge({ due }) {
  if (!due) return <span className="text-muted">No rent cycle yet</span>;
  return (
    <span className={`badge ${DUE_BADGE[due.status] || 'badge-pending'}`}>
      {due.statusLabel} · {formatINR(due.amount)}
    </span>
  );
}

function Empty({ icon, title, text }) {
  return (
    <div className="card empty-state p-30-20">
      <div className="empty-icon">
        <Icon className="material-icons icon-48 icon-light">{icon}</Icon>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

/**
 * Tenants: who lives in the owner's properties, the rent ledger, and booking
 * requests waiting on payment. Read-only for owners: wardens allot beds and
 * record offline payments; tenants pay online.
 */
export default function Tenants({ tenants = [], ledger = [], requests = [], properties = [] }) {
  const [tab, setTab] = useScreenState('tenants');
  const [property, setProperty] = useScreenState('');
  const [query, setQuery] = useScreenState('');

  const byProperty = (rows) => rows.filter((r) => !property || String(r.propertyId) === property);
  const q = query.trim().toLowerCase();

  const shownTenants = useMemo(
    () => byProperty(tenants).filter((t) => !q || `${t.name} ${t.email} ${t.phone} ${t.room}`.toLowerCase().includes(q)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenants, property, q],
  );
  const shownLedger = useMemo(
    () => byProperty(ledger).filter((d) => !q || d.tenantName.toLowerCase().includes(q)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger, property, q],
  );
  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = byProperty(ledger).filter((d) => d.period === month);
  const collected = thisMonth.filter((d) => d.status === 'paid').reduce((n, d) => n + d.amount, 0);
  const billed = thisMonth.reduce((n, d) => n + d.amount, 0);
  const overdue = byProperty(ledger).filter((d) => d.status === 'overdue');

  const tabs = [
    { id: 'tenants', label: `Current tenants (${byProperty(tenants).length})` },
    { id: 'rent', label: `Rent ledger (${byProperty(ledger).length})` },
    { id: 'requests', label: `Booking requests (${pendingRequests.length})` },
  ];

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <Icon className="material-icons">groups</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{byProperty(tenants).length}</div>
            <div className="stat-label">Current tenants</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <Icon className="material-icons">payments</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{formatINR(collected)}</div>
            <div className="stat-label">Collected this month</div>
            <div className="stat-change">of {formatINR(billed)} billed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <Icon className="material-icons">schedule</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{overdue.length}</div>
            <div className="stat-label">Overdue dues</div>
            <div className={overdue.length ? 'stat-change down' : 'stat-change up'}>
              {overdue.length ? formatINR(overdue.reduce((n, d) => n + d.amount, 0)) + ' outstanding' : 'All clear'}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <Icon className="material-icons">pending_actions</Icon>
          </div>
          <div className="stat-info">
            <div className="stat-value">{pendingRequests.length}</div>
            <div className="stat-label">Requests awaiting payment</div>
          </div>
        </div>
      </div>

      <div className="card mb-20" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div role="tablist" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select aria-label="Filter by property" className="form-input" style={{ maxWidth: 240 }} value={property} onChange={(e) => setProperty(e.target.value)}>
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {tab !== 'requests' && <input type="search" aria-label="Search tenants" className="form-input" style={{ maxWidth: 220 }} placeholder="Search tenant" value={query} onChange={(e) => setQuery(e.target.value)} />}
        </div>
      </div>

      {tab === 'tenants' &&
        (shownTenants.length === 0 ? (
          <Empty icon="groups" title="No current tenants" text="Tenants appear here once they book and move into one of your rooms." />
        ) : (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Room / bed</th>
                  <th>Moved in</th>
                  <th>Rent</th>
                </tr>
              </thead>
              <tbody>
                {shownTenants.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.name}</strong>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {[t.phone, t.email].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td>{t.propertyName}</td>
                    <td>{[t.room && `Room ${t.room}`, t.bed && `Bed ${t.bed}`].filter(Boolean).join(' · ') || '—'}</td>
                    <td>{formatDate(t.moveInDate)}</td>
                    <td>
                      <DueBadge due={t.due} />
                      {t.due && t.due.status !== 'paid' && <div className="text-muted" style={{ fontSize: 12 }}>due {formatDate(t.due.dueDate)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === 'rent' &&
        (shownLedger.length === 0 ? (
          <Empty icon="receipt_long" title="No rent cycles yet" text="A monthly rent cycle is created for each tenant automatically after they move in." />
        ) : (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Amount</th>
                  <th>Due date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shownLedger.map((d) => (
                  <tr key={d.id}>
                    <td>{d.period}</td>
                    <td>{d.tenantName}</td>
                    <td>{d.propertyName}</td>
                    <td>{formatINR(d.amount)}</td>
                    <td>{formatDate(d.dueDate)}</td>
                    <td>
                      <span className={`badge ${DUE_BADGE[d.status] || 'badge-pending'}`}>{d.statusLabel}</span>
                      {d.paidAt && (
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          paid {formatDate(d.paidAt)}
                          {d.paidVia ? ` · ${d.paidVia}` : ''}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === 'requests' &&
        (pendingRequests.length === 0 ? (
          <Empty icon="pending_actions" title="No pending requests" text="Requests appear when a tenant reserves a room but has not paid yet." />
        ) : (
          <div className="card table-wrap">
            <p className="text-muted" style={{ fontSize: 13, marginTop: 0 }}>
              A request becomes a confirmed booking automatically when the tenant pays at checkout.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property / room</th>
                  <th>Requested</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {[r.phone, r.email].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td>
                      {r.propertyName}
                      {r.room ? ` · Room ${r.room}` : ''}
                    </td>
                    <td>{formatDate(r.requestedDate)}</td>
                    <td>{r.message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
