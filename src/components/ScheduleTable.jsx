import { useMemo, useState, useRef } from 'react'
import { SCHEDULE_HOURS, matchSlot } from '../utils/scheduleConfig'
import InsightCarousel from './InsightCarousel'
import ocasaLogo from '../assets/Ocasa.png'
import styles from './ScheduleTable.module.css'

export default function ScheduleTable({ excelRows }) {
  const [pedidosPorSlot, setPedidosPorSlot] = useState(() => {
    const init = {}
    SCHEDULE_HOURS.forEach((s) => { init[s.value] = '' })
    return init
  })

  const inputRefs = useRef({})

  function handlePedidos(slotValue, value) {
    setPedidosPorSlot((prev) => ({ ...prev, [slotValue]: value }))
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
    excelRows.forEach((row) => {
      const hora = String(row.horaIngresoCitado ?? '').trim()
      if (!hora) return
      const slot = matchSlot(hora)
      if (slot !== null && counts[slot] !== undefined) counts[slot]++
    })
    return counts
  }, [excelRows])

  // Presentes: tienen credencial, asignados al slot de su hora citada
  const presentesPorSlot = useMemo(() => {
    const counts = {}
    SCHEDULE_HOURS.forEach((s) => { counts[s.value] = 0 })
    excelRows.forEach((row) => {
      // Presente = tiene credencial
      if (!row.credencial || String(row.credencial).trim() === '') return
      // Se asigna al slot de su hora citada
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

  return (
    <div className={styles.wrapper}>

      {/* ── Tabla principal ── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            {/* Fila con logo — aparece en el screenshot */}
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
              {/* Una sola columna agrupadora para diurno Y nocturno */}
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
            {tableRows.map((row, idx) => {
              const isFirstDia   = idx === firstDiaIdx
              const isFirstNoche = idx === firstNocheIdx

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

                  {/* Diurno — rowspan sobre filas dia */}
                  {isFirstDia && (
                    <>
                      <td rowSpan={diaCount} className={`${styles.td} ${styles.blockCell}`}>
                        <div className={styles.blockTag}>Diurno</div>
                        <span className={styles.blockValue}>{totals.dia.totalPed}</span>
                        <span className={styles.blockSub}>pedidos</span>
                      </td>
                      <td rowSpan={diaCount} className={`${styles.td} ${styles.blockCell} ${pctClass(totals.dia.pct)}`}>
                        <div className={styles.blockTag}>Diurno</div>
                        <span className={styles.blockValue}>
                          {totals.dia.pct !== '—' ? `${totals.dia.pct}%` : '—'}
                        </span>
                        <span className={styles.blockSub}>asistencia</span>
                      </td>
                    </>
                  )}

                  {/* Nocturno — rowspan sobre filas noche, en la MISMA columna */}
                  {isFirstNoche && (
                    <>
                      <td rowSpan={nocheCount} className={`${styles.td} ${styles.blockCellNoche}`}>
                        <div className={styles.blockTag}>Nocturno</div>
                        <span className={styles.blockValue}>{totals.noche.totalPed}</span>
                        <span className={styles.blockSub}>pedidos</span>
                      </td>
                      <td rowSpan={nocheCount} className={`${styles.td} ${styles.blockCellNoche} ${pctClass(totals.noche.pct)}`}>
                        <div className={styles.blockTag}>Nocturno</div>
                        <span className={styles.blockValue}>
                          {totals.noche.pct !== '—' ? `${totals.noche.pct}%` : '—'}
                        </span>
                        <span className={styles.blockSub}>asistencia</span>
                      </td>
                    </>
                  )}

                  {/* Filas fuera de bloque */}
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
    </div>
  )
}
