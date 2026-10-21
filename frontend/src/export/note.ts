export function noteLines(text: string): { bullet: boolean; text: string }[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const bullet = /^\s*[-•]\s+/.test(line)
      return { bullet, text: bullet ? line.replace(/^\s*[-•]\s+/, '') : line }
    })
}
