import { formatINR } from '../../../utils/normalize';

export default function ServiceUsageList({ charges, formatDate }) {
  return (
    <ul className="service-usage-list">
      {charges.map((charge) => (
        <li key={charge.id}>
          <span>
            {charge.serviceName}
            {charge.pricingModel === 'per_kg' && ` · ${charge.quantity} kg`}
            {charge.usedOn && <small>{formatDate(charge.usedOn)}</small>}
          </span>
          <strong>{formatINR(charge.amount)}</strong>
        </li>
      ))}
    </ul>
  );
}
