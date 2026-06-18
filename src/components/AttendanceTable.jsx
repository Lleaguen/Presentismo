import { useState, useMemo } from 'react'
import styles from './AttendanceTable.module.css'

const COLUMNS = [
  { key: 'apellido',            label: 'Apellido' },
  { key: 'nombre',              label: 'Nombre' },
  { key: 'cuil',                label: 'CUIL' },
  { key: 'fechaIngresoCitado',  label: 'F. Citado' },
  { key: 'horaIngresoCitado',   label: 'H. Citado' },
  { key: 'fechaIngresoGrabado', label: 'F. Ingreso' },
  { key: 'horaIngresoGrabado',  label: 'H. Ingreso' },
  { key: 'fechaEgresoGrabado',  label: 'F. Egreso' },
  { key: 'horaEgresoGrabado',   label: 'H. Egreso' },
  { key: 'agencia',             label: 'Agencia' },
  { key: 'gerencia',            label: 'Gerencia' },
  { key: 'site',                label: 'Site' },
  { key: 'supervisor',         label: 'Supervisor' },
  { key: 'sector',              label: 'Sector' },
  { key: 'grupo',               label: 'Grupo' },
  { key: 'zona',                label: 'Zona' },
  { key: 'credencial',          label: 'Credencial' },
  { key: 'planta',              label: 'Planta' },
]

// Columnas disponibles para filtro por valor único
const FILTER_COLS = ['grupozona', 'gerencia', 'site', 'supervisor', 'sector', 'grupo', 'zona', 'planta']

// Labels personalizados para los filtros (puede diferir del label de columna)
const FILTER_LABELS = {
  grupozona: 'Agencia',
}

function isPresente(row) {
  return row.horaIngresoGrabado && String(row.horaIngresoGrabado).trim() !== ''
}

export default function AttendanceTable({ data }) {
  const [search, setSearch]         = useState('')
  const [sortKey, setSortKey]       = useState('apellido')
  const [sortDir, setSortDir]       = useState('asc')
  const [presencia, setPresencia]   = useState('todos')
  const [colFilters, setColFilters] = useState({}) // { colKey: valor }

  // Valores únicos por columna filtrable
  const uniqueValues = useMemo(() => {
    const result = {}
    FILTER_COLS.forEach((key) => {
      const s = new Set(data.map((r) => String(r[key] ?? '').trim()).filter(Boolean))
      result[key] = [...s].sort()
    })
    return result
  }, [data])

  const filtered = useMemo(() => {
    let rows = data
    if (presencia === 'presentes') rows = rows.filter(isPresente)
    if (presencia === 'ausentes')  rows = rows.filter((r) => !isPresente(r))
    for (const [k, v] of Object.entries(colFilters)) {
      if (v) rows = rows.filter((r) => String(r[k] ?? '').trim() === v)
    }
    const q = search.toLowerCase().trim()
    if (q) rows = rows.filter((r) => COLUMNS.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q)))
    return rows
  }, [data, presencia, colFilters, search])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const va = String(a[sortKey] ?? '').toLowerCase()
    const vb = String(b[sortKey] ?? '').toLowerCase()
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  }), [filtered, sortKey, sortDir])

  const totalPres  = useMemo(() => data.filter(isPresente).length, [data])
  const totalAus   = useMemo(() => data.filter((r) => !isPresente(r)).length, [data])
  const activeFiltersCount = Object.values(colFilters).filter(Boolean).length

  function setFilter(key, val) {
    setColFilters((p) => ({ ...p, [key]: val }))
  }

  function clearAll() {
    setColFilters({})
    setSearch('')
    setPresencia('todos')
    setSortKey('apellido')
    setSortDir('asc')
  }

  if (!data || data.length === 0) return <p className={styles.empty}>No hay datos cargados.</p>

  return (
    <div className={styles.wrapper}>

      {/* ── Toolbar principal ── */}
      <div className={styles.toolbar}>

        {/* Presencia */}
        <div className={styles.filterGroup}>
          <button className={`${styles.pill} ${presencia === 'todos' ? styles.pillActive : ''}`} onClick={() => setPresencia('todos')}>
            Todos <span className={styles.badge2}>{data.length}</span>
          </button>
          <button className={`${styles.pill} ${styles.pillGreen} ${presencia === 'presentes' ? styles.pillActiveGreen : ''}`} onClick={() => setPresencia('presentes')}>
            ✔ Presentes <span className={styles.badge2}>{totalPres}</span>
          </button>
          <button className={`${styles.pill} ${styles.pillRed} ${presencia === 'ausentes' ? styles.pillActiveRed : ''}`} onClick={() => setPresencia('ausentes')}>
            — Ausentes <span className={styles.badge2}>{totalAus}</span>
          </button>
        </div>

        {/* Búsqueda */}
        <input
          type="search"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />

        {/* Limpiar todo */}
        {(activeFiltersCount > 0 || search || presencia !== 'todos' || sortKey !== 'apellido') && (
          <button className={styles.clearBtn} onClick={clearAll}>✕ Limpiar todo</button>
        )}

        <span className={styles.count}>{sorted.length} / {data.length} registros</span>
      </div>

      {/* ── Filtros por columna (selects) ── */}
      <div className={styles.filterBar}>
        {/* Ordenamiento rápido */}
        <div className={styles.filterBarGroup}>
          <span className={styles.filterBarLabel}>Ordenar por</span>
          <select
            className={styles.select}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button
            className={`${styles.dirBtn} ${sortDir === 'asc' ? styles.dirBtnActive : ''}`}
            onClick={() => setSortDir('asc')}
            title="Ascendente"
          >↑ A-Z</button>
          <button
            className={`${styles.dirBtn} ${sortDir === 'desc' ? styles.dirBtnActive : ''}`}
            onClick={() => setSortDir('desc')}
            title="Descendente"
          >↓ Z-A</button>
        </div>

        {/* Divider */}
        <div className={styles.filterBarDivider} />

        {/* Filtros por valor */}
        {FILTER_COLS.map((key) => {
          const col = COLUMNS.find((c) => c.key === key)
          const opts = uniqueValues[key] ?? []
          if (opts.length === 0) return null
          return (
            <div key={key} className={styles.filterBarGroup}>
              <span className={styles.filterBarLabel}>{FILTER_LABELS[key] ?? col?.label}</span>
              <select
                className={`${styles.select} ${colFilters[key] ? styles.selectActive : ''}`}
                value={colFilters[key] ?? ''}
                onChange={(e) => setFilter(key, e.target.value)}
              >
                <option value="">Todos</option>
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {colFilters[key] && (
                <button className={styles.clearFilterBtn} onClick={() => setFilter(key, '')}>✕</button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Tabla ── */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.statusTh}>✔</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.th} ${sortKey === col.key ? styles.thSorted : ''}`}
                  onClick={() => {
                    if (sortKey === col.key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
                    else { setSortKey(col.key); setSortDir('asc') }
                  }}
                >
                  {col.label}
                  {sortKey === col.key && <span className={styles.sortIcon}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row._id} className={isPresente(row) ? styles.presente : styles.ausente}>
                <td className={styles.statusCell}>
                  <span className={`${styles.badgeStatus} ${!isPresente(row) ? styles.badgeAusente : ''}`}>
                    {isPresente(row) ? '✔' : '—'}
                  </span>
                </td>
                {COLUMNS.map((col) => (
                  <td key={col.key} className={styles.td}>{row[col.key] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
