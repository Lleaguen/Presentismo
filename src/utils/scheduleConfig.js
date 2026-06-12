export const SCHEDULE_HOURS = [
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
  { label: '18:00', value: '18:00', block: null },
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

/**
 * Dado un string de hora (ej: "12:44:20", "13:10:00"),
 * devuelve el `value` del slot más cercano.
 *
 * Lógica: slot cuya distancia absoluta a la hora real es mínima.
 * Si hay empate, gana el slot anterior (floor).
 */
export function matchSlot(horaStr) {
  if (!horaStr || String(horaStr).trim() === '') return null

  const mins = toMinutes(horaStr)
  if (mins === null) return null

  let best = null
  let bestDist = Infinity

  for (const slot of SLOTS_MINS) {
    const dist = Math.abs(slot.mins - mins)
    if (dist < bestDist) {
      bestDist = dist
      best = slot.value
    }
  }

  return best
}
