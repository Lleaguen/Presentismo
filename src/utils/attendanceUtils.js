/**
 * Utilidades de negocio para calcular presencia de empleados.
 * Centraliza las reglas de "presente" que antes estaban duplicadas
 * en App, ScheduleTable e InsightCarousel.
 */
import { esHoy, hoyUTC } from './dateUtils'
import { matchSlot } from './scheduleConfig'

const NEXT_DAY_SLOTS = new Set(['0:00', '6:00', '7:00'])

/**
 * Determina si una fila del CSV corresponde a un empleado presente.
 * Reglas:
 *  - Tiene hora de ingreso grabado
 *  - Gerencia es OPSEMLI
 *  - La fecha citada es hoy
 *  - El slot de hora no es uno del día siguiente
 *
 * @param {object} row - Fila del CSV
 * @param {Date} todayUTC - Resultado de hoyUTC() para no recalcularlo en cada llamada
 * @returns {boolean}
 */
export function esPresente(row, todayUTC) {
  if (!row.horaIngresoGrabado || String(row.horaIngresoGrabado).trim() === '') return false
  if (String(row.gerencia ?? '').trim().toUpperCase() !== 'OPSEMLI') return false
  if (!esHoy(row.fechaIngresoCitado, todayUTC)) return false
  const slot = matchSlot(String(row.horaIngresoCitado ?? '').trim())
  if (slot && NEXT_DAY_SLOTS.has(slot)) return false
  return true
}

/**
 * Versión simple para la tabla de empleados (AttendanceTable):
 * solo verifica si tiene hora de ingreso grabado, sin filtro de gerencia/fecha.
 * @param {object} row
 * @returns {boolean}
 */
export function tieneIngreso(row) {
  return row.horaIngresoGrabado && String(row.horaIngresoGrabado).trim() !== ''
}

/**
 * Cuenta cuántos registros corresponden a empleados presentes hoy (OPSEMLI).
 * @param {object[]} rows
 * @returns {number}
 */
export function contarPresentes(rows) {
  const today = hoyUTC()
  return rows.filter((r) => esPresente(r, today)).length
}

/**
 * Cuenta cuántos registros son del sector "NUEVO" con ingreso grabado.
 * @param {object[]} rows
 * @returns {number}
 */
export function contarNuevos(rows) {
  return rows.filter(
    (r) =>
      String(r.sector ?? '').trim().toUpperCase() === 'NUEVO' &&
      r.horaIngresoGrabado &&
      String(r.horaIngresoGrabado).trim() !== ''
  ).length
}
