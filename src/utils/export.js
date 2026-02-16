import { formatDateTime, formatDate } from './date.js'

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportGrowToCsv({ grow, logs, harvests }) {
  const headers = [
    'type',
    'timestamp',
    'block',
    'treatment',
    'growth_mm_day',
    'flush_height_mm',
    'temp',
    'humidity',
    'co2',
    'fae',
    'lightHours',
    'surfaceCondition',
    'flushNumber',
    'weight',
    'quality',
    'notes'
  ]

  const rows = []
  logs.forEach((log) => {
    rows.push([
      'log',
      formatDateTime(log.timestamp),
      log.block ?? '',
      log.treatment ?? '',
      log.growthMmPerDay ?? '',
      log.flushHeightMm ?? '',
      log.temp ?? '',
      log.humidity ?? '',
      log.co2 ?? '',
      log.fae ?? '',
      log.lightHours ?? '',
      log.surfaceCondition ?? '',
      '',
      '',
      '',
      sanitize(log.notes)
    ])
  })
  harvests.forEach((harvest) => {
    rows.push([
      'harvest',
      formatDate(harvest.date),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      harvest.flushNumber ?? '',
      harvest.weight ?? '',
      harvest.quality ?? '',
      sanitize(harvest.notes)
    ])
  })

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => wrapCsv(cell)).join(','))
    .join('\n')

  downloadText(`${grow.name.replace(/\s+/g, '_')}_export.csv`, csv)
}

function wrapCsv(value) {
  const cell = value ?? ''
  const text = String(cell)
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function sanitize(value) {
  if (!value) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}
