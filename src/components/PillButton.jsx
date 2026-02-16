export default function PillButton({
  variant = 'ghost',
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button type={type} className={`pill-button ${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
