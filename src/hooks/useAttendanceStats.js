/**
 * Hook que encapsula los cálculos de estadísticas globales de App:
 *  - rowsFiltrados (filtro por rango horario)
 *  - presentes (OPSEMLI, hoy, sin slots de día siguiente)
 *  - nuevos (sector NUEVO con ingreso)
 *
 * Extrae lógica que antes vivía inline en App.jsx.
 */
import { useState, useMemo } from 'react'
import { toMins } from '../utils/dateUtils'
import { contarPresentes, contarNuevos } from '../utils/attendanceUtils'

export function useAttendanceStats(rows) {
  const [horaDesde, setHoraDesde] = useState('')
  const [horaHasta, setHoraHasta] = useState('')

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

  const presentes = useMemo(() => contarPresentes(rows), [rows])
  const nuevos    = useMemo(() => contarNuevos(rows), [rows])

  return {
    rowsFiltrados,
    presentes,
    nuevos,
    horaDesde,
    horaHasta,
    setHoraDesde,
    setHoraHasta,
  }
}
