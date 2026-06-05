const CHUNK_SIZE = 2000
const OVERLAP = 400

export function chunkText(text: string): string[] {
  if (!text.trim()) return []

  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + CHUNK_SIZE))
    start += CHUNK_SIZE - OVERLAP
  }
  return chunks
}
