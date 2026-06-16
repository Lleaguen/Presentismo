import { useMemo } from 'react'
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

export default function IngresoCurveChart({ rows, pedidosPorSlot, fullHeight = false }) {
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

      // Presente
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

  const maxVal = Math.max(...data.map((d) => Math.max(d.convocados, d.presentes, d.pedidos)), 1)

  return (
    <div className={`${styles.wrapper} ${fullHeight ? styles.wrapperFull : ''}`}>
      <ResponsiveContainer width="100%" height={fullHeight ? '85%' : 240}>
        <AreaChart data={data} margin={{ top: 30, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00AEEF" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#00AEEF" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradPed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradPres" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#16A34A" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="hora"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, maxVal + Math.ceil(maxVal * 0.15)]}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} />

          <Area type="monotone" dataKey="convocados" name="Convocados"
            stroke="#00AEEF" strokeWidth={2} fill="url(#gradConv)"
            dot={{ r: 3, fill: '#00AEEF', strokeWidth: 0 }} activeDot={{ r: 5 }}>
            <LabelList dataKey="convocados" content={(props) => <CustomLabel {...props} color="#00AEEF" />} />
          </Area>

          <Area type="monotone" dataKey="pedidos" name="Pedidos"
            stroke="#8B5CF6" strokeWidth={2} fill="url(#gradPed)"
            dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 0 }} activeDot={{ r: 5 }}>
            <LabelList dataKey="pedidos" content={(props) => <CustomLabel {...props} color="#8B5CF6" />} />
          </Area>

          <Area type="monotone" dataKey="presentes" name="Presentes"
            stroke="#16A34A" strokeWidth={2.5} fill="url(#gradPres)"
            dot={{ r: 3, fill: '#16A34A', strokeWidth: 0 }} activeDot={{ r: 5 }}>
            <LabelList dataKey="presentes" content={(props) => <CustomLabel {...props} color="#16A34A" />} />
          </Area>
        </AreaChart>
      </ResponsiveContainer>

      <div className={styles.legend}>
        <span className={styles.legendConv}>— Convocados</span>
        <span className={styles.legendPed}>— Pedidos</span>
        <span className={styles.legendPres}>— Presentes</span>
      </div>
    </div>
  )
}
