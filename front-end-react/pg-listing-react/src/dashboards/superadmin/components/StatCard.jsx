export default function StatCard({ icon, color, value, label, trend, valueStyle }) {
  return <div className="stat-card">
    <div className="stat-top">
      <div className={`stat-icon bg-${color}`}><span className="material-icons-outlined" style={{ fontSize: 32 }}>{icon}</span></div>
      {trend && <span className="stat-trend up">{trend}</span>}
    </div>
    <div className="stat-val" style={valueStyle}>{value}</div>
    <div className="stat-lbl">{label}</div>
  </div>;
}
