/**
 * Servicio de persistencia en Supabase para snapshots de presentismo.
 *
 * Tabla: attendance_snapshots
 * Clave única: (fecha, slot)
 *
 * Dos operaciones distintas:
 *  - upsertExcelData   → al cargar archivo: actualiza convocados/presentes/nuevos
 *                        sin tocar pedidos ya guardados
 *  - upsertPedido      → al cambiar un input: actualiza solo pedidos de ese slot
 *  - fetchDaySnapshot  → carga los datos guardados de una fecha (para restaurar pedidos)
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
 * para cada slot del día de hoy. Si ya existe la fila (fecha+slot),
 * actualiza esos tres campos pero respeta el valor de pedidos guardado.
 *
 * @param {Array<{value: string, conv: number, pres: number, nuevo: number}>} tableRows
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
    .upsert(rows, {
      onConflict:        'fecha,slot',
      ignoreDuplicates:  false,
      // Solo actualiza estos campos, deja pedidos intacto
      // Supabase upsert actualiza todos los campos del objeto,
      // así que excluimos pedidos del payload — si no existe la fila
      // se crea con pedidos = 0 (default de la tabla)
    })

  if (error) throw new Error(`Error guardando datos del CSV: ${error.message}`)
}

/**
 * Al cambiar el valor de pedidos en un slot: upsert solo del campo pedidos.
 *
 * @param {string} slot   - Valor del slot, ej: "13:00"
 * @param {number} pedidos
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
 * Carga el snapshot de una fecha para restaurar los pedidos al iniciar.
 * Por defecto trae el día de hoy.
 *
 * @param {string} [fecha] - "YYYY-MM-DD", default hoy
 * @returns {Promise<Record<string, number>>} - { "13:00": 40, "14:00": 35, ... }
 */
export async function fetchDaySnapshot(fecha = todayISO()) {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from('attendance_snapshots')
    .select('slot, pedidos')
    .eq('fecha', fecha)

  if (error) throw new Error(`Error cargando snapshot: ${error.message}`)

  // Convierte array a mapa slot → pedidos
  const map = {}
  ;(data ?? []).forEach((row) => {
    map[row.slot] = row.pedidos
  })
  return map
}
