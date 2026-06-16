export const SCHEDULE_HOURS = [
  { label: '10:00', value: '10:00', block: null },
  { label: '11:00', value: '11:00', block: null },
  { label: '12:00', value: '12:00', block: 'dia' },
  { label: '13:00', value: '13:00', block: 'dia' },
  { label: '13:30', value: '13:30', block: 'dia' },
  { label: '14:00', value: '14:00', block: 'dia' },
  { label: '15:00', value: '15:00', block: 'dia' },
  { label: '15:30', value: '15:30', block: 'dia' },
  { label: '16:00', value: '16:00', block: 'dia' },
  { label: '16:30', value: '16:30', block: 'dia' },
  { label: '17:00', value: '17:00', block: 'dia' },
  { label: '18:00', value: '18:00', block: 'dia' },
  { label: '20:00', value: '20:00', block: 'noche' },
  { label: '22:00', value: '22:00', block: 'noche' },
  { label: '23:00', value: '23:00', block: 'noche' },
  { label: '0:00',  value: '0:00',  block: 'noche' },
  { label: '6:00',  value: '6:00',  block: 'noche' },
  { label: '7:00',  value: '7:00',  block: null },
]

/**
 * Convierte "H:MM" o "H:MM:SS" a minutos desde medianoche.
 */
export function toMinutes(str) {
  if (!str) return null
  const parts = String(str).trim().split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
  return parts[0] * 60 + parts[1]
}

// Slots precalculados en minutos
const SLOTS_MINS = SCHEDULE_HOURS.map((s) => ({
  ...s,
  mins: toMinutes(s.value),
}))

// Slots que corresponden al día siguiente (pasada la medianoche)
const NEXT_DAY_SLOTS = new Set(['0:00', '6:00', '7:00'])

/**
 * Indica si un slot pertenece al día siguiente respecto a la fecha citada.
 */
export function isNextDaySlot(slotValue) {
  return NEXT_DAY_SLOTS.has(slotValue)
}

/**
 * Parsea "DD/MM/YYYY" y devuelve un objeto Date UTC.
 */
export function parseDateDMY(str) {
  if (!str) return null
  const parts = String(str).trim().split('/')
  if (parts.length !== 3) return null
  const [d, m, y] = parts.map(Number)
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null
  return new Date(Date.UTC(y, m - 1, d))
}

/**
 * Dado fechaIngresoCitado y fechaIngresoGrabado (strings "DD/MM/YYYY")
 * y el slot de hora citada, valida que la fecha grabada sea la correcta:
 * - Slots normales: misma fecha
 * - Slots pasada medianoche (0:00, 6:00, 7:00): día siguiente
 */
export function fechaGrabadaValida(fechaCitada, fechaGrabada, slotValue) {
  if (!fechaCitada || !fechaGrabada) return false
  const citada  = parseDateDMY(fechaCitada)
  const grabada = parseDateDMY(fechaGrabada)
  if (!citada || !grabada) return false
  const diffDias = Math.round((grabada - citada) / (1000 * 60 * 60 * 24))
  if (isNextDaySlot(slotValue)) {
    return diffDias === 1
  }
  return diffDias === 0
}
/**
 * Dado un string de hora (ej: "11:00:00", "13:30:00"),
 * devuelve el `value` del slot si coincide exactamente (ignorando segundos).
 * Si no hay coincidencia exacta, devuelve null.
 */
export function matchSlot(horaStr) {
  if (!horaStr || String(horaStr).trim() === '') return null

  const mins = toMinutes(horaStr)
  if (mins === null) return null

  const match = SLOTS_MINS.find((slot) => slot.mins === mins)
  return match ? match.value : null
}
