import { useMemo, useRef, useState } from 'react'
import { SCHEDULE_HOURS, matchSlot } from '../utils/scheduleConfig'
import InsightCarousel from './InsightCarousel'
import IngresoCurveChart from './IngresoCurveChart'
import ocasaLogo from '../assets/Ocasa.png'
import styles from './ScheduleTable.module.css'

// ── Helpers de fecha ────────────────────────────────────────────────────────
function parseFecha(str) {
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

function esHoy(fechaStr, hoy) {
  const f = parseFecha(fechaStr)
  if (!f) return false
  return f.getUTCFullYear() === hoy.getUTCFullYear() &&
         f.getUTCMonth()    === hoy.getUTCMonth() &&
         f.getUTCDate()     === hoy.getUTCDate()
}

function diffClass(val, s) {
  if (val > 0) return s.diffPos
  if (val < 0) return s.diffNeg
  return s.diffZero
}

function pctClass(val, s) {
  if (val === '—') return ''
  const n = parseFloat(val)
  if (n >= 95) return s.pctHigh
  if (n >= 80) return s.pctMid
  return s.pctLow
}

// ── Tabla (componente puro, fuera del padre para evitar remount) ─────────────
function ScheduleTableContent({
  tableRows, totals, pedidosPorSlot,
  handlePedidos, handleKeyDown,
  inputRefs, compact
}) {
  const MODAL_HIDDEN_SLOTS = new Set([])
  const visibleRows = compact
    ? tableRows.filter((r) => !MODAL_HIDDEN_SLOTS.has(r.value))
    : tableRows

  const visibleDiaCount    = visibleRows.filter((r) => r.block === 'dia').length
  const visibleNocheCount  = visibleRows.filter((r) => r.block === 'noche').length
  const firstVisibleDiaIdx   = visibleRows.findIndex((r) => r.block === 'dia')
  const firstVisibleNocheIdx = visibleRows.findIndex((r) => r.block === 'noche')

  return (
    <table className={`${styles.table} ${compact ? styles.tableCompact : ''}`}>
      <thead>
        <tr>
          <td colSpan={9} className={styles.logoRow}>
            <div className={styles.logoRowInner}>
              <img src={ocasaLogo} alt="Ocasa" className={styles.tableLogo} />
              <span className={styles.tableTitle}>Control de Presentismo</span>
            </div>
          </td>
        </tr>
        <tr>
          <th rowSpan={2} className={styles.th}>Horario</th>
          <th rowSpan={2} className={`${styles.th} ${styles.thAuto}`}>
            Convocados<br/><span className={styles.autoTag}>CSV</span>
          </th>
          <th rowSpan={2} className={styles.th}>Pedidos</th>
          <th rowSpan={2} className={`${styles.th} ${styles.thAuto}`}>
            Presentes<br/><span className={styles.autoTag}>CSV</span>
          </th>
          <th rowSpan={2} className={`${styles.th} ${styles.thNuevos}`}>
            Nuevos<br/><span className={styles.autoTag}>CSV</span>
          </th>
          <th rowSpan={2} className={styles.th}>Diferencia</th>
          <th rowSpan={2} className={styles.th}>Asistencia<br/>x hora</th>
          <th colSpan={2} className={`${styles.th} ${styles.thGroup}`}>
            Resumen por turno
          </th>
        </tr>
        <tr>
          <th className={`${styles.th} ${styles.thSub}`}>Total Pedidos</th>
          <th className={`${styles.th} ${styles.thSub}`}>Asistencia %</th>
        </tr>
      </thead>
      <tbody>
        {visibleRows.map((row, idx) => {
          const isFirstDia   = idx === firstVisibleDiaIdx
          const isFirstNoche = idx === firstVisibleNocheIdx
          const rowClass =
            row.block === 'dia'   ? styles.rowDia :
            row.block === 'noche' ? styles.rowNoche :
            idx % 2 === 0 ? styles.rowEven : styles.rowOdd

          return (
            <tr key={row.value} className={rowClass}>
              <td className={`${styles.td} ${styles.slotLabel} ${row.block === 'dia' ? styles.slotDia : row.block === 'noche' ? styles.slotNoche : ''}`}>
                {row.label}
              </td>
              <td className={`${styles.td} ${styles.autoCell}`}>{row.conv}</td>
              <td className={styles.td}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pedidosPorSlot[row.value] ?? ''}
                  onChange={(e) => handlePedidos(row.value, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, row.value)}
                  ref={(el) => { inputRefs.current[row.value] = el }}
                  className={styles.numInput}
                  aria-label={`Pedidos ${row.label}`}
                />
              </td>
              <td className={`${styles.td} ${styles.presentes}`}>{row.pres}</td>
              <td className={`${styles.td} ${styles.nuevosCell}`}>{row.nuevo > 0 ? row.nuevo : '—'}</td>
              <td className={`${styles.td} ${diffClass(row.diff, styles)}`}>
                {row.ped > 0 || row.pres > 0
                  ? (row.diff > 0 ? `+${row.diff}` : row.diff)
                  : '—'}
              </td>
              <td className={`${styles.td} ${pctClass(row.asistPct, styles)}`}>
                {row.asistPct !== '—' ? `${row.asistPct}%` : '—'}
              </td>
              {isFirstDia && (
                <>
                  <td rowSpan={visibleDiaCount} className={`${styles.td} ${styles.blockCell}`}>
                    <div className={styles.blockTag}>Diurno</div>
                    <span className={styles.blockValue}>{totals.dia.totalPed}</span>
                    <span className={styles.blockSub}>pedidos</span>
                  </td>
                  <td rowSpan={visibleDiaCount} className={`${styles.td} ${styles.blockCell} ${pctClass(totals.dia.pct, styles)}`}>
                    <div className={styles.blockTag}>Diurno</div>
                    <span className={styles.blockValue}>{totals.dia.pct !== '—' ? `${totals.dia.pct}%` : '—'}</span>
                    <span className={styles.blockSub}>asistencia</span>
                  </td>
                </>
              )}
              {isFirstNoche && (
                <>
                  <td rowSpan={visibleNocheCount} className={`${styles.td} ${styles.blockCellNoche}`}>
                    <div className={styles.blockTag}>Nocturno</div>
                    <span className={styles.blockValue}>{totals.noche.totalPed}</span>
                    <span className={styles.blockSub}>pedidos</span>
                  </td>
                  <td rowSpan={visibleNocheCount} className={`${styles.td} ${styles.blockCellNoche} ${pctClass(totals.noche.pct, styles)}`}>
                    <div className={styles.blockTag}>Nocturno</div>
                    <span className={styles.blockValue}>{totals.noche.pct !== '—' ? `${totals.noche.pct}%` : '—'}</span>
                    <span className={styles.blockSub}>asistencia</span>
                  </td>
                </>
              )}
              {row.block === null && (
                <>
                  <td className={`${styles.td} ${styles.noBlock}`}>—</td>
                  <td className={`${styles.td} ${styles.noBlock}`}>—</td>
                </>
              )}
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className={styles.totalRow}>
          <td className={`${styles.td} ${styles.totalLabel}`}>TOTAL</td>
          <td className={`${styles.td} ${styles.totalCell}`}>{totals.totalConv}</td>
          <td className={`${styles.td} ${styles.totalCell}`}>{totals.totalPed}</td>
          <td className={`${styles.td} ${styles.totalCell} ${styles.presentes}`}>{totals.totalPres}</td>
          <td className={`${styles.td} ${styles.totalCell} ${styles.nuevosCell}`}>{totals.totalNuevos}</td>
          <td className={`${styles.td} ${styles.totalCell} ${diffClass(totals.totalDiff, styles)}`}>
            {totals.totalPed > 0 || totals.totalPres > 0
              ? (totals.totalDiff > 0 ? `+${totals.totalDiff}` : totals.totalDiff)
              : '—'}
          </td>
          <td className={`${styles.td} ${styles.totalCell} ${pctClass(totals.totalAsist, styles)}`}>
            {totals.totalAsist !== '—' ? `${totals.totalAsist}%` : '—'}
          </td>
          <td className={`${styles.td} ${styles.totalCell}`}>{totals.dia.totalPed + totals.noche.totalPed}</td>
          <td className={`${styles.td} ${styles.totalCell}`}>—</td>
        </tr>
      </tfoot>
    </table>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ScheduleTable({ excelRows, pedidosPorSlot, onPedidosChange, rows }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [slide, setSlide] = useState(0) // 0 = tabla, 1 = gráfico
  const inputRefs = useRef({})
  const modalInputRefs = useRef({})

  function handlePedidos(slotValue, value) {
    if (value !== '' && !/^\d+$/.test(value)) return
    onPedidosChange((prev) => ({ ...prev, [slotValue]: value }))
  }

  function handleKeyDown(e, slotValue, refs) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const idx = SCHEDULE_HOURS.findIndex((s) => s.value === slotValue)
    const next = SCHEDULE_HOURS[idx + 1]
    if (next && refs?.current[next.value]) {
      refs.current[next.value].focus()
      refs.current[next.value].select()
    }
  }

  const handlePedidosNormal = (slotValue, value) => handlePedidos(slotValue, value)
  const handlePedidosModal  = (slotValue, value) => handlePedidos(slotValue, value)
  const handleKeyDownNormal = (e, slot) => handleKeyDown(e, slot, inputRefs)
  const handleKeyDownModal  = (e, slot) => handleKeyDown(e, slot, modalInputRefs)

  const convocadosPorSlot = useMemo(() => {
    const counts = {}
    SCHEDULE_HOURS.forEach((s) => { counts[s.value] = 0 })
    excelRows.forEach((row) => {
      const hora = String(row.horaIngresoCitado ?? '').trim()
      if (!hora) return
      const slot = matchSlot(hora)
      if (slot !== null && counts[slot] !== undefined) counts[slot]++
    })
    return counts
  }, [excelRows])

  const presentesPorSlot = useMemo(() => {
    const counts = {}
    SCHEDULE_HOURS.forEach((s) => { counts[s.value] = 0 })
    const NEXT_DAY_SLOTS = new Set(['0:00', '6:00', '7:00'])
    const hoy = new Date()
    const hoyUTC = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
    excelRows.forEach((row) => {
      if (!row.horaIngresoGrabado || String(row.horaIngresoGrabado).trim() === '') return
      if (String(row.gerencia ?? '').trim().toUpperCase() !== 'OPSEMLI') return
      if (!esHoy(row.fechaIngresoCitado, hoyUTC)) return
      const hora = String(row.horaIngresoCitado ?? '').trim()
      if (!hora) return
      const slot = matchSlot(hora)
      if (slot === null || counts[slot] === undefined) return
      if (NEXT_DAY_SLOTS.has(slot)) return
      counts[slot]++
    })
    return counts
  }, [excelRows])

  const nuevosPorSlot = useMemo(() => {
    const counts = {}
    SCHEDULE_HOURS.forEach((s) => { counts[s.value] = 0 })
    excelRows.forEach((row) => {
      if (String(row.sector ?? '').trim().toUpperCase() !== 'NUEVO') return
      if (!row.horaIngresoGrabado || String(row.horaIngresoGrabado).trim() === '') return
      const hora = String(row.horaIngresoCitado ?? '').trim()
      if (!hora) return
      const slot = matchSlot(hora)
      if (slot !== null && counts[slot] !== undefined) counts[slot]++
    })
    return counts
  }, [excelRows])

  const tableRows = useMemo(() => {
    return SCHEDULE_HOURS.map((slot) => {
      const conv  = convocadosPorSlot[slot.value] ?? 0
      const ped   = parseInt(pedidosPorSlot[slot.value] || '0', 10) || 0
      const pres  = presentesPorSlot[slot.value] ?? 0
      const nuevo = nuevosPorSlot[slot.value] ?? 0
      const diff  = pres - ped
      const asistPct = ped > 0 ? ((pres / ped) * 100).toFixed(1) : '—'
      return { ...slot, conv, ped, pres, nuevo, diff, asistPct }
    })
  }, [convocadosPorSlot, pedidosPorSlot, presentesPorSlot, nuevosPorSlot])

  const totals = useMemo(() => {
    const calcBlock = (block) => {
      const r = tableRows.filter((x) => x.block === block)
      const totalPed  = r.reduce((s, x) => s + x.ped, 0)
      const totalPres = r.reduce((s, x) => s + x.pres, 0)
      const pct = totalPed > 0 ? ((totalPres / totalPed) * 100).toFixed(1) : '—'
      return { totalPed, totalPres, pct }
    }
    const dia         = calcBlock('dia')
    const noche       = calcBlock('noche')
    const totalConv   = tableRows.reduce((s, r) => s + r.conv, 0)
    const totalPed    = tableRows.reduce((s, r) => s + r.ped, 0)
    const totalPres   = tableRows.reduce((s, r) => s + r.pres, 0)
    const totalNuevos = tableRows.reduce((s, r) => s + r.nuevo, 0)
    const totalDiff   = totalPres - totalPed
    const totalAsist  = totalPed > 0 ? ((totalPres / totalPed) * 100).toFixed(1) : '—'
    return { dia, noche, totalConv, totalPed, totalPres, totalNuevos, totalDiff, totalAsist }
  }, [tableRows])

  const sharedProps = { tableRows, totals, pedidosPorSlot }

  return (
    <div className={styles.wrapper}>

      <div className={styles.toolbarRow}>
        <button className={styles.fullscreenBtn} onClick={() => setModalOpen(true)} title="Ver tabla completa">
          ⛶ Pantalla completa
        </button>
      </div>

      <div className={styles.tableContainer}>
        <ScheduleTableContent
          {...sharedProps}
          handlePedidos={handlePedidosNormal}
          handleKeyDown={handleKeyDownNormal}
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
        <div
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
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
                  {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

              <button className={styles.modalCloseBtn} onClick={() => setModalOpen(false)} aria-label="Cerrar">✕</button>
            </div>

            {/* Slides */}
            <div className={styles.carouselTrack}>
              {/* Slide 0 — Tabla */}
              <div className={`${styles.carouselSlide} ${slide === 0 ? styles.carouselSlideActive : styles.carouselSlideHidden}`}>
                <div className={styles.modalTableContainer}>
                  <ScheduleTableContent
                    {...sharedProps}
                    handlePedidos={handlePedidosModal}
                    handleKeyDown={handleKeyDownModal}
                    inputRefs={modalInputRefs}
                    compact
                  />
                </div>
              </div>

              {/* Slide 1 — Gráfico */}
              <div className={`${styles.carouselSlide} ${slide === 1 ? styles.carouselSlideActive : styles.carouselSlideHidden}`}>
                <div className={styles.modalChartContainer}>
                  <IngresoCurveChart rows={rows ?? excelRows} pedidosPorSlot={pedidosPorSlot} fullHeight />
                </div>
              </div>
            </div>

            {/* Indicadores de puntos */}
            <div className={styles.carouselDots}>
              <button className={`${styles.carouselDot} ${slide === 0 ? styles.carouselDotActive : ''}`} onClick={() => setSlide(0)} aria-label="Slide 1" />
              <button className={`${styles.carouselDot} ${slide === 1 ? styles.carouselDotActive : ''}`} onClick={() => setSlide(1)} aria-label="Slide 2" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
