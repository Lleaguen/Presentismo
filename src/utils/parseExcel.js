import * as XLSX from 'xlsx'

// Mapeo: clave normalizada (lowercase+trim+colapsar espacios) → clave interna
const COLUMN_MAP = {
  'apellido':              'apellido',
  'nombre':                'nombre',
  'cuil':                  'cuil',
  'fecha ingreso citado':  'fechaIngresoCitado',
  'hora ingreso citado':   'horaIngresoCitado',
  'fecha ingreso grabado': 'fechaIngresoGrabado',
  'hora ingreso grabado':  'horaIngresoGrabado',
  'fecha egreso grabado':  'fechaEgresoGrabado',
  'hora egreso grabado':   'horaEgresoGrabado',
  'agencia':               'agencia',
  'gerencia':              'gerencia',
  'site':                  'site',
  'supervisor':            'supervisor',
  'sector':                'sector',
  'grupo':                 'grupo',
  'zona':                  'zona',
  'grupozona':             'grupozona',
  'credencial':            'credencial',
  'planta':                'planta',
}

const TIME_INTERNAL_KEYS = new Set([
  'horaIngresoCitado',
  'horaIngresoGrabado',
  'horaEgresoGrabado',
])

const DATE_INTERNAL_KEYS = new Set([
  'fechaIngresoCitado',
  'fechaIngresoGrabado',
  'fechaEgresoGrabado',
])

/**
 * Convierte un serial numérico de Excel a "DD/MM/YYYY".
 * Excel cuenta días desde 1900-01-01 (con bug del falso bisiesto 1900).
 * Ej: 46182 → "10/06/2026"
 */
function excelSerialToDate(serial) {
  if (typeof serial !== 'number') return String(serial)
  // Restar 25569 = diferencia entre epoch Unix (1970) y Excel (1900)
  const ms = Math.round((serial - 25569) * 86400 * 1000)
  const date = new Date(ms)
  const d = String(date.getUTCDate()).padStart(2, '0')
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const y = date.getUTCFullYear()
  return `${d}/${m}/${y}`
}

/**
 * Convierte cualquier valor de hora a string "H:MM:SS".
 *
 * Casos:
 *   - Número serial completo (46182.874444) → extrae fracción → hora
 *   - Número decimal puro (0.874444)        → hora directa
 *   - Date object                            → getHours/getMinutes/getSeconds
 *   - String "12:44:20", "12:44", "0:00:00" → devuelve tal cual
 *   - String "12:00 PM"                      → convierte
 */
function normalizeTimeValue(val) {
  if (val === null || val === undefined || val === '') return ''

  if (typeof val === 'number') {
    // La fracción del día representa la hora
    const fraction = val % 1
    const totalSeconds = Math.round(Math.abs(fraction) * 86400)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  if (val instanceof Date) {
    const h = val.getHours()
    const m = val.getMinutes()
    const s = val.getSeconds()
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const str = String(val).trim()
  if (!str) return ''

  // "H:MM" o "H:MM:SS"
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) return str

  // "12:00 AM/PM"
  const ampm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i)
  if (ampm) {
    let h = parseInt(ampm[1], 10)
    const period = ampm[4].toUpperCase()
    if (period === 'AM' && h === 12) h = 0
    if (period === 'PM' && h !== 12) h += 12
    return `${h}:${ampm[2]}:${ampm[3] ?? '00'}`
  }

  return str
}

/**
 * Normaliza el valor de una celda de fecha.
 * Si es número → serial de Excel → "DD/MM/YYYY"
 * Si es string → lo devuelve tal cual
 */
function normalizeDateValue(val) {
  if (val === null || val === undefined || val === '') return ''
  if (typeof val === 'number') return excelSerialToDate(val)
  if (val instanceof Date) {
    const d = String(val.getUTCDate()).padStart(2, '0')
    const m = String(val.getUTCMonth() + 1).padStart(2, '0')
    const y = val.getUTCFullYear()
    return `${d}/${m}/${y}`
  }
  return String(val)
}

/**
 * Parsea un archivo CSV o Excel (.xlsx/.xls) y devuelve un array de objetos
 * con claves internas normalizadas. Fechas y horas se convierten a strings legibles.
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase()
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        let workbook

        if (ext === 'csv') {
          // Para CSV leemos como string; raw:true para preservar números crudos
          workbook = XLSX.read(e.target.result, { type: 'string', raw: true })
        } else {
          const data = new Uint8Array(e.target.result)
          workbook = XLSX.read(data, { type: 'array', cellDates: false, raw: true })
        }

        const sheet = workbook.Sheets[workbook.SheetNames[0]]

        // raw:true para que los números lleguen como números (seriales de fecha/hora)
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })

        if (rows.length === 0) {
          resolve([])
          return
        }

        const mapped = rows.map((row, idx) => {
          const obj = { _id: idx }
          Object.values(COLUMN_MAP).forEach((k) => { obj[k] = '' })

          // Debug solo en la primera fila para ver columnas crudas
          if (idx === 0) {
            console.log('[DEBUG] Columnas crudas del CSV:')
            Object.keys(row).forEach((k) => {
              const hex = Array.from(k).map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join(' ')
              console.log(`  "${k}" → normalized: "${String(k).trim().toLowerCase().replace(/\s+/g, ' ')}" → hex: [${hex}]`)
            })
          }

          for (const [rawKey, value] of Object.entries(row)) {
            const normalized = String(rawKey).trim().toLowerCase().replace(/\s+/g, ' ')
            const internalKey = COLUMN_MAP[normalized]
            if (!internalKey) continue

            if (TIME_INTERNAL_KEYS.has(internalKey)) {
              obj[internalKey] = normalizeTimeValue(value)
            } else if (DATE_INTERNAL_KEYS.has(internalKey)) {
              obj[internalKey] = normalizeDateValue(value)
            } else {
              obj[internalKey] = value ?? ''
            }
          }

          return obj
        })

        resolve(mapped)
      } catch (err) {
        reject(new Error('Error al procesar el archivo: ' + err.message))
      }
    }

    reader.onerror = () => reject(new Error('Error al leer el archivo'))

    if (ext === 'csv') {
      reader.readAsText(file, 'UTF-8')
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}
