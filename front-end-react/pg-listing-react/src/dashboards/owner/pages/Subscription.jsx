import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useScreenState from '../../../app/useScreenState';
import { runThunk } from '../../../app/hooks';
import { findPlan } from '../../../data/catalog';
import { subscriptionsRepo } from '../../../features/repositories';
import { cancelOwnerPlan, changeOwnerPlan, clearPlanQuote, fetchPlanQuote, selectPlanQuote } from '../../../features/owner/ownerSlices';
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

const warnBox = {
  padding: 12,
  borderRadius: 10,
  background: 'rgba(239, 68, 68, 0.08)',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  fontSize: 14,
};

const row = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0' };

function planEnd(plan) {
  if (!plan?.months) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + plan.months);
  return d.toISOString().slice(0, 10);
}

function PlanCard({ plan, isCurrent, current, busy, onChoose }) {
  const period = plan.durationMonths === 1 ? '/ month' : plan.durationMonths ? `/ ${plan.durationMonths} months` : 'one-time';
  const perMonth = plan.durationMonths > 1 ? Math.round(plan.price / plan.durationMonths) : null;
  const label = isCurrent
    ? 'Your current plan'
    : !current
      ? `Choose ${plan.displayName}`
      : plan.price > (current.price || 0)
        ? `Upgrade to ${plan.displayName}`
        : `Switch to ${plan.displayName}`;
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
        {label}
      </button>
    </article>
  );
}

/** Price breakdown / no-refund warning for the chosen plan, from the server's quote. */
function QuoteBody({ quote, agreed, setAgreed }) {
  const { kind, current, plan, credit, amountDue } = quote;
  if (kind === 'same') return <p style={{ margin: 0 }}>You are already on the {plan.displayName} plan.</p>;
  const until = planEnd(plan);
  const validity = until ? `valid until ${formatDate(until)}` : 'valid for life';

  if (kind === 'downgrade') {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <p style={{ margin: 0 }}>
          You are moving from <strong>{current.displayName}</strong> ({formatINR(current.price)}) to <strong>{plan.displayName}</strong> ({formatINR(plan.price)}).
          The {plan.displayName} plan starts today and is {validity}.
        </p>
        <div style={warnBox}>
          <strong>This change cannot be reverted and the money will not be refunded.</strong>
          <div style={{ marginTop: 4 }}>
            The unused value of your {current.displayName} plan{current.unusedValue ? ` (${formatINR(current.unusedValue)})` : ''} is lost. Moving back to{' '}
            {current.displayName} later means paying for it again.
          </div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3 }} />
          <span>I understand this change is final and nothing will be refunded.</span>
        </label>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {kind === 'upgrade' && (
        <p style={{ margin: 0 }}>
          Upgrade from <strong>{current.displayName}</strong> to <strong>{plan.displayName}</strong>. You only pay the difference for the time you have not used.
        </p>
      )}
      <div style={{ borderTop: '1px solid var(--border, #e5e7eb)', borderBottom: '1px solid var(--border, #e5e7eb)', padding: '4px 0' }}>
        <div style={row}>
          <span>{plan.displayName} plan ({plan.duration})</span>
          <span>{formatINR(plan.price)}</span>
        </div>
        {kind === 'upgrade' && (
          <div style={{ ...row, color: 'var(--success, #16a34a)' }}>
            <span>
              Credit for unused {current.displayName}
              {current.daysLeft != null ? ` (${current.daysLeft} of ${current.totalDays} days left)` : ''}
            </span>
            <span>− {formatINR(credit)}</span>
          </div>
        )}
        <div style={{ ...row, fontWeight: 700, fontSize: 16 }}>
          <span>Amount to pay</span>
          <span>{formatINR(amountDue)}</span>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
        The new plan starts today and is {validity}
        {kind === 'upgrade' ? `; it replaces your ${current.displayName} plan` : ''}.
        {quote.gatewayMode === 'test' ? ' Test mode: no real money is charged.' : ' You will pay securely through Razorpay.'}
      </p>
    </div>
  );
}

