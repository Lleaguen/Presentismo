import { useState, useCallback } from 'react'
import FileUploader from './components/FileUploader'
import StatsBar from './components/StatsBar'
import ScheduleTable from './components/ScheduleTable'
import AttendanceTable from './components/AttendanceTable'
import IngresoCurveChart from './components/IngresoCurveChart'
import { parseExcelFile } from './utils/parseExcel'
import { SCHEDULE_HOURS } from './utils/scheduleConfig'
import { useAttendanceStats } from './hooks/useAttendanceStats'
import ocasaLogo from './assets/Ocasa.png'
import styles from './App.module.css'

export default function App() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileKey, setFileKey] = useState(0)
  const [pedidosPorSlot, setPedidosPorSlot] = useState(() => {
    const init = {}
    SCHEDULE_HOURS.forEach((s) => { init[s.value] = '' })
    return init
  })
  const [totalDiff, setTotalDiff] = useState(null)
  // Snapshot de Supabase: se usa como fallback cuando no hay Excel cargado
  const [dbSnapshot, setDbSnapshot] = useState([])

  // Restaura los pedidos guardados en Supabase al iniciar
  const handlePedidosLoad = useCallback((map) => {
    setPedidosPorSlot((prev) => {
      const next = { ...prev }
      Object.entries(map).forEach(([slot, val]) => {
        if (next[slot] !== undefined) next[slot] = val
      })
      return next
    })
  }, [])

  // Restaura el snapshot completo (convocados/presentes/nuevos) desde Supabase
  const handleSnapshotLoad = useCallback((snapshotRows) => {
    setDbSnapshot(snapshotRows)
  }, [])

  const {
    rowsFiltrados,
    presentes,
    nuevos,
    horaDesde,
    horaHasta,
    setHoraDesde,
    setHoraHasta,
  } = useAttendanceStats(rows)

  // Cuando no hay Excel, calcular presentes/nuevos/total desde el snapshot de Supabase
  const hasExcel = rows.length > 0
  const snapshotPresentes = dbSnapshot.reduce((s, r) => s + (r.presentes ?? 0), 0)
  const snapshotNuevos    = dbSnapshot.reduce((s, r) => s + (r.nuevos ?? 0), 0)
  const snapshotConv      = dbSnapshot.reduce((s, r) => s + (r.convocados ?? 0), 0)

  const kpiPresentes = hasExcel ? presentes : snapshotPresentes
  const kpiNuevos    = hasExcel ? nuevos    : snapshotNuevos
  const kpiTotal     = hasExcel ? rows.length : snapshotConv

  async function handleFileLoaded(file) {
    setLoading(true)
    setError('')
    try {
      const data = await parseExcelFile(file)
      setRows(data)
    } catch (err) {
      setError(err.message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setRows([])
    setError('')
    setFileKey((k) => k + 1)
    // pedidosPorSlot se mantiene intacto
  }

  return (
    <div className={styles.app}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src={ocasaLogo} alt="Ocasa" className={styles.logo} />
          <div className={styles.divider} />
          <div>
            <div className={styles.appTitle}>Control de Presentismo</div>
            <div className={styles.appSubtitle}>Sistema de gestión de asistencia operativa</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.headerBadge}>
            {rows.length > 0 ? `${rows.length} registros cargados` : 'Sin datos'}
          </span>
          {rows.length > 0 && (
            <button className={styles.clearBtn} onClick={handleClear} title="Limpiar datos y cargar otro archivo">
              🗑 Limpiar
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>

        {/* 1 — Carga del archivo */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>📁</div>
            <span className={styles.sectionTitle}>Importar archivo</span>
          </div>
          <div className={styles.sectionBody}>
            <FileUploader key={fileKey} onFileLoaded={handleFileLoaded} />
            {loading && (
              <div className={styles.statusRow}>
                <div className={styles.spinner} />
                <span className={styles.loading}>Procesando archivo...</span>
              </div>
            )}
            {error && (
              <div className={styles.statusRow}>
                <p className={styles.error}>⚠ {error}</p>
              </div>
            )}
          </div>
        </div>

        {/* 2 — Resumen global */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>📊</div>
            <span className={styles.sectionTitle}>Resumen del día</span>
          </div>
          <div className={styles.sectionBody}>
            <StatsBar presentes={kpiPresentes} total={kpiTotal} nuevos={kpiNuevos} />
          </div>
        </div>

        {/* 3 — Tabla por franja horaria */}
        <div className={styles.sectionCard} id="schedule-section">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>🕐</div>
            <span className={styles.sectionTitle}>Presentismo por franja horaria</span>

            {/* Rango horario */}
            <div className={styles.rangeFilter}>
              <span className={styles.rangeLabel}>Rango</span>
              <input
                type="time"
                value={horaDesde}
                onChange={(e) => setHoraDesde(e.target.value)}
                className={styles.rangeInput}
              />
              <span className={styles.rangeSep}>—</span>
              <input
                type="time"
                value={horaHasta}
                onChange={(e) => setHoraHasta(e.target.value)}
                className={styles.rangeInput}
              />
              {(horaDesde || horaHasta) && (
                <button
                  className={styles.rangeClearBtn}
                  onClick={() => { setHoraDesde(''); setHoraHasta('') }}
                  title="Quitar"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Diferencia actual */}
            {totalDiff !== null && (
              <div className={`${styles.diffBanner} ${totalDiff >= 0 ? styles.diffBannerPos : styles.diffBannerNeg}`}>
                <span className={styles.diffBannerLabel}>Diferencia</span>
                <span className={styles.diffBannerVal}>{totalDiff > 0 ? `+${totalDiff}` : totalDiff}</span>
              </div>
            )}

            <img src={ocasaLogo} alt="Ocasa" className={styles.sectionLogo} />
          </div>

          <div className={styles.sectionBody}>
            <ScheduleTable
              excelRows={rowsFiltrados}
              rows={rowsFiltrados}
              pedidosPorSlot={pedidosPorSlot}
              onPedidosChange={setPedidosPorSlot}
              onTotalsChange={setTotalDiff}
              hasData={rows.length > 0}
              onPedidosLoad={handlePedidosLoad}
              onSnapshotLoad={handleSnapshotLoad}
              dbSnapshot={dbSnapshot}
            />
          </div>
        </div>

        {/* 4 — Gráfico de curva de ingresos */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>📈</div>
            <span className={styles.sectionTitle}>Curva de ingresos por hora</span>
          </div>
          <div className={styles.sectionBody}>
            <IngresoCurveChart rows={rows} pedidosPorSlot={pedidosPorSlot} />
          </div>
        </div>

        {/* 5 — Detalle por empleado */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>👥</div>
            <span className={styles.sectionTitle}>Detalle por empleado</span>
          </div>
          <div className={styles.sectionBody}>
            <AttendanceTable data={rows} />
          </div>
        </div>

      </main>
    </div>
  )
}
