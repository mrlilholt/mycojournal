export default function IconButton({ className = '', children, type = 'button', ...props }) {
  return (
    <button type={type} className={`icon-button ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
