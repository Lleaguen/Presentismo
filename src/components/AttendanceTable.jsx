import { useState, useMemo } from 'react'
import styles from './AttendanceTable.module.css'

const COLUMNS = [
  { key: 'apellido',           label: 'Apellido' },
  { key: 'nombre',             label: 'Nombre' },
  { key: 'cuil',               label: 'CUIL' },
  { key: 'fechaIngresoCitado', label: 'F. Ingreso Citado' },
  { key: 'horaIngresoCitado',  label: 'H. Ingreso Citado' },
  { key: 'fechaIngresoGrabado',label: 'F. Ingreso Grab.' },
  { key: 'horaIngresoGrabado', label: 'H. Ingreso Grab.' },
  { key: 'fechaEgresoGrabado', label: 'F. Egreso Grab.' },
  { key: 'horaEgresoGrabado',  label: 'H. Egreso Grab.' },
  { key: 'agencia',            label: 'Agencia' },
  { key: 'gerencia',           label: 'Gerencia' },
  { key: 'site',               label: 'Site' },
  { key: 'supervisor',         label: 'Supervisor' },
  { key: 'sector',             label: 'Sector' },
  { key: 'grupo',              label: 'Grupo' },
  { key: 'zona',               label: 'Zona' },
  { key: 'credencial',         label: 'Credencial' },
  { key: 'planta',             label: 'Planta' },
]

export default function AttendanceTable({ data }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('apellido')
  const [sortDir, setSortDir] = useState('asc')
  const [presenciaFilter, setPresenciaFilter] = useState('todos') // 'todos' | 'presentes' | 'ausentes'

  function isPresente(row) {
    return row.horaIngresoGrabado && String(row.horaIngresoGrabado).trim() !== ''
  }

  const filtered = useMemo(() => {
    let rows = data

    // Filtro presencia
    if (presenciaFilter === 'presentes') rows = rows.filter(isPresente)
    if (presenciaFilter === 'ausentes')  rows = rows.filter((r) => !isPresente(r))

    // Filtro búsqueda
    const q = search.toLowerCase().trim()
    if (q) {
      rows = rows.filter((row) =>
        COLUMNS.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q))
      )
    }

    return rows
  }, [data, search, presenciaFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = String(a[sortKey] ?? '').toLowerCase()
      const vb = String(b[sortKey] ?? '').toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  // Conteos para los botones
  const totalPresentes = useMemo(() => data.filter(isPresente).length, [data])
  const totalAusentes  = useMemo(() => data.filter((r) => !isPresente(r)).length, [data])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (!data || data.length === 0) {
    return (
      <p className={styles.empty}>
        No hay datos cargados. Subí un archivo CSV para ver la tabla.
      </p>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        {/* Filtros de presencia */}
        <div className={styles.filterGroup} role="group" aria-label="Filtrar por presencia">
          <button
            className={`${styles.filterBtn} ${presenciaFilter === 'todos' ? styles.filterActive : ''}`}
            onClick={() => setPresenciaFilter('todos')}
          >
            Todos <span className={styles.filterCount}>{data.length}</span>
          </button>
          <button
            className={`${styles.filterBtn} ${styles.filterPresente} ${presenciaFilter === 'presentes' ? styles.filterActivePresente : ''}`}
            onClick={() => setPresenciaFilter('presentes')}
          >
            ✔ Presentes <span className={styles.filterCount}>{totalPresentes}</span>
          </button>
          <button
            className={`${styles.filterBtn} ${styles.filterAusente} ${presenciaFilter === 'ausentes' ? styles.filterActiveAusente : ''}`}
            onClick={() => setPresenciaFilter('ausentes')}
          >
            — Ausentes <span className={styles.filterCount}>{totalAusentes}</span>
          </button>
        </div>

        {/* Buscador */}
        <input
          type="search"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          aria-label="Buscar en la tabla"
        />
        <span className={styles.count}>
          {sorted.length} / {data.length} registros
        </span>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.statusTh} title="Presente">✔</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={styles.th}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === 'asc' ? 'ascending' : 'descending'
                      : 'none'
                  }
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className={styles.sortIcon}>
                      {sortDir === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row._id}
                className={isPresente(row) ? styles.presente : styles.ausente}
              >
                <td className={styles.statusCell}>
                  {isPresente(row) ? (
                    <span className={styles.badge} title="Presente">✔</span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeAusente}`} title="Sin registro">—</span>
                  )}
                </td>
                {COLUMNS.map((col) => (
                  <td key={col.key} className={styles.td}>
                    {row[col.key] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
