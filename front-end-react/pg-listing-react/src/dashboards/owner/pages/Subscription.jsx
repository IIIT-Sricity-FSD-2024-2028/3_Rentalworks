import { useSelector } from 'react-redux';
import { findPlan } from '../../../data/catalog';
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

function PlanCard({ plan, isCurrent }) {
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
    </article>
  );
}

export default function Subscription({ user }) {
  const plans = useSelector(selectSubscriptionPlans);
  const sub = user?.subscription || null;
  const currentName = user?.subscriptionPlan || sub?.currentPlan || null;
  const currentPlan = findPlan(currentName, plans);
  const status = normalizeStatus(sub?.status, currentName ? 'active' : 'inactive');
  const fee = toNumber(user?.subscriptionFee ?? sub?.monthlyFee) || currentPlan?.price || 0;

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
          {sub?.renewalDate && (
            <div>
              <div style={{ color: 'var(--text-muted)' }}>Renews on</div>
              <strong>{formatDate(sub.renewalDate)}</strong>
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
          <PlanCard key={plan.name} plan={plan} isCurrent={currentPlan?.name === plan.name} />
        ))}
      </div>

      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0 }}>
          Online checkout is not enabled yet. To start or change a plan, message your administrator and they will activate it for you.
        </p>
        <a className="btn btn-primary" href="/dashboard/owner/notifications">
          Contact administrator
        </a>
      </div>
    </section>
  );
}
