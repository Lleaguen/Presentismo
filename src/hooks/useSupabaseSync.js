/**
 * Hook que sincroniza los datos de la tabla con Supabase.
 *
 * - Al montar: carga los pedidos guardados del día para restaurarlos en los inputs
 * - Al cambiar tableRows (nueva carga de Excel): hace upsert de convocados/presentes/nuevos
 * - Al cambiar un pedido individual: hace upsert solo de ese slot
 */
import { useEffect, useRef, useCallback } from 'react'
import { upsertExcelData, upsertPedido, fetchDaySnapshot } from '../services/attendanceDB'

/**
 * @param {object[]} tableRows     - Filas calculadas por useScheduleData
 * @param {boolean}  hasData       - true cuando hay filas del Excel cargadas
 * @param {Function} onPedidosLoad - callback para restaurar pedidos guardados: (map) => void
 */
export function useSupabaseSync(tableRows, hasData, onPedidosLoad) {
  // Evita disparar el upsert en el render inicial (antes de cargar Excel)
  const isFirstRender = useRef(true)
  // Rastrea la última versión de tableRows sincronizada para no re-subir sin cambios
  const lastSyncedRef = useRef(null)

  // Al montar: restaurar pedidos guardados hoy
  useEffect(() => {
    fetchDaySnapshot()
      .then((map) => {
        if (Object.keys(map).length > 0) {
          onPedidosLoad(map)
        }
      })
      .catch((err) => console.warn('[Supabase] No se pudo cargar snapshot:', err.message))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cuando cambian los datos del Excel: sincronizar convocados/presentes/nuevos
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!hasData) return

    // Serializar para detectar cambios reales
    const signature = tableRows.map((r) => `${r.value}:${r.conv}:${r.pres}:${r.nuevo}`).join('|')
    if (signature === lastSyncedRef.current) return
    lastSyncedRef.current = signature

    upsertExcelData(tableRows)
      .catch((err) => console.error('[Supabase] Error upsert Excel:', err.message))
  }, [tableRows, hasData])

  // Función para sincronizar un pedido individual (llamada desde el handler de inputs)
  const syncPedido = useCallback((slot, value) => {
    const num = parseInt(value || '0', 10) || 0
    upsertPedido(slot, num)
      .catch((err) => console.error('[Supabase] Error upsert pedido:', err.message))
  }, [])

  return { syncPedido }
}
