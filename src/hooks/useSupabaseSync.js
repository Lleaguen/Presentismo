/**
 * Hook que sincroniza los datos de la tabla con Supabase.
 *
 * - Al montar: carga el snapshot completo del día y lo restaura
 *   (pedidos en los inputs + convocados/presentes/nuevos como snapshot de solo lectura)
 * - Al cambiar tableRows con Excel cargado: upsert de convocados/presentes/nuevos
 * - Al cambiar un pedido: upsert solo de ese slot
 */
import { useEffect, useRef, useCallback } from 'react'
import { upsertExcelData, upsertPedido, fetchDaySnapshot } from '../services/attendanceDB'

/**
 * @param {object[]} tableRows      - Filas calculadas por useScheduleData
 * @param {boolean}  hasData        - true cuando hay filas del Excel cargadas
 * @param {Function} onPedidosLoad  - (map: Record<slot, string>) => void — restaura pedidos
 * @param {Function} onSnapshotLoad - (rows: Array) => void — restaura snapshot completo
 */
export function useSupabaseSync(tableRows, hasData, onPedidosLoad, onSnapshotLoad) {
  const isFirstRender = useRef(true)
  const lastSyncedRef = useRef(null)

  // Al montar: cargar snapshot completo del día
  useEffect(() => {
    fetchDaySnapshot()
      .then((rows) => {
        if (!rows.length) return

        // Restaurar pedidos en los inputs
        const pedidosMap = {}
        rows.forEach((r) => {
          pedidosMap[r.slot] = r.pedidos > 0 ? String(r.pedidos) : ''
        })
        if (onPedidosLoad) onPedidosLoad(pedidosMap)

        // Restaurar snapshot completo para mostrar sin Excel
        if (onSnapshotLoad) onSnapshotLoad(rows)
      })
      .catch((err) => console.warn('[Supabase] No se pudo cargar snapshot:', err.message))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cuando se carga el Excel: sincronizar convocados/presentes/nuevos
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!hasData) return

    const signature = tableRows
      .map((r) => `${r.value}:${r.conv}:${r.pres}:${r.nuevo}`)
      .join('|')
    if (signature === lastSyncedRef.current) return
    lastSyncedRef.current = signature

    upsertExcelData(tableRows)
      .catch((err) => console.error('[Supabase] Error upsert Excel:', err.message))
  }, [tableRows, hasData])

  // Sincroniza un pedido individual al cambiar su input
  const syncPedido = useCallback((slot, value) => {
    const num = parseInt(value || '0', 10) || 0
    upsertPedido(slot, num)
      .catch((err) => console.error('[Supabase] Error upsert pedido:', err.message))
  }, [])

  return { syncPedido }
}
