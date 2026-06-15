export const WORDPAD_FORMAT_MARKER = '\u200b'
export const EMPTY_WORDPAD_PAGE_HTML = '<br>'
export const WORDPAD_PAGE_BREAK_TOKEN = '<!--wordpad-page-break-->'

export type WordPadInlineStyle = {
  color?: string
  fontFamily?: string
  fontSize?: string
}

export function cleanWordPadHtml(html: string): string {
  return html.replaceAll(WORDPAD_FORMAT_MARKER, '')
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function looksLikeHtml(content: string): boolean {
  return /<[a-z!/][\s\S]*>/i.test(content)
}

function contentToHtml(content: string): string {
  if (looksLikeHtml(content)) {
    return content
  }
  return escapeHtml(content).replace(/\r?\n/g, '<br>') || EMPTY_WORDPAD_PAGE_HTML
}

export function normalizeWordPadPageHtml(html: string): string {
  return html.trim() ? html : EMPTY_WORDPAD_PAGE_HTML
}

export function wordPadContentToPages(
  content: string | undefined,
  fallbackPages: string[] = [EMPTY_WORDPAD_PAGE_HTML],
): string[] {
  if (content === undefined) {
    return fallbackPages
  }
  return contentToHtml(content).split(WORDPAD_PAGE_BREAK_TOKEN).map(normalizeWordPadPageHtml)
}

export function wordPadPagesToDocumentHtml(pages: string[]): string {
  return pages.map((page) => normalizeWordPadPageHtml(cleanWordPadHtml(page))).join(WORDPAD_PAGE_BREAK_TOKEN)
}

function applyStyle(span: HTMLSpanElement, style: WordPadInlineStyle): void {
  if (style.color) span.style.color = style.color
  if (style.fontFamily) span.style.fontFamily = style.fontFamily
  if (style.fontSize) span.style.fontSize = style.fontSize
}

export function rangeBelongsToElement(range: Range | null, element: HTMLElement): boolean {
  if (!range) return false
  return element.contains(range.startContainer) && element.contains(range.endContainer)
}

export function applyWordPadInlineStyle(
  editor: HTMLElement,
  range: Range,
  style: WordPadInlineStyle,
): Range | null {
  if (!rangeBelongsToElement(range, editor)) return null

  const doc = editor.ownerDocument
  const span = doc.createElement('span')
  applyStyle(span, style)

  if (range.collapsed) {
    const marker = doc.createTextNode(WORDPAD_FORMAT_MARKER)
    span.appendChild(marker)
    range.insertNode(span)

    const nextRange = doc.createRange()
    nextRange.setStart(marker, marker.data.length)
    nextRange.collapse(true)
    return nextRange
  }

  span.appendChild(range.extractContents())
  range.insertNode(span)

  const nextRange = doc.createRange()
  nextRange.selectNodeContents(span)
  return nextRange
}
