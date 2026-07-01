/**
 * ScheduleTable — Componente principal de la tabla de franjas horarias.
 *
 * Responsabilidades:
 *  - Orquestar useScheduleData para los cálculos
 *  - Orquestar useSupabaseSync para persistencia automática
 *  - Manejar el estado de pedidosPorSlot y los refs de inputs
 *  - Renderizar la tabla normal, el InsightCarousel y el modal (ScheduleModal)
 */
import { useRef, useState, useEffect } from 'react'
import { SCHEDULE_HOURS } from '../utils/scheduleConfig'
import { useScheduleData } from '../hooks/useScheduleData'
import { useSupabaseSync } from '../hooks/useSupabaseSync'
import ScheduleTableContent from './ScheduleTable/ScheduleTableContent'
import ScheduleModal from './ScheduleTable/ScheduleModal'
import InsightCarousel from './InsightCarousel'
import styles from './ScheduleTable.module.css'

export default function ScheduleTable({
  excelRows,
  pedidosPorSlot,
  onPedidosChange,
  rows,
  onTotalsChange,
  hasData,
  onPedidosLoad,
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const inputRefs = useRef({})

  const { tableRows, totals } = useScheduleData(excelRows, pedidosPorSlot)

  // Sincronización con Supabase
  const { syncPedido } = useSupabaseSync(tableRows, hasData, onPedidosLoad)

  // Notifica al padre cuando cambia el total de diferencia
  useEffect(() => {
    if (onTotalsChange) onTotalsChange(totals.totalDiff)
  }, [totals.totalDiff, onTotalsChange])

  function handlePedidos(slotValue, value) {
    if (value !== '' && !/^\d+$/.test(value)) return
    onPedidosChange((prev) => ({ ...prev, [slotValue]: value }))
    // Persiste en Supabase (debounce natural: solo al cambiar el input)
    syncPedido(slotValue, value)
  }

  function handleKeyDown(e, slotValue) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const idx = SCHEDULE_HOURS.findIndex((s) => s.value === slotValue)
    const next = SCHEDULE_HOURS[idx + 1]
    if (next && inputRefs.current[next.value]) {
      inputRefs.current[next.value].focus()
      inputRefs.current[next.value].select()
    }
  }

  const sharedProps = { tableRows, totals, pedidosPorSlot }

  return (
    <div className={styles.wrapper}>

      <div className={styles.toolbarRow}>
        <button
          className={styles.fullscreenBtn}
          onClick={() => setModalOpen(true)}
          title="Ver tabla completa"
        >
          ⛶ Pantalla completa
        </button>
      </div>

      <div className={styles.tableContainer}>
        <ScheduleTableContent
          {...sharedProps}
          handlePedidos={handlePedidos}
          handleKeyDown={handleKeyDown}
          inputRefs={inputRefs}
          compact={false}
        />
      </div>

      <InsightCarousel tableRows={tableRows} excelRows={excelRows} />

      <div className={styles.legend}>
        <span className={`${styles.legendItem} ${styles.pctHigh}`}>≥ 95% — Excelente</span>
        <span className={`${styles.legendItem} ${styles.pctMid}`}>80–94% — Regular</span>
        <span className={`${styles.legendItem} ${styles.pctLow}`}>&lt; 80% — Bajo</span>
        <span className={`${styles.legendItem} ${styles.legendItemCsv}`}>CSV — calculado automáticamente</span>
      </div>

      {modalOpen && (
        <ScheduleModal
          {...sharedProps}
          onPedidosChange={onPedidosChange}
          excelRows={rows ?? excelRows}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
