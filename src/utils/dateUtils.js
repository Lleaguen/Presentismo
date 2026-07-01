/**
 * Utilidades compartidas de fecha y hora.
 * Consolida las funciones duplicadas de parseFecha, esHoy y toMins
 * que antes aparecían en ScheduleTable, IngresoCurveChart e InsightCarousel.
 */

/**
 * Parsea un string de fecha en formato "YYYY-MM-DD" o "DD/MM/YYYY"
 * y devuelve un objeto Date UTC.
 * @param {string|*} str
 * @returns {Date|null}
 */
export function parseFecha(str) {
  const s = String(str ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }
  const p = s.split('/')
  if (p.length === 3) {
    const [d, m, y] = p.map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }
  return null
}

/**
 * Devuelve true si la fecha representada por fechaStr coincide con hoyUTC.
 * @param {string} fechaStr
 * @param {Date} hoyUTC  - Date creada con Date.UTC para evitar problemas de TZ
 * @returns {boolean}
 */
export function esHoy(fechaStr, hoyUTC) {
  const f = parseFecha(fechaStr)
  if (!f) return false
  return (
    f.getUTCFullYear() === hoyUTC.getUTCFullYear() &&
    f.getUTCMonth()    === hoyUTC.getUTCMonth() &&
    f.getUTCDate()     === hoyUTC.getUTCDate()
  )
}

/**
 * Convierte un string "H:MM" o "H:MM:SS" a minutos desde medianoche.
 * @param {string|*} str
 * @returns {number|null}
 */
export function toMins(str) {
  if (!str) return null
  const parts = String(str).trim().split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0])) return null
  return parts[0] * 60 + (parts[1] || 0)
}

/**
 * Devuelve un objeto Date UTC representando el inicio del día de hoy.
 * @returns {Date}
 */
export function hoyUTC() {
  const hoy = new Date()
  return new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
}
