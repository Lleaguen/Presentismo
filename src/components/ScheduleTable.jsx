import { useMemo, useRef, useState, useEffect } from 'react'
import { SCHEDULE_HOURS, matchSlot } from '../utils/scheduleConfig'
import InsightCarousel from './InsightCarousel'
import ocasaLogo from '../assets/Ocasa.png'
import styles from './ScheduleTable.module.css'

export default function ScheduleTable({ excelRows, pedidosPorSlot, onPedidosChange }) {
  const [modalOpen, setModalOpen] = useState(false)
  const modalTableRef = useRef(null)
  const modalContainerRef = useRef(null)
  const [tableScale, setTableScale] = useState(1)
  const inputRefs = useRef({})

  // Calcula el scale necesario para que la tabla entre sin scroll
  useEffect(() => {
    if (!modalOpen) return
    const calc = () => {
      const container = modalContainerRef.current
      const table = modalTableRef.current
      if (!container || !table) return
      const availH = container.clientHeight
      const availW = container.clientWidth
      const tableH = table.scrollHeight
      const tableW = table.scrollWidth
      const scaleH = availH / tableH
      const scaleW = availW / tableW
      const scale = Math.min(scaleH, scaleW, 1) // nunca ampliar, solo achicar
      setTableScale(scale)
    }
    // Espera a que el DOM esté pintado
    const id = setTimeout(calc, 50)
    window.addEventListener('resize', calc)
    return () => { clearTimeout(id); window.removeEventListener('resize', calc) }
  }, [modalOpen])

  function handlePedidos(slotValue, value) {
    onPedidosChange((prev) => ({ ...prev, [slotValue]: value }))
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

  const convocadosPorSlot = useMemo(() => {
    const counts = {}
    SCHEDULE_HOURS.forEach((s) => { counts[s.value] = 0 })
    const unmatched = []
    excelRows.forEach((row) => {
      const hora = String(row.horaIngresoCitado ?? '').trim()
      if (!hora) return
      const slot = matchSlot(hora)
      if (slot !== null && counts[slot] !== undefined) counts[slot]++
      else unmatched.push(hora)
    })
    console.log('[DEBUG] convocados por slot:', counts)
    console.log('[DEBUG] horas sin match:', [...new Set(unmatched)])
    return counts
  }, [excelRows])

  const presentesPorSlot = useMemo(() => {
    const counts = {}
    SCHEDULE_HOURS.forEach((s) => { counts[s.value] = 0 })
    excelRows.forEach((row) => {
      if (
        !row.credencial || String(row.credencial).trim() === '' ||
        !row.horaIngresoGrabado || String(row.horaIngresoGrabado).trim() === ''
      ) return
      const hora = String(row.horaIngresoCitado ?? '').trim()
      if (!hora) return
      const slot = matchSlot(hora)
      if (slot !== null && counts[slot] !== undefined) counts[slot]++
    })
    return counts
  }, [excelRows])

  const tableRows = useMemo(() => {
    return SCHEDULE_HOURS.map((slot) => {
      const conv = convocadosPorSlot[slot.value] ?? 0
      const ped  = parseInt(pedidosPorSlot[slot.value] || '0', 10) || 0
      const pres = presentesPorSlot[slot.value] ?? 0
      const diff = pres - ped
      const asistPct = ped > 0 ? ((pres / ped) * 100).toFixed(1) : '—'
      return { ...slot, conv, ped, pres, diff, asistPct }
    })
  }, [convocadosPorSlot, pedidosPorSlot, presentesPorSlot])

  const totals = useMemo(() => {
    const calcBlock = (block) => {
      const r = tableRows.filter((x) => x.block === block)
      const totalPed  = r.reduce((s, x) => s + x.ped, 0)
      const totalPres = r.reduce((s, x) => s + x.pres, 0)
      const pct = totalPed > 0 ? ((totalPres / totalPed) * 100).toFixed(1) : '—'
      return { totalPed, totalPres, pct }
    }
    const dia   = calcBlock('dia')
    const noche = calcBlock('noche')
    const totalConv  = tableRows.reduce((s, r) => s + r.conv, 0)
    const totalPed   = tableRows.reduce((s, r) => s + r.ped, 0)
    const totalPres  = tableRows.reduce((s, r) => s + r.pres, 0)
    const totalDiff  = totalPres - totalPed
    const totalAsist = totalPed > 0 ? ((totalPres / totalPed) * 100).toFixed(1) : '—'
    return { dia, noche, totalConv, totalPed, totalPres, totalDiff, totalAsist }
  }, [tableRows])

  const diaCount   = tableRows.filter((r) => r.block === 'dia').length
  const nocheCount = tableRows.filter((r) => r.block === 'noche').length
  const firstDiaIdx   = tableRows.findIndex((r) => r.block === 'dia')
  const firstNocheIdx = tableRows.findIndex((r) => r.block === 'noche')

  function diffClass(val) {
    if (val > 0) return styles.diffPos
    if (val < 0) return styles.diffNeg
    return styles.diffZero
  }

  function pctClass(val) {
    if (val === '—') return ''
    const n = parseFloat(val)
    if (n >= 95) return styles.pctHigh
    if (n >= 80) return styles.pctMid
    return styles.pctLow
  }

  // Horarios a ocultar en el modal (ninguno)
  const MODAL_HIDDEN_SLOTS = new Set([])

  // Tabla reutilizable (normal y modal)
  function TableContent({ compact = false }) {
    const visibleRows = compact
      ? tableRows.filter((r) => !MODAL_HIDDEN_SLOTS.has(r.value))
      : tableRows

    const visibleDiaCount   = visibleRows.filter((r) => r.block === 'dia').length
    const visibleNocheCount = visibleRows.filter((r) => r.block === 'noche').length
    const firstVisibleDiaIdx   = visibleRows.findIndex((r) => r.block === 'dia')
    const firstVisibleNocheIdx = visibleRows.findIndex((r) => r.block === 'noche')
    return (
      <table className={`${styles.table} ${compact ? styles.tableCompact : ''}`}>
        <thead>
          <tr>
            <td colSpan={8} className={styles.logoRow}>
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
                    type="number"
                    min={0}
                    value={pedidosPorSlot[row.value] ?? ''}
                    onChange={(e) => handlePedidos(row.value, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, row.value)}
                    ref={(el) => { inputRefs.current[row.value] = el }}
                    className={styles.numInput}
                    aria-label={`Pedidos ${row.label}`}
                  />
                </td>
                <td className={`${styles.td} ${styles.presentes}`}>{row.pres}</td>
                <td className={`${styles.td} ${diffClass(row.diff)}`}>
                  {row.ped > 0 || row.pres > 0
                    ? (row.diff > 0 ? `+${row.diff}` : row.diff)
                    : '—'}
                </td>
                <td className={`${styles.td} ${pctClass(row.asistPct)}`}>
                  {row.asistPct !== '—' ? `${row.asistPct}%` : '—'}
                </td>
                {isFirstDia && (
                  <>
                    <td rowSpan={visibleDiaCount} className={`${styles.td} ${styles.blockCell}`}>
                      <div className={styles.blockTag}>Diurno</div>
                      <span className={styles.blockValue}>{totals.dia.totalPed}</span>
                      <span className={styles.blockSub}>pedidos</span>
                    </td>
                    <td rowSpan={visibleDiaCount} className={`${styles.td} ${styles.blockCell} ${pctClass(totals.dia.pct)}`}>
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
                    <td rowSpan={visibleNocheCount} className={`${styles.td} ${styles.blockCellNoche} ${pctClass(totals.noche.pct)}`}>
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
            <td className={`${styles.td} ${styles.totalCell} ${diffClass(totals.totalDiff)}`}>
              {totals.totalPed > 0 || totals.totalPres > 0
                ? (totals.totalDiff > 0 ? `+${totals.totalDiff}` : totals.totalDiff)
                : '—'}
            </td>
            <td className={`${styles.td} ${styles.totalCell} ${pctClass(totals.totalAsist)}`}>
              {totals.totalAsist !== '—' ? `${totals.totalAsist}%` : '—'}
            </td>
            <td className={`${styles.td} ${styles.totalCell}`}>{totals.dia.totalPed + totals.noche.totalPed}</td>
            <td className={`${styles.td} ${styles.totalCell}`}>—</td>
          </tr>
        </tfoot>
      </table>
    )
  }

  return (
    <div className={styles.wrapper}>

      {/* ── Botón pantalla completa ── */}
      <div className={styles.toolbarRow}>
        <button
          className={styles.fullscreenBtn}
          onClick={() => setModalOpen(true)}
          title="Ver tabla completa"
        >
          ⛶ Pantalla completa
        </button>
      </div>

      {/* ── Tabla principal ── */}
      <div className={styles.tableContainer}>
        <TableContent />
      </div>

      {/* ── Indicadores de gestión (debajo) ── */}
      <InsightCarousel tableRows={tableRows} excelRows={excelRows} />

      {/* ── Leyenda ── */}
      <div className={styles.legend}>
        <span className={`${styles.legendItem} ${styles.pctHigh}`}>≥ 95% — Excelente</span>
        <span className={`${styles.legendItem} ${styles.pctMid}`}>80–94% — Regular</span>
        <span className={`${styles.legendItem} ${styles.pctLow}`}>&lt; 80% — Bajo</span>
        <span className={`${styles.legendItem} ${styles.legendItemCsv}`}>CSV — calculado automáticamente</span>
      </div>

      {/* ── Modal pantalla completa ── */}
      {modalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Tabla de presentismo en pantalla completa"
        >
          <div className={styles.modalContent}>
            {/* Header del modal */}
            <div className={styles.modalHeader}>
              <img src={ocasaLogo} alt="Ocasa" className={styles.modalHeaderLogo} />
              <div className={styles.modalHeaderDivider} />
              <div className={styles.modalHeaderText}>
                <div className={styles.modalHeaderTitle}>Control de Presentismo</div>
                <div className={styles.modalHeaderSub}>
                  {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Tabla */}
            <div className={styles.modalTableContainer} ref={modalContainerRef}>
              <div
                ref={modalTableRef}
                style={{
                  transformOrigin: 'top left',
                  transform: `scale(${tableScale})`,
                  width: tableScale < 1 ? `${100 / tableScale}%` : '100%',
                }}
              >
                <TableContent compact />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
