import { useRef, useState } from 'react'
import styles from './FileUploader.module.css'

export default function FileUploader({ onFileLoaded }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')

  function handleFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      alert('Seleccioná un archivo CSV (.csv) o Excel (.xlsx, .xls)')
      return
    }
    setFileName(file.name)
    onFileLoaded(file)
  }

  const handleChange   = (e) => handleFile(e.target.files[0])
  const handleDrop     = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }
  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  return (
    <div
      className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
      onClick={() => inputRef.current.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current.click()}
      aria-label="Cargar archivo de asistencia"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleChange}
        className={styles.hiddenInput}
        aria-hidden="true"
      />

      <div className={styles.iconWrap}>📄</div>

      <div className={styles.textGroup}>
        {fileName ? (
          <div className={styles.fileLoaded}>
            <span className={styles.fileName}>✓ {fileName}</span>
            <button className={styles.changeBtn} onClick={(e) => { e.stopPropagation(); inputRef.current.click() }}>
              Cambiar archivo
            </button>
          </div>
        ) : (
          <>
            <p className={styles.label}>Arrastrá o hacé clic para cargar el archivo</p>
            <p className={styles.hint}>Formatos aceptados: .csv · .xlsx · .xls</p>
          </>
        )}
      </div>
    </div>
  )
}
