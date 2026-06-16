import styles from './StatsBar.module.css'

/**
 * Tarjetas de resumen del día.
 * presentes y total vienen del CSV.
 */
export default function StatsBar({ presentes, total, nuevos = 0 }) {
  const ausentes = total - presentes
  const pct = total > 0 ? Math.round((presentes / total) * 100) : 0

  return (
    <div className={styles.bar}>

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Total en CSV</span>
          <span className={`${styles.cardDot} ${styles.cardDotBlue}`} />
        </div>
        <span className={`${styles.value} ${styles.valueBlue}`}>{total}</span>
        <span className={styles.cardHint}>Registros importados</span>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Presentes</span>
          <span className={`${styles.cardDot} ${styles.cardDotGreen}`} />
        </div>
        <span className={`${styles.value} ${styles.valueGreen}`}>{presentes}</span>
        <span className={styles.cardHint}>Con hora de ingreso grabado</span>
        <div className={styles.progressWrap}>
          <div
            className={`${styles.progressBar} ${styles.progressBarGreen}`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Ausentes</span>
          <span className={`${styles.cardDot} ${styles.cardDotRed}`} />
        </div>
        <span className={`${styles.value} ${styles.valueRed}`}>{ausentes}</span>
        <span className={styles.cardHint}>Sin registro de ingreso</span>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>% Asistencia</span>
          <span className={`${styles.cardDot} ${pct >= 95 ? styles.cardDotGreen : pct >= 80 ? styles.cardDotBlue : styles.cardDotRed}`} />
        </div>
        <span className={`${styles.value} ${pct >= 95 ? styles.valueGreen : pct >= 80 ? styles.valueBlue : styles.valueRed}`}>
          {pct}%
        </span>
        <span className={styles.cardHint}>Presentes / Total CSV</span>
        <div className={styles.progressWrap}>
          <div
            className={`${styles.progressBar} ${pct >= 95 ? styles.progressBarGreen : pct < 80 ? styles.progressBarRed : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.cardLabel}>Nuevos</span>
          <span className={`${styles.cardDot} ${styles.cardDotOrange}`} />
        </div>
        <span className={`${styles.value} ${styles.valueOrange}`}>{nuevos}</span>
        <span className={styles.cardHint}>Sector Nuevo</span>
      </div>

    </div>
  )
}
