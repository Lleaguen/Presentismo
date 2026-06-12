import { useState, useMemo } from 'react'
import FileUploader from './components/FileUploader'
import StatsBar from './components/StatsBar'
import ScheduleTable from './components/ScheduleTable'
import AttendanceTable from './components/AttendanceTable'
import { parseExcelFile } from './utils/parseExcel'
import ocasaLogo from './assets/Ocasa.png'
import styles from './App.module.css'

export default function App() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const presentes = useMemo(
    () => rows.filter((r) => r.horaIngresoGrabado && String(r.horaIngresoGrabado).trim() !== '').length,
    [rows]
  )

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
        <span className={styles.headerBadge}>
          {rows.length > 0 ? `${rows.length} registros cargados` : 'Sin datos'}
        </span>
      </header>

      <main className={styles.main}>

        {/* 1 — Carga del archivo */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>📁</div>
            <span className={styles.sectionTitle}>Importar archivo</span>
          </div>
          <div className={styles.sectionBody}>
            <FileUploader onFileLoaded={handleFileLoaded} />
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
            <StatsBar presentes={presentes} total={rows.length} />
          </div>
        </div>

        {/* 3 — Tabla por franja horaria */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>🕐</div>
            <span className={styles.sectionTitle}>Presentismo por franja horaria</span>
          </div>
          <div className={styles.sectionBody}>
            <ScheduleTable excelRows={rows} />
          </div>
        </div>

        {/* 4 — Detalle por empleado */}
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
