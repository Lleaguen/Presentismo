import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList
} from 'recharts'
import { SCHEDULE_HOURS, matchSlot } from '../utils/scheduleConfig'
import styles from './IngresoCurveChart.module.css'

function parseFecha(str) {
  const s = String(str ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }
  const p = s.split('/')
  if (p.length === 3) {
    const [d, m, y] = p.map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }
  return null
}

function esHoy(fechaStr, hoy) {
  const f = parseFecha(fechaStr)
  if (!f) return false
  return f.getUTCFullYear() === hoy.getUTCFullYear() &&
         f.getUTCMonth()    === hoy.getUTCMonth() &&
         f.getUTCDate()     === hoy.getUTCDate()
}

function CustomLabel({ x, y, value, color }) {
  if (!value || value === 0) return null
  return (
    <g>
      <rect x={x - 12} y={y - 18} width={24} height={14} rx={3} fill="white" stroke={color} strokeWidth={0.8} opacity={0.92} />
      <text x={x} y={y - 7} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
        {value}
      </text>
    </g>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}hs</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className={styles.tooltipItem}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Chart genérico reutilizable ──────────────────────────────────────────────
function ChartView({ data, series, fullHeight }) {
  const maxVal = Math.max(...data.map((d) => Math.max(...series.map((s) => d[s.key] ?? 0))), 1)

  return (
    <ResponsiveContainer width="100%" height={fullHeight ? '85%' : 240}>
      <AreaChart data={data} margin={{ top: 30, right: 24, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad_${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={s.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
        <YAxis
          allowDecimals={false}
          domain={[0, maxVal + Math.ceil(maxVal * 0.15)]}
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickLine={false} axisLine={false} width={32}
        />
        <Tooltip content={<CustomTooltip />} />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name}
            stroke={s.color} strokeWidth={s.width ?? 2} fill={`url(#grad_${s.key})`}
            dot={{ r: 3, fill: s.color, strokeWidth: 0 }} activeDot={{ r: 5 }}>
            <LabelList dataKey={s.key} content={(props) => <CustomLabel {...props} color={s.color} />} />
          </Area>
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function IngresoCurveChart({ rows, pedidosPorSlot, fullHeight = false }) {
  const [vista, setVista] = useState(0) // 0 = todas las series, 1 = solo presentes

  const data = useMemo(() => {
    const NEXT_DAY_SLOTS = new Set(['0:00', '6:00', '7:00'])
    const hoy = new Date()
    const hoyUTC = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))

    const convMap = {}
    const presMap = {}
    SCHEDULE_HOURS.forEach((s) => { convMap[s.value] = 0; presMap[s.value] = 0 })

    rows.forEach((row) => {
      const hora = String(row.horaIngresoCitado ?? '').trim()
      if (!hora) return
      const slot = matchSlot(hora)
      if (!slot || convMap[slot] === undefined) return
      convMap[slot]++

      if (!row.horaIngresoGrabado || String(row.horaIngresoGrabado).trim() === '') return
      if (String(row.gerencia ?? '').trim().toUpperCase() !== 'OPSEMLI') return
      if (!esHoy(row.fechaIngresoCitado, hoyUTC)) return
      if (NEXT_DAY_SLOTS.has(slot)) return
      presMap[slot]++
    })

    return SCHEDULE_HOURS
      .map((s) => ({
        hora:       s.label,
        convocados: convMap[s.value],
        presentes:  presMap[s.value],
        pedidos:    parseInt(pedidosPorSlot?.[s.value] || '0', 10) || 0,
      }))
      .filter((d) => d.convocados > 0 || d.presentes > 0 || d.pedidos > 0)
  }, [rows, pedidosPorSlot])

  if (data.length === 0) {
    return <p className={styles.empty}>Sin datos suficientes para mostrar el gráfico.</p>
  }

  const seriesAll = [
    { key: 'convocados', name: 'Convocados', color: '#00AEEF', width: 2 },
    { key: 'pedidos',    name: 'Pedidos',    color: '#8B5CF6', width: 2 },
    { key: 'presentes',  name: 'Presentes',  color: '#16A34A', width: 2.5 },
  ]

  const seriesPres = [
    { key: 'presentes', name: 'Presentes', color: '#16A34A', width: 2.5 },
  ]

  const vistas = [
    { label: 'Resumen', series: seriesAll },
    { label: 'Presentes', series: seriesPres },
  ]

  return (
    <div className={`${styles.wrapper} ${fullHeight ? styles.wrapperFull : ''}`}>

      {/* Selector de vista */}
      <div className={styles.vistaSelector}>
        {vistas.map((v, i) => (
          <button
            key={i}
            className={`${styles.vistaBtn} ${vista === i ? styles.vistaBtnActive : ''}`}
            onClick={() => setVista(i)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Gráfico */}
      <ChartView data={data} series={vistas[vista].series} fullHeight={fullHeight} />

      {/* Leyenda dinámica */}
      <div className={styles.legend}>
        {vistas[vista].series.map((s) => (
          <span key={s.key} style={{ color: s.color }} className={styles.legendItem2}>
            — {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}
