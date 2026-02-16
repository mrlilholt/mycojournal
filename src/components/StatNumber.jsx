export default function StatNumber({ value, unit, label, align = 'left' }) {
  return (
    <div className="stat-number" style={{ textAlign: align }}>
      <div className="value">{value}</div>
      <div className="unit">{unit}</div>
      {label ? <div className="label" style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{label}</div> : null}
    </div>
  )
}
