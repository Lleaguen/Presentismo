/**
 * Funciones auxiliares de estilos condicionales para la tabla de franjas.
 * Extraídas de ScheduleTable.jsx para mantener el componente limpio.
 */

export function diffClass(val, s) {
  if (val > 0) return s.diffPos
  if (val < 0) return s.diffNeg
  return s.diffZero
}

export function pctClass(val, s) {
  if (val === '—') return ''
  const n = parseFloat(val)
  if (n >= 95) return s.pctHigh
  if (n >= 80) return s.pctMid
  return s.pctLow
}

export function diffTotalClass(val, s) {
  if (val > 0) return s.diffTotalPos
  if (val < 0) return s.diffTotalNeg
  return ''
}

export function presentesClass(pres, conv, s) {
  if (!conv || conv === 0) return ''
  const pct = (pres / conv) * 100
  if (pct >= 95) return s.presHigh
  if (pct >= 80) return s.presMid
  if (pct >= 50) return s.presLow
  return s.presVeryLow
}
