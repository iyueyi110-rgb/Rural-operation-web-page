const MAGIC_NUMBERS: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
}

export async function validateFileMagicNumber(file: File): Promise<boolean> {
  const allowedMagic = MAGIC_NUMBERS[file.type]
  if (!allowedMagic) return false

  try {
    const headerLength = file.type === "image/webp" ? 12 : allowedMagic.length
    const buffer = new Uint8Array(await file.slice(0, headerLength).arrayBuffer())
    const matchesHeader = allowedMagic.every((byte, index) => buffer[index] === byte)
    if (!matchesHeader) return false

    if (file.type === "image/webp") {
      return (
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      )
    }

    return true
  } catch {
    return false
  }
}
