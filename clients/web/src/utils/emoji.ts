export const isEmojiGrapheme = (g: string): boolean => {
  if (!g) return false
  if (/^\s+$/.test(g)) return false
  for (const ch of g) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) return false
    if (cp === 0x200d || cp === 0xfe0f || cp === 0x20e3) continue
    if (cp >= 0x1f1e6 && cp <= 0x1f1ff) continue
    if (cp >= 0x1f3fb && cp <= 0x1f3ff) continue
    if (cp >= 0x2300 && cp <= 0x27bf) continue
    if (cp >= 0x2b00 && cp <= 0x2bff) continue
    if (cp >= 0x1f000 && cp <= 0x1faff) continue
    if (cp === 0x00a9 || cp === 0x00ae) continue
    if (cp >= 0x203c && cp <= 0x2049) continue
    if (cp === 0x3030 || cp === 0x303d || cp === 0x3297 || cp === 0x3299) continue
    if (cp >= 0x2460 && cp <= 0x24ff) continue
    if (cp >= 0x3200 && cp <= 0x32ff) continue
    return false
  }
  return true
}

type SegmenterCtor = new (l?: string, o?: object) => { segment: (s: string) => Iterable<{ segment: string }> }
const getSegmenter = (): SegmenterCtor | undefined =>
  (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter

const forEachGrapheme = (s: string, fn: (g: string) => void): void => {
  const Seg = getSegmenter()
  if (Seg) {
    const seg = new Seg(undefined, { granularity: 'grapheme' })
    for (const part of seg.segment(s)) fn(part.segment)
  } else {
    for (const ch of s) fn(ch)
  }
}

export const getEmojiJumboSize = (content: string): number => {
  const trimmed = content.trim()
  if (!trimmed) return 0
  let count = 0
  let allEmoji = true
  forEachGrapheme(trimmed, (g) => {
    if (!isEmojiGrapheme(g)) {
      if (!/^\s+$/.test(g)) allEmoji = false
      return
    }
    count++
  })
  if (!allEmoji || count <= 0 || count > 6) return 0
  if (count === 1) return 10
  if (count === 2) return 8
  if (count === 3) return 6.5
  return 5
}

export type EmojiSegment = { text: string; isEmoji: boolean }

export const splitIntoSegments = (content: string): EmojiSegment[] => {
  const segments: EmojiSegment[] = []
  forEachGrapheme(content, (g) => {
    const isEmoji = isEmojiGrapheme(g)
    const last = segments[segments.length - 1]
    if (last && last.isEmoji === isEmoji) {
      last.text += g
    } else {
      segments.push({ text: g, isEmoji })
    }
  })
  return segments
}
