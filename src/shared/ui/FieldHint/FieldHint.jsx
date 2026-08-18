export function FieldHint({ id, message }) {
  if (!message) {
    return null
  }

  return (
    <span id={id} className="field-hint" role="status">
      {message}
    </span>
  )
}
