// Content sniffing: never trust file extensions or client-declared MIME types.
// Also a minimal ISO-BMFF (MP4/MOV/HEIC) reader for dimensions and duration.

export type SniffedType = "jpeg" | "png" | "webp" | "heic" | "mp4" | "mov" | "gif" | "svg" | "html" | "unknown"

export function sniff(buf: Uint8Array): SniffedType {
  const ascii = (start: number, end: number) => String.fromCharCode(...buf.subarray(start, end))
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg"
  if (buf.length >= 8 && buf[0] === 0x89 && ascii(1, 4) === "PNG") return "png"
  if (buf.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp"
  if (buf.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "gif"
  if (buf.length >= 12 && ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12)
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis"].includes(brand)) return "heic"
    if (brand === "qt  ") return "mov"
    return "mp4"
  }
  const head = new TextDecoder().decode(buf.subarray(0, 512)).trimStart().toLowerCase()
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "svg"
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) return "html"
  return "unknown"
}

interface Box { type: string; start: number; size: number; header: number }

function* boxes(buf: Uint8Array, start: number, end: number): Generator<Box> {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let offset = start
  while (offset + 8 <= end) {
    let size = view.getUint32(offset)
    const type = String.fromCharCode(...buf.subarray(offset + 4, offset + 8))
    let header = 8
    if (size === 1 && offset + 16 <= end) {
      size = Number(view.getBigUint64(offset + 8))
      header = 16
    } else if (size === 0) {
      size = end - offset
    }
    if (size < header || offset + size > end) return
    yield { type, start: offset, size, header }
    offset += size
  }
}

function findBox(buf: Uint8Array, path: string[], start = 0, end = buf.length): Box | null {
  const [head, ...rest] = path
  for (const box of boxes(buf, start, end)) {
    if (box.type !== head) continue
    if (rest.length === 0) return box
    // meta is a FullBox: 4 bytes of version/flags before children
    const childStart = box.start + box.header + (box.type === "meta" ? 4 : 0)
    const found = findBox(buf, rest, childStart, box.start + box.size)
    if (found) return found
  }
  return null
}

export function mp4Info(buf: Uint8Array): { durationMs: number | null; width: number | null; height: number | null } {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let durationMs: number | null = null
  const mvhd = findBox(buf, ["moov", "mvhd"])
  if (mvhd) {
    const p = mvhd.start + mvhd.header
    const version = buf[p]
    if (version === 1) {
      const timescale = view.getUint32(p + 20)
      const duration = Number(view.getBigUint64(p + 24))
      durationMs = timescale ? Math.round((duration / timescale) * 1000) : null
    } else {
      const timescale = view.getUint32(p + 12)
      const duration = view.getUint32(p + 16)
      durationMs = timescale ? Math.round((duration / timescale) * 1000) : null
    }
  }
  let width: number | null = null
  let height: number | null = null
  const moov = findBox(buf, ["moov"])
  if (moov) {
    for (const trak of boxes(buf, moov.start + moov.header, moov.start + moov.size)) {
      if (trak.type !== "trak") continue
      const tkhd = findBox(buf, ["tkhd"], trak.start + trak.header, trak.start + trak.size)
      if (!tkhd) continue
      const p = tkhd.start + tkhd.header
      const version = buf[p]
      const base = p + (version === 1 ? 88 : 76)
      if (base + 8 > buf.length) continue
      const w = view.getUint32(base) >>> 16
      const h = view.getUint32(base + 4) >>> 16
      if (w > 0 && h > 0) {
        width = w
        height = h
        break
      }
    }
  }
  return { durationMs, width, height }
}

export function heicInfo(buf: Uint8Array): { width: number | null; height: number | null } {
  const ispe = findBox(buf, ["meta", "iprp", "ipco", "ispe"])
  if (!ispe) return { width: null, height: null }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const p = ispe.start + ispe.header + 4
  return { width: view.getUint32(p), height: view.getUint32(p + 4) }
}