export default function Subscription({ user }) {
  const dispatch = useDispatch();
  const plans = useSelector(selectSubscriptionPlans);
  // The owner's own plan rows (the server only returns theirs).
  const rows = useSelector(subscriptionsRepo.selectors.selectItems);
  const mutating = useSelector(subscriptionsRepo.selectors.selectMutating);
  const quoteState = useSelector(selectPlanQuote);
  const active = rows.find((r) => normalizeStatus(r.status) === 'active') || null;
  const [confirm, setConfirm] = useScreenState(null); // { plan } | { cancel: true }
  const [agreed, setAgreed] = useScreenState(false);
  const [working, setWorking] = useScreenState(false);
  const busy = mutating || working;

  useEffect(() => {
    dispatch(subscriptionsRepo.thunks.fetchAll());
    return () => {
      dispatch(clearPlanQuote());
    };
  }, [dispatch]);

  const sub = user?.subscription || null;
  const currentName = active ? active.planType || active.planName : user?.subscriptionPlan || sub?.currentPlan || null;
  const currentPlan = findPlan(currentName, plans);
  const status = normalizeStatus(active?.status || sub?.status, currentName ? 'active' : 'inactive');
  const fee = toNumber(active?.amount ?? user?.subscriptionFee ?? sub?.monthlyFee) || currentPlan?.price || 0;
  const renewal = active?.endDate || sub?.renewalDate;
  const current = active ? { price: fee } : null;

  const close = (force = false) => {
    if (busy && force !== true) return;
    setConfirm(null);
    setAgreed(false);
    dispatch(clearPlanQuote());
  };

  const choose = (plan) => {
    setAgreed(false);
    setConfirm({ plan });
    dispatch(fetchPlanQuote(plan.name));
  };

  const quote = confirm?.plan && quoteState.status === 'succeeded' ? quoteState.data : null;

  const apply = async () => {
    setWorking(true);
    try {
      if (confirm.cancel) {
        const { ok } = await runThunk(dispatch, cancelOwnerPlan(active.id), { success: 'Your plan was cancelled' });
        if (ok) close(true);
        return;
      }
      const { ok } = await runThunk(
        dispatch,
        changeOwnerPlan({
          planType: quote.plan.planType,
          requiresPayment: quote.requiresPayment,
          confirmNoRefund: quote.requiresConfirmation ? agreed : undefined,
          description: `${quote.plan.displayName} plan${quote.kind === 'upgrade' ? ' (upgrade)' : ''}`,
        }),
        {
          success: (saved) =>
            saved?.change?.amountPaid
              ? `${quote.plan.displayName} plan activated. Paid ${formatINR(saved.change.amountPaid)}${saved.change.receiptNumber ? ` (receipt ${saved.change.receiptNumber})` : ''}.`
              : `You are now on the ${quote.plan.displayName} plan.`,
        },
      );
      if (ok) {
        close(true);
      } else {
        // The plan may have changed (or the price moved): show the latest quote.
        dispatch(fetchPlanQuote(quote.plan.planType));
      }
    } finally {
      setWorking(false);
    }
  };

  const needsAgreement = confirm?.cancel || quote?.requiresConfirmation;
  const canConfirm = !busy && (confirm?.cancel || (quote && quote.kind !== 'same')) && (!needsAgreement || agreed);
  const confirmLabel = busy
    ? quote?.requiresPayment ? 'Processing payment...' : 'Saving...'
    : confirm?.cancel
      ? 'Cancel plan'
      : quote?.requiresPayment
        ? `Pay ${formatINR(quote.amountDue)}`
        : 'Confirm switch';

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
          {(renewal || active) && (
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Valid until</div>
              <strong>{renewal ? formatDate(renewal) : 'Lifetime'}</strong>
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
            current={current}
            busy={busy}
            onChoose={choose}
          />
        ))}
      </div>

      {active && (
        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0 }}>
            Upgrades are charged only the difference for your unused time. Moving to a cheaper plan or cancelling is final and not refunded.
          </p>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={() => {
              setAgreed(false);
              setConfirm({ cancel: true });
            }}
          >
            Cancel my plan
          </button>
        </div>
      )}

      {confirm && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>
                {confirm.cancel
                  ? 'Cancel your plan?'
                  : quote?.kind === 'upgrade'
                    ? `Upgrade to ${confirm.plan.displayName}`
                    : quote?.kind === 'downgrade'
                      ? `Switch to ${confirm.plan.displayName}?`
                      : `Choose the ${confirm.plan.displayName} plan`}
              </h3>
            </div>
            <div className="modal-body">
              {confirm.cancel ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <p style={{ margin: 0 }}>Your {currentPlan?.displayName || currentName} plan ends today and your portal will show no active plan.</p>
                  <div style={warnBox}>
                    <strong>This cannot be undone and the money will not be refunded.</strong>
                    <div style={{ marginTop: 4 }}>To get a plan again you will need to buy one at full price.</div>
                  </div>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3 }} />
                    <span>I understand cancelling is final and nothing will be refunded.</span>
                  </label>
                </div>
              ) : quoteState.status === 'failed' ? (
                <p style={{ margin: 0, color: 'var(--danger, #dc2626)' }}>{quoteState.error || 'Could not work out the price. Please try again.'}</p>
              ) : !quote ? (
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Working out the price…</p>
              ) : (
                <QuoteBody quote={quote} agreed={agreed} setAgreed={setAgreed} />
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => close()} disabled={busy}>Back</button>
              {(confirm.cancel || quote) && (
                <button
                  type="button"
                  className={confirm.cancel || quote?.kind === 'downgrade' ? 'btn btn-danger' : 'btn btn-primary'}
                  onClick={apply}
                  disabled={!canConfirm}
                >
                  {confirmLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
