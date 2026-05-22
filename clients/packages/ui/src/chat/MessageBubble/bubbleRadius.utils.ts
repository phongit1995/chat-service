export const computeBubbleRadius = (
  isOwnMessage: boolean,
  isFirstInStreak: boolean,
  isLastInStreak: boolean,
): string => {
  const lg = '20px'
  const sm = '6px'
  if (isOwnMessage) {
    const tr = isFirstInStreak ? lg : sm
    const br = isLastInStreak ? lg : sm
    return `${lg} ${tr} ${br} ${lg}`
  }
  const tl = isFirstInStreak ? lg : sm
  const bl = isLastInStreak ? lg : sm
  return `${tl} ${lg} ${lg} ${bl}`
}

export const formatBubbleTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
