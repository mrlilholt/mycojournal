export function toF(celsius) {
  if (celsius === '' || celsius === null || celsius === undefined) return ''
  const value = Number(celsius)
  if (Number.isNaN(value)) return ''
  return (value * 9) / 5 + 32
}

export function toC(fahrenheit) {
  if (fahrenheit === '' || fahrenheit === null || fahrenheit === undefined) return ''
  const value = Number(fahrenheit)
  if (Number.isNaN(value)) return ''
  return ((value - 32) * 5) / 9
}

export function formatTemp(value, units) {
  if (value === '' || value === null || value === undefined) return '—'
  const number = Number(value)
  if (Number.isNaN(number)) return '—'
  const display = units === 'C' ? toC(number) : number
  return `${Math.round(display * 10) / 10}°${units}`
}

export function parseTemp(input, units) {
  if (input === '' || input === null || input === undefined) return ''
  const value = Number(input)
  if (Number.isNaN(value)) return ''
  return units === 'C' ? toF(value) : value
}
