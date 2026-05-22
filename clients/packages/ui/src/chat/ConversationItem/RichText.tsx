import { splitIntoSegments } from '@chat/shared'

interface RichTextProps {
  text: string
}

export const RichText = ({ text }: RichTextProps) => (
  <>
    {splitIntoSegments(text).map((seg, i) =>
      seg.isEmoji ? (
        <span key={i} style={{ fontSize: '1.25em', lineHeight: 1, verticalAlign: 'middle' }}>
          {seg.text}
        </span>
      ) : (
        <span key={i}>{seg.text}</span>
      ),
    )}
  </>
)
