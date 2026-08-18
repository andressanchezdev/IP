export function SummaryRow({ label, value, highlight = false, valueClassName = '' }) {
  return (
    <div className={`checkout-finalize__row ${highlight ? 'checkout-finalize__row--highlight' : ''}`}>
      <span>{label}</span>
      <strong className={valueClassName || undefined}>{value}</strong>
    </div>
  )
}
