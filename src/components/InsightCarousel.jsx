import { useState } from 'react'
import styles from './InsightCarousel.module.css'

const TABS = [
  { id: 'ausentismo', label: '📉 Ausentismo x hora' },
  { id: 'puntualidad', label: '⏱ Puntualidad x hora' },
  { id: 'agencias', label: '🏢 Agencias' },
  { id: 'desvio', label: '📊 Desvío acumulado' },
]

export default function InsightCarousel({ tableRows, excelRows }) {
  const [active, setActive] = useState('ausentismo')

  /* ── 1. Ausentismo por hora ── */
  const ausentismo = tableRows
    .map((r) => ({
      label: r.label,
      ausentes: r.conv - r.pres,
      conv: r.conv,
      pct: r.conv > 0 ? (((r.conv - r.pres) / r.conv) * 100).toFixed(1) : null,
    }))
    .filter((r) => r.pct !== null)

  /* ── 2. Puntualidad por hora ── */
  const puntBySlot = {}
  tableRows.forEach((r) => { puntBySlot[r.value] = { puntuales: 0, total: 0 } })

  excelRows.forEach((row) => {
    if (!row.horaIngresoGrabado || !row.horaIngresoCitado) return
    const citMins  = toMins(row.horaIngresoCitado)
    const grabMins = toMins(row.horaIngresoGrabado)
    if (citMins === null || grabMins === null) return
    const slot = closestSlot(row.horaIngresoCitado, tableRows)
    if (!slot || !puntBySlot[slot]) return
    puntBySlot[slot].total++
    if (grabMins - citMins <= 30) puntBySlot[slot].puntuales++
  })

  const puntualidad = tableRows
    .map((r) => {
      const d = puntBySlot[r.value]
      if (!d || d.total === 0) return null
      return {
        label: r.label,
        pct: ((d.puntuales / d.total) * 100).toFixed(1),
        puntuales: d.puntuales,
        total: d.total,
      }
    })
    .filter(Boolean)

  /* ── 3. Ausentismo por agencia (columna GrupoZona) ── */
  const agMap = {}
  excelRows.forEach((row) => {
    const ag = String(row.grupozona || '').trim()
    if (!ag) return
    if (!agMap[ag]) agMap[ag] = { ausentes: 0, total: 0 }
    agMap[ag].total++
    if (!row.horaIngresoGrabado || String(row.horaIngresoGrabado).trim() === '') agMap[ag].ausentes++
  })

  const agencias = Object.entries(agMap)
    .map(([ag, d]) => ({
      ag,
      ausentes: d.ausentes,
      total: d.total,
      pct: d.total > 0 ? ((d.ausentes / d.total) * 100).toFixed(1) : '0',
    }))
    .filter((a) => a.total > 0)
    .sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct))

  /* ── 4. Desvío acumulado ── */
  let acum = 0
  const desvio = tableRows
    .map((r) => {
      acum += r.pres - r.ped
      return { label: r.label, acum, activo: r.ped > 0 || Math.abs(acum) > 0 }
    })
    .filter((r) => r.activo)

  /* ── Render ── */
  function renderContent() {
    switch (active) {

      case 'ausentismo':
        if (!ausentismo.length) return <p className={styles.empty}>Sin datos suficientes</p>
        return (
          <div className={styles.grid}>
            {ausentismo.map((r) => {
              const p = parseFloat(r.pct)
              return (
                <div key={r.label} className={styles.gridItem}>
                  <span className={styles.itemLabel}>{r.label}</span>
                  <div className={styles.itemBarWrap}>
                    <div className={styles.itemBar} style={{ width: `${Math.min(p, 100)}%`, background: ausentColor(p) }} />
                  </div>
                  <div className={styles.itemFooter}>
                    <span className={`${styles.itemVal} ${ausentClass(p, styles)}`}>{r.pct}%</span>
                    <span className={styles.itemSub}>{r.ausentes}/{r.conv} ausentes</span>
                  </div>
                </div>
              )
            })}
          </div>
        )

      case 'puntualidad':
        if (!puntualidad.length) return <p className={styles.empty}>Sin datos suficientes</p>
        return (
          <div className={styles.grid}>
            {puntualidad.map((r) => {
              const p = parseFloat(r.pct)
              return (
                <div key={r.label} className={styles.gridItem}>
                  <span className={styles.itemLabel}>{r.label}</span>
                  <div className={styles.itemBarWrap}>
                    <div className={styles.itemBar} style={{ width: `${Math.min(p, 100)}%`, background: puntColor(p) }} />
                  </div>
                  <div className={styles.itemFooter}>
                    <span className={`${styles.itemVal} ${puntClass(p, styles)}`}>{r.pct}%</span>
                    <span className={styles.itemSub}>{r.puntuales}/{r.total} puntuales</span>
                  </div>
                </div>
              )
            })}
          </div>
        )

      case 'agencias':
        if (!agencias.length) return <p className={styles.empty}>Sin datos suficientes</p>
        return (
          <div className={styles.grid}>
            {agencias.map((a) => {
              const p = parseFloat(a.pct)
              return (
                <div key={a.ag} className={styles.gridItem}>
                  <span className={styles.itemLabel} title={a.ag}>
                    {a.ag.length > 16 ? a.ag.slice(0, 16) + '…' : a.ag}
                  </span>
                  <div className={styles.itemBarWrap}>
                    <div className={styles.itemBar} style={{ width: `${Math.min(p, 100)}%`, background: ausentColor(p) }} />
                  </div>
                  <div className={styles.itemFooter}>
                    <span className={`${styles.itemVal} ${ausentClass(p, styles)}`}>{a.pct}%</span>
                    <span className={styles.itemSub}>{a.ausentes}/{a.total}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )

      case 'desvio':
        if (!desvio.length) return <p className={styles.empty}>Sin datos suficientes</p>
        return (
          <div className={styles.desvioGrid}>
            {desvio.map((r) => (
              <div key={r.label} className={styles.desvioItem}>
                <span className={styles.desvioLabel}>{r.label}</span>
                <span className={`${styles.desvioVal} ${r.acum >= 0 ? styles.valPos : styles.valNeg}`}>
                  {r.acum > 0 ? `+${r.acum}` : r.acum}
                </span>
              </div>
            ))}
          </div>
        )

      default: return null
    }
  }

  const currentTab = TABS.find((t) => t.id === active)

  return (
    <div className={styles.carousel}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.title}>Indicadores de gestión</span>
        </div>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${active === t.id ? styles.tabActive : ''}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.body}>
        {renderContent()}
      </div>
    </div>
  )
}

/* ── Helpers ── */
function toMins(str) {
  if (!str) return null
  const parts = String(str).trim().split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0])) return null
  return parts[0] * 60 + (parts[1] || 0)
}

function closestSlot(hora, tableRows) {
  const mins = toMins(hora)
  if (mins === null) return null
  let best = null, bestDist = Infinity
  tableRows.forEach((r) => {
    const sm = toMins(r.value)
    if (sm === null) return
    const d = Math.abs(sm - mins)
    if (d < bestDist) { bestDist = d; best = r.value }
  })
  return best
}

function ausentColor(pct) {
  if (pct <= 5)  return '#16A34A'
  if (pct <= 20) return '#D97706'
  return '#DC2626'
}

function puntColor(pct) {
  if (pct >= 95) return '#16A34A'
  if (pct >= 80) return '#D97706'
  return '#DC2626'
}

function ausentClass(pct, styles) {
  if (pct <= 5)  return styles.valPos
  if (pct <= 20) return styles.valMid
  return styles.valNeg
}

function puntClass(pct, styles) {
  if (pct >= 95) return styles.valPos
  if (pct >= 80) return styles.valMid
  return styles.valNeg
}
