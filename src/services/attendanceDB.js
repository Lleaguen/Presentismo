/**
 * Servicio de persistencia en Supabase para snapshots de presentismo.
 *
 * Tabla: attendance_snapshots
 * Clave única: (fecha, slot)
 *
 * Operaciones:
 *  - upsertExcelData   → al cargar archivo: actualiza convocados/presentes/nuevos
 *                        sin tocar pedidos ya guardados
 *  - upsertPedido      → al cambiar un input: actualiza solo pedidos de ese slot
 *  - fetchDaySnapshot  → carga TODOS los campos del día (para mostrar en dispositivos
 *                        que no tienen el Excel cargado)
 */
import { supabase } from '../lib/supabaseClient'

/**
 * Devuelve la fecha de hoy en formato "YYYY-MM-DD" (timezone local).
 */
function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Al cargar el archivo Excel: hace upsert de convocados/presentes/nuevos
 * para cada slot. Respeta el valor de pedidos ya guardado.
 */
export async function upsertExcelData(tableRows) {
  if (!supabase) return
  const fecha = todayISO()

  const rows = tableRows.map((r) => ({
    fecha,
    slot:       r.value,
    convocados: r.conv,
    presentes:  r.pres,
    nuevos:     r.nuevo,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('attendance_snapshots')
    .upsert(rows, { onConflict: 'fecha,slot', ignoreDuplicates: false })

  if (error) throw new Error(`Error guardando datos del CSV: ${error.message}`)
}

/**
 * Al cambiar el valor de pedidos en un slot: upsert solo del campo pedidos.
 */
export async function upsertPedido(slot, pedidos) {
  if (!supabase) return
  const fecha = todayISO()

  const { error } = await supabase
    .from('attendance_snapshots')
    .upsert(
      { fecha, slot, pedidos, updated_at: new Date().toISOString() },
      { onConflict: 'fecha,slot', ignoreDuplicates: false }
    )

  if (error) throw new Error(`Error guardando pedidos: ${error.message}`)
}

/**
 * Carga el snapshot completo del día — todos los campos.
 * Usado para restaurar la tabla en dispositivos sin Excel.
 *
 * @param {string} [fecha] - "YYYY-MM-DD", default hoy
 * @returns {Promise<Array<{slot, convocados, presentes, nuevos, pedidos}>>}
 */
export async function fetchDaySnapshot(fecha = todayISO()) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('attendance_snapshots')
    .select('slot, convocados, presentes, nuevos, pedidos')
    .eq('fecha', fecha)

  if (error) throw new Error(`Error cargando snapshot: ${error.message}`)
  return data ?? []
}
