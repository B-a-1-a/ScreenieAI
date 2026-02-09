import type { ReactNode } from 'react'

/* ── Parsed block types ─────────────────────────────── */

export type MdBlock =
  | { type: 'heading'; level: 1 | 2 | 3; content: MdInline[] }
  | { type: 'bullet'; content: MdInline[] }
  | { type: 'checkbox'; checked: boolean; content: MdInline[] }
  | { type: 'code-block'; lang: string; code: string }
  | { type: 'paragraph'; content: MdInline[] }

export type MdInline =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string }

/* ── Inline parser ──────────────────────────────────── */

export function parseInline(text: string): MdInline[] {
  const result: MdInline[] = []
  // Match **bold**, `code`
  const pattern = /(\*\*(.+?)\*\*)|(`([^`]+)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // text before this match
    if (match.index > lastIndex) {
      result.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }

    if (match[2] !== undefined) {
      // bold
      result.push({ type: 'bold', value: match[2] })
    } else if (match[4] !== undefined) {
      // inline code
      result.push({ type: 'code', value: match[4] })
    }

    lastIndex = match.index + match[0].length
  }

  // trailing text
  if (lastIndex < text.length) {
    result.push({ type: 'text', value: text.slice(lastIndex) })
  }

  // if nothing matched, return the raw text
  if (result.length === 0 && text.length > 0) {
    result.push({ type: 'text', value: text })
  }

  return result
}

/* ── Block parser ───────────────────────────────────── */

export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.split('\n')
  const blocks: MdBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block: ```
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      // skip closing ```
      if (i < lines.length) i++
      blocks.push({ type: 'code-block', lang, code: codeLines.join('\n') })
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3
      blocks.push({ type: 'heading', level, content: parseInline(headingMatch[2]) })
      i++
      continue
    }

    // Checkbox: - [ ] text or - [x] text
    const checkboxMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/)
    if (checkboxMatch) {
      const checked = checkboxMatch[1].toLowerCase() === 'x'
      blocks.push({ type: 'checkbox', checked, content: parseInline(checkboxMatch[2]) })
      i++
      continue
    }

    // Bullet list: - text or * text
    const bulletMatch = line.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      blocks.push({ type: 'bullet', content: parseInline(bulletMatch[1]) })
      i++
      continue
    }

    // Empty line — skip
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph (default)
    blocks.push({ type: 'paragraph', content: parseInline(line) })
    i++
  }

  return blocks
}

/* ── React rendering ────────────────────────────────── */

function renderInline(inlines: MdInline[], keyPrefix: string): ReactNode[] {
  return inlines.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`
    switch (node.type) {
      case 'bold':
        return <strong key={key}>{node.value}</strong>
      case 'code':
        return <code key={key}>{node.value}</code>
      case 'text':
      default:
        return <span key={key}>{node.value}</span>
    }
  })
}

/** Group consecutive bullet / checkbox blocks into <ul> lists. */
function groupBlocks(blocks: MdBlock[]): (MdBlock | MdBlock[])[] {
  const groups: (MdBlock | MdBlock[])[] = []
  let currentList: MdBlock[] | null = null

  for (const block of blocks) {
    if (block.type === 'bullet' || block.type === 'checkbox') {
      if (!currentList) {
        currentList = []
        groups.push(currentList)
      }
      currentList.push(block)
    } else {
      currentList = null
      groups.push(block)
    }
  }

  return groups
}

interface MarkdownViewProps {
  content: string
}

export function MarkdownView({ content }: MarkdownViewProps) {
  const blocks = parseMarkdown(content)
  const grouped = groupBlocks(blocks)

  return (
    <div className="markdown-view">
      {grouped.map((entry, gi) => {
        // List group
        if (Array.isArray(entry)) {
          return (
            <ul key={gi}>
              {entry.map((block, li) => {
                if (block.type === 'checkbox') {
                  return (
                    <li key={li} className="checkbox">
                      <input type="checkbox" checked={block.checked} readOnly />
                      {renderInline(block.content, `${gi}-${li}`)}
                    </li>
                  )
                }
                // bullet
                return <li key={li}>{renderInline(block.content, `${gi}-${li}`)}</li>
              })}
            </ul>
          )
        }

        // Single block
        const block = entry
        const key = gi

        switch (block.type) {
          case 'heading':
            if (block.level === 1) return <h1 key={key}>{renderInline(block.content, `${key}`)}</h1>
            if (block.level === 2) return <h2 key={key}>{renderInline(block.content, `${key}`)}</h2>
            return <h3 key={key}>{renderInline(block.content, `${key}`)}</h3>

          case 'code-block':
            return (
              <pre key={key}>
                <code>{block.code}</code>
              </pre>
            )

          case 'paragraph':
            return <p key={key}>{renderInline(block.content, `${key}`)}</p>

          default:
            return null
        }
      })}
    </div>
  )
}
