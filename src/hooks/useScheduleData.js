/**
 * Hook que encapsula toda la lógica de cálculo de la tabla de franjas horarias.
 *
 * Cuando hay filas del Excel (excelRows.length > 0) calcula todo en tiempo real.
 * Cuando no hay Excel pero hay un dbSnapshot (datos de Supabase), los usa como fallback.
 */
import { useMemo } from 'react'
import { SCHEDULE_HOURS, matchSlot } from '../utils/scheduleConfig'
import { esHoy, hoyUTC, toMins } from '../utils/dateUtils'

const NEXT_DAY_SLOTS = new Set(['0:00', '6:00', '7:00'])

export function useScheduleData(excelRows, pedidosPorSlot, dbSnapshot = []) {
  const hasExcel = excelRows.length > 0

  // Convocados: del Excel o del snapshot de Supabase
  const convocadosPorSlot = useMemo(() => {
    const counts = {}
    SCHEDULE_HOURS.forEach((s) => { counts[s.value] = 0 })

    if (hasExcel) {
      excelRows.forEach((row) => {
        const hora = String(row.horaIngresoCitado ?? '').trim()
        if (!hora) return
        const slot = matchSlot(hora)
        if (slot !== null && counts[slot] !== undefined) counts[slot]++
      })
    } else {
      dbSnapshot.forEach((r) => {
        if (counts[r.slot] !== undefined) counts[r.slot] = r.convocados
      })
    }
    return counts
  }, [excelRows, dbSnapshot, hasExcel])

  // Presentes: del Excel o del snapshot de Supabase
  const presentesPorSlot = useMemo(() => {
    const counts = {}
    SCHEDULE_HOURS.forEach((s) => { counts[s.value] = 0 })

    if (hasExcel) {
      const today = hoyUTC()
      excelRows.forEach((row) => {
        if (!row.horaIngresoGrabado || String(row.horaIngresoGrabado).trim() === '') return
        if (String(row.gerencia ?? '').trim().toUpperCase() !== 'OPSEMLI') return
        if (!esHoy(row.fechaIngresoCitado, today)) return
        const hora = String(row.horaIngresoCitado ?? '').trim()
        if (!hora) return
        const slot = matchSlot(hora)
        if (slot === null || counts[slot] === undefined) return
        if (NEXT_DAY_SLOTS.has(slot)) return
        counts[slot]++
      })
    } else {
      dbSnapshot.forEach((r) => {
        if (counts[r.slot] !== undefined) counts[r.slot] = r.presentes
      })
    }
    return counts
  }, [excelRows, dbSnapshot, hasExcel])

  // Nuevos: del Excel o del snapshot de Supabase
  const nuevosPorSlot = useMemo(() => {
    const counts = {}
    SCHEDULE_HOURS.forEach((s) => { counts[s.value] = 0 })

    if (hasExcel) {
      excelRows.forEach((row) => {
        if (String(row.sector ?? '').trim().toUpperCase() !== 'NUEVO') return
        if (!row.horaIngresoGrabado || String(row.horaIngresoGrabado).trim() === '') return
        const hora = String(row.horaIngresoCitado ?? '').trim()
        if (!hora) return
        const slot = matchSlot(hora)
        if (slot !== null && counts[slot] !== undefined) counts[slot]++
      })
    } else {
      dbSnapshot.forEach((r) => {
        if (counts[r.slot] !== undefined) counts[r.slot] = r.nuevos
      })
    }
    return counts
  }, [excelRows, dbSnapshot, hasExcel])

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
    const ahora = new Date()
    const ahoraMins = ahora.getHours() * 60 + ahora.getMinutes()

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

    const slotsPasados = tableRows.filter((r) => {
      const m = toMins(r.value)
      return m !== null && m <= ahoraMins
    })
    const pedPasados  = slotsPasados.reduce((s, r) => s + r.ped, 0)
    const presPasados = slotsPasados.reduce((s, r) => s + r.pres, 0)
    const totalDiff   = presPasados - pedPasados
    const totalAsist  = pedPasados > 0 ? ((presPasados / pedPasados) * 100).toFixed(1) : '—'

    return { dia, noche, totalConv, totalPed, totalPres, totalNuevos, totalDiff, totalAsist }
  }, [tableRows])

  return { tableRows, totals, hasExcel }
}
