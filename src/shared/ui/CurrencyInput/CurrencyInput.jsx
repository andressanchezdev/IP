import { formatCurrencyInput, parseCurrencyInput } from '@/shared/lib/currencyInput'

/** Input de moneda reutilizable; conserva clases del contenedor padre. */
export function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = '0',
  min,
  max,
  className = '',
  disabled = false,
}) {
  const displayValue = value === '' || value === null || value === undefined
    ? ''
    : formatCurrencyInput(value)

  const handleChange = (event) => {
    const nextAmount = parseCurrencyInput(event.target.value)
    let bounded = nextAmount

    if (typeof min === 'number' && bounded < min && event.target.value !== '') {
      bounded = min
    }
    if (typeof max === 'number' && bounded > max) {
      bounded = max
    }

    onChange?.(bounded || '')
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      aria-label="Monto en pesos"
    />
  )
}
