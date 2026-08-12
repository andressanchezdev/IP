export function SummaryRow({ label, value, highlight = false }) {
  return (
    <div className={`checkout-finalize__row ${highlight ? 'checkout-finalize__row--highlight' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
