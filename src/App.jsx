import { useState, useMemo } from 'react'
import FileUploader from './components/FileUploader'
import StatsBar from './components/StatsBar'
import ScheduleTable from './components/ScheduleTable'
import AttendanceTable from './components/AttendanceTable'
import IngresoCurveChart from './components/IngresoCurveChart'
import { parseExcelFile } from './utils/parseExcel'
import { SCHEDULE_HOURS, matchSlot } from './utils/scheduleConfig'
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

  // Filtro de rango horario para la tabla
  const [horaDesde, setHoraDesde] = useState('')
  const [horaHasta, setHoraHasta] = useState('')

  const toMins = (str) => {
    if (!str) return null
    const parts = String(str).trim().split(':').map(Number)
    if (parts.length < 2 || isNaN(parts[0])) return null
    return parts[0] * 60 + (parts[1] || 0)
  }

  const rowsFiltrados = useMemo(() => {
    if (!horaDesde && !horaHasta) return rows
    const desde = toMins(horaDesde)
    const hasta  = toMins(horaHasta)
    return rows.filter((r) => {
      const m = toMins(String(r.horaIngresoCitado ?? '').trim())
      if (m === null) return false
      if (desde !== null && m < desde) return false
      if (hasta  !== null && m > hasta)  return false
      return true
    })
  }, [rows, horaDesde, horaHasta])

  const presentes = useMemo(() => {
    const NEXT_DAY_SLOTS = new Set(['0:00', '6:00', '7:00'])
    const hoy = new Date()
    const hoyUTC = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
    const parseFecha = (str) => {
      const s = String(str ?? '').trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)) }
      const p = s.split('/'); if (p.length === 3) { const [d,m,y] = p.map(Number); return new Date(Date.UTC(y,m-1,d)) }
      return null
    }
    const esHoy = (str) => {
      const f = parseFecha(str)
      if (!f) return false
      return f.getUTCFullYear() === hoyUTC.getUTCFullYear() &&
             f.getUTCMonth()    === hoyUTC.getUTCMonth() &&
             f.getUTCDate()     === hoyUTC.getUTCDate()
    }
    return rows.filter((r) => {
      if (!r.horaIngresoGrabado || String(r.horaIngresoGrabado).trim() === '') return false
      if (String(r.gerencia ?? '').trim().toUpperCase() !== 'OPSEMLI') return false
      if (!esHoy(r.fechaIngresoCitado)) return false
      const slot = matchSlot(String(r.horaIngresoCitado ?? '').trim())
      if (slot && NEXT_DAY_SLOTS.has(slot)) return false
      return true
    }).length
  }, [rows])

  const nuevos = useMemo(() =>
    rows.filter((r) =>
      String(r.sector ?? '').trim().toUpperCase() === 'NUEVO' &&
      r.horaIngresoGrabado && String(r.horaIngresoGrabado).trim() !== ''
    ).length
  , [rows])

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
            <StatsBar presentes={presentes} total={rows.length} nuevos={nuevos} />
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
              <input type="time" value={horaDesde} onChange={(e) => setHoraDesde(e.target.value)} className={styles.rangeInput} />
              <span className={styles.rangeSep}>—</span>
              <input type="time" value={horaHasta} onChange={(e) => setHoraHasta(e.target.value)} className={styles.rangeInput} />
              {(horaDesde || horaHasta) && (
                <button className={styles.rangeClearBtn} onClick={() => { setHoraDesde(''); setHoraHasta('') }} title="Quitar">✕</button>
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
            <ScheduleTable excelRows={rowsFiltrados} rows={rowsFiltrados} pedidosPorSlot={pedidosPorSlot} onPedidosChange={setPedidosPorSlot} onTotalsChange={setTotalDiff} />
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
