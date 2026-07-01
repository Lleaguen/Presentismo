/**
 * Tabla pura de franjas horarias.
 * Recibe todos los datos calculados como props — sin estado propio.
 * Extraída de ScheduleTable.jsx para permitir reutilización dentro del modal.
 */
import { toMins } from '../../utils/dateUtils'
import { diffClass, pctClass, diffTotalClass, presentesClass } from './tableHelpers'
import ocasaLogo from '../../assets/Ocasa.png'
import styles from '../ScheduleTable.module.css'

export default function ScheduleTableContent({
  tableRows,
  totals,
  pedidosPorSlot,
  handlePedidos,
  handleKeyDown,
  inputRefs,
  compact,
}) {
  const visibleRows = compact
    ? tableRows.filter((r) => r.block !== null)
    : tableRows

  const visibleDiaCount    = visibleRows.filter((r) => r.block === 'dia').length
  const visibleNocheCount  = visibleRows.filter((r) => r.block === 'noche').length
  const firstVisibleDiaIdx   = visibleRows.findIndex((r) => r.block === 'dia')
  const firstVisibleNocheIdx = visibleRows.findIndex((r) => r.block === 'noche')

  // Hora actual en minutos — solo mostrar diferencia en slots ya pasados
  const ahora = new Date()
  const ahoraMins = ahora.getHours() * 60 + ahora.getMinutes()

  function mostrarDiff(row) {
    const m = toMins(row.value)
    return m !== null && m <= ahoraMins
  }

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
            Convocados<br /><span className={styles.autoTag}>CSV</span>
          </th>
          <th rowSpan={2} className={styles.th}>Pedidos</th>
          <th rowSpan={2} className={`${styles.th} ${styles.thAuto}`}>
            Presentes<br /><span className={styles.autoTag}>CSV</span>
          </th>
          <th rowSpan={2} className={`${styles.th} ${styles.thNuevos}`}>
            Nuevos<br /><span className={styles.autoTag}>CSV</span>
          </th>
          <th rowSpan={2} className={styles.th}>Diferencia</th>
          <th rowSpan={2} className={styles.th}>Asistencia<br />x hora</th>
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

          const showDiff = mostrarDiff(row)

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
              <td className={`${styles.td} ${showDiff ? diffClass(row.diff, styles) : ''}`}>
                {showDiff ? (row.diff > 0 ? `+${row.diff}` : row.diff) : '—'}
              </td>
              <td className={`${styles.td} ${showDiff ? pctClass(row.asistPct, styles) : ''}`}>
                {showDiff && row.asistPct !== '—' ? `${row.asistPct}%` : '—'}
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
          <td className={`${styles.td} ${styles.totalCell} ${presentesClass(totals.totalPres, totals.totalConv, styles)}`}>
            {totals.totalPres}
          </td>
          <td className={`${styles.td} ${styles.totalCell} ${totals.totalNuevos > 0 ? styles.nuevosAlert : styles.nuevosCell}`}>
            {totals.totalNuevos}
          </td>
          <td className={`${styles.td} ${styles.totalCell} ${diffTotalClass(totals.totalDiff, styles)}`}>
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
