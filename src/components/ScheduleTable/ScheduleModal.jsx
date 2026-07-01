/**
 * Modal de pantalla completa para la tabla de presentismo.
 * Contiene el carrusel tabla/gráfico y el header con controles.
 * Extraído de ScheduleTable.jsx para reducir su tamaño.
 */
import { useRef, useState } from 'react'
import ScheduleTableContent from './ScheduleTableContent'
import IngresoCurveChart from '../IngresoCurveChart'
import ocasaLogo from '../../assets/Ocasa.png'
import styles from '../ScheduleTable.module.css'
import { SCHEDULE_HOURS } from '../../utils/scheduleConfig'

export default function ScheduleModal({
  tableRows,
  totals,
  pedidosPorSlot,
  onPedidosChange,
  excelRows,
  onClose,
}) {
  const [slide, setSlide] = useState(0)
  const modalInputRefs = useRef({})

  function handlePedidos(slotValue, value) {
    if (value !== '' && !/^\d+$/.test(value)) return
    onPedidosChange((prev) => ({ ...prev, [slotValue]: value }))
  }

  function handleKeyDown(e, slotValue) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const idx = SCHEDULE_HOURS.findIndex((s) => s.value === slotValue)
    const next = SCHEDULE_HOURS[idx + 1]
    if (next && modalInputRefs.current[next.value]) {
      modalInputRefs.current[next.value].focus()
      modalInputRefs.current[next.value].select()
    }
  }

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Tabla de presentismo en pantalla completa"
    >
      <div className={styles.modalContent}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <img src={ocasaLogo} alt="Ocasa" className={styles.modalHeaderLogo} />
          <div className={styles.modalHeaderDivider} />
          <div className={styles.modalHeaderText}>
            <div className={styles.modalHeaderTitle}>Control de Presentismo</div>
            <div className={styles.modalHeaderSub}>
              {new Date().toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          {/* Controles carrusel */}
          <div className={styles.carouselControls}>
            <button
              className={`${styles.carouselBtn} ${slide === 0 ? styles.carouselBtnActive : ''}`}
              onClick={() => setSlide(0)}
              aria-label="Ver tabla"
            >
              🗂 Tabla
            </button>
            <button
              className={`${styles.carouselBtn} ${slide === 1 ? styles.carouselBtnActive : ''}`}
              onClick={() => setSlide(1)}
              aria-label="Ver gráfico"
            >
              📈 Gráfico
            </button>
          </div>

          <button className={styles.modalCloseBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Slides */}
        <div className={styles.carouselTrack}>
          {/* Slide 0 — Tabla */}
          <div className={`${styles.carouselSlide} ${slide === 0 ? styles.carouselSlideActive : styles.carouselSlideHidden}`}>
            <div className={styles.modalTableContainer}>
              <ScheduleTableContent
                tableRows={tableRows}
                totals={totals}
                pedidosPorSlot={pedidosPorSlot}
                handlePedidos={handlePedidos}
                handleKeyDown={handleKeyDown}
                inputRefs={modalInputRefs}
                compact
              />
            </div>
          </div>

          {/* Slide 1 — Gráfico */}
          <div className={`${styles.carouselSlide} ${slide === 1 ? styles.carouselSlideActive : styles.carouselSlideHidden}`}>
            <div className={styles.modalChartContainer}>
              <IngresoCurveChart rows={excelRows} pedidosPorSlot={pedidosPorSlot} fullHeight />
            </div>
          </div>
        </div>

        {/* Indicadores de puntos */}
        <div className={styles.carouselDots}>
          <button
            className={`${styles.carouselDot} ${slide === 0 ? styles.carouselDotActive : ''}`}
            onClick={() => setSlide(0)}
            aria-label="Slide 1"
          />
          <button
            className={`${styles.carouselDot} ${slide === 1 ? styles.carouselDotActive : ''}`}
            onClick={() => setSlide(1)}
            aria-label="Slide 2"
          />
        </div>
      </div>
    </div>
  )
}
