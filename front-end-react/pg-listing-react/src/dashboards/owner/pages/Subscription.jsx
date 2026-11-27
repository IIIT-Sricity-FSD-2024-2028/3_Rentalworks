import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useScreenState from '../../../app/useScreenState';
import { runThunk } from '../../../app/hooks';
import { findPlan } from '../../../data/catalog';
import { subscriptionsRepo } from '../../../features/repositories';
import { fetchOwnerAccount } from '../../../features/owner/ownerSlices';
import { selectSubscriptionPlans } from '../../../features/shared/catalogSlice';
import { formatDate, formatINR, normalizeStatus, statusLabel, toNumber } from '../../../utils/normalize';

const cardStyle = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 24,
  borderRadius: 14,
  border: '1px solid var(--border, #e5e7eb)',
  background: 'var(--bg-card, #fff)',
};

function PlanCard({ plan, isCurrent, hasPlan, busy, onChoose }) {
  const period = plan.durationMonths === 1 ? '/ month' : plan.durationMonths ? `/ ${plan.durationMonths} months` : 'one-time';
  const perMonth = plan.durationMonths > 1 ? Math.round(plan.price / plan.durationMonths) : null;
  return (
    <article
      style={{
        ...cardStyle,
        borderColor: isCurrent || plan.badge === 'Most Popular' ? 'var(--primary)' : cardStyle.border,
        borderWidth: isCurrent ? 2 : 1,
      }}
    >
      {(isCurrent || plan.badge) && (
        <span
          style={{
            position: 'absolute',
            top: -11,
            left: 24,
            padding: '2px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            background: 'var(--primary)',
            color: '#fff',
          }}
        >
          {isCurrent ? 'Current plan' : plan.badge}
        </span>
      )}
      <h3 style={{ margin: 0 }}>{plan.displayName}</h3>
      <div>
        <strong style={{ fontSize: 28 }}>{formatINR(plan.price)}</strong>{' '}
        <span style={{ color: 'var(--text-muted)' }}>{period}</span>
        {perMonth && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>≈ {formatINR(perMonth)} per month</div>}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 14 }}>
        {plan.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <button
        type="button"
        className={isCurrent ? 'btn btn-secondary' : 'btn btn-primary'}
        style={{ marginTop: 'auto' }}
        disabled={isCurrent || busy}
        onClick={() => onChoose(plan)}
      >
        {isCurrent ? 'Your current plan' : hasPlan ? `Switch to ${plan.displayName}` : `Choose ${plan.displayName}`}
      </button>
    </article>
  );
}

export default function Subscription({ user }) {
  const dispatch = useDispatch();
  const plans = useSelector(selectSubscriptionPlans);
  // The owner's own plan rows (the server only returns theirs).
  const rows = useSelector(subscriptionsRepo.selectors.selectItems);
  const busy = useSelector(subscriptionsRepo.selectors.selectMutating);
  const active = rows.find((r) => normalizeStatus(r.status) === 'active') || null;
  const [confirm, setConfirm] = useScreenState(null); // { plan } | { cancel: true }

  useEffect(() => {
    dispatch(subscriptionsRepo.thunks.fetchAll());
  }, [dispatch]);

  const sub = user?.subscription || null;
  const currentName = active ? active.planType || active.planName : user?.subscriptionPlan || sub?.currentPlan || null;
  const currentPlan = findPlan(currentName, plans);
  const status = normalizeStatus(active?.status || sub?.status, currentName ? 'active' : 'inactive');
  const fee = toNumber(active?.amount ?? user?.subscriptionFee ?? sub?.monthlyFee) || currentPlan?.price || 0;
  const renewal = active?.endDate || sub?.renewalDate;

  const refresh = () => Promise.all([dispatch(subscriptionsRepo.thunks.fetchAll()), dispatch(fetchOwnerAccount())]);

  /** Choose / switch (POST: the server closes the old plan and sets price and dates) or cancel (PATCH). */
  const apply = async () => {
    const action = confirm.cancel
      ? subscriptionsRepo.thunks.updateItem({ id: active.id, changes: { status: 'cancelled' } })
      : subscriptionsRepo.thunks.createItem({ planType: confirm.plan.name });
    const { ok } = await runThunk(dispatch, action, {
      success: confirm.cancel ? 'Your plan was cancelled' : `${confirm.plan.displayName} plan activated`,
    });
    if (ok) {
      await refresh();
      setConfirm(null);
    }
  };

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0 }}>Subscription</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>
            {currentName ? (
              <>
                You are on the <strong>{currentPlan?.displayName || currentName}</strong> plan
                {fee ? <> at {formatINR(fee)}</> : null}.
              </>
            ) : (
              'You do not have an active subscription yet.'
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14 }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Status</div>
            <span className={`badge badge-${status === 'active' ? 'active' : 'inactive'}`}>{statusLabel(status)}</span>
          </div>
          {renewal && (
            <div>
              <div style={{ color: 'var(--text-muted)' }}>{active ? 'Valid until' : 'Renews on'}</div>
              <strong>{formatDate(renewal)}</strong>
            </div>
          )}
          {sub?.propertiesManaged != null && (
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Properties</div>
              <strong>
                {sub.propertiesManaged}
                {sub.maxProperties ? ` / ${sub.maxProperties}` : ''}
              </strong>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', paddingTop: 8 }}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            isCurrent={Boolean(active) && currentPlan?.name === plan.name}
            hasPlan={Boolean(active)}
            busy={busy}
            onChoose={(p) => setConfirm({ plan: p })}
          />
        ))}
      </div>

      {active && (
        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0 }}>Switching starts the new plan today. Cancelling ends your current plan now.</p>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setConfirm({ cancel: true })}>
            Cancel my plan
          </button>
        </div>
      )}

      {confirm && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{confirm.cancel ? 'Cancel your plan?' : `${active ? 'Switch to' : 'Choose'} the ${confirm.plan.displayName} plan?`}</h3>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0 }}>
                {confirm.cancel
                  ? `Your ${currentPlan?.displayName || currentName} plan ends now and your portal will show no active plan.`
                  : `${formatINR(confirm.plan.price)} ${confirm.plan.durationMonths === 1 ? 'per month' : confirm.plan.durationMonths ? `for ${confirm.plan.durationMonths} months` : 'one-time'}. It starts today${active ? ' and replaces your current plan' : ''}.`}
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)} disabled={busy}>Back</button>
              <button type="button" className={confirm.cancel ? 'btn btn-danger' : 'btn btn-primary'} onClick={apply} disabled={busy}>
                {busy ? 'Saving...' : confirm.cancel ? 'Cancel plan' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
