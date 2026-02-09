import { describe, expect, it } from 'vitest'
import { parseMarkdown, parseInline } from './MarkdownView'

describe('parseInline', () => {
  it('returns plain text as a single text node', () => {
    const result = parseInline('hello world')
    expect(result).toEqual([{ type: 'text', value: 'hello world' }])
  })

  it('parses bold text wrapped in **', () => {
    const result = parseInline('this is **bold** text')
    expect(result).toEqual([
      { type: 'text', value: 'this is ' },
      { type: 'bold', value: 'bold' },
      { type: 'text', value: ' text' },
    ])
  })

  it('parses inline code wrapped in backticks', () => {
    const result = parseInline('use `npm install` here')
    expect(result).toEqual([
      { type: 'text', value: 'use ' },
      { type: 'code', value: 'npm install' },
      { type: 'text', value: ' here' },
    ])
  })

  it('handles multiple inline formats in one line', () => {
    const result = parseInline('**bold** and `code`')
    expect(result).toEqual([
      { type: 'bold', value: 'bold' },
      { type: 'text', value: ' and ' },
      { type: 'code', value: 'code' },
    ])
  })
})

describe('parseMarkdown', () => {
  it('parses h1 headings', () => {
    const blocks = parseMarkdown('# Title')
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('heading')
    if (blocks[0].type === 'heading') {
      expect(blocks[0].level).toBe(1)
      expect(blocks[0].content).toEqual([{ type: 'text', value: 'Title' }])
    }
  })

  it('parses h2 and h3 headings', () => {
    const blocks = parseMarkdown('## Subtitle\n### Section')
    expect(blocks.length).toBe(2)
    if (blocks[0].type === 'heading') expect(blocks[0].level).toBe(2)
    if (blocks[1].type === 'heading') expect(blocks[1].level).toBe(3)
  })

  it('parses bullet list items', () => {
    const blocks = parseMarkdown('- First item\n- Second item\n- Third item')
    expect(blocks.length).toBe(3)
    expect(blocks.every((b) => b.type === 'bullet')).toBe(true)
    if (blocks[0].type === 'bullet') {
      expect(blocks[0].content).toEqual([{ type: 'text', value: 'First item' }])
    }
  })

  it('parses bullet list items with * marker', () => {
    const blocks = parseMarkdown('* Alpha\n* Beta')
    expect(blocks.length).toBe(2)
    expect(blocks.every((b) => b.type === 'bullet')).toBe(true)
  })

  it('parses bold text inside bullets', () => {
    const blocks = parseMarkdown('- **Important** thing')
    expect(blocks.length).toBe(1)
    if (blocks[0].type === 'bullet') {
      expect(blocks[0].content).toEqual([
        { type: 'bold', value: 'Important' },
        { type: 'text', value: ' thing' },
      ])
    }
  })

  it('parses unchecked checkboxes', () => {
    const blocks = parseMarkdown('- [ ] Todo item')
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('checkbox')
    if (blocks[0].type === 'checkbox') {
      expect(blocks[0].checked).toBe(false)
      expect(blocks[0].content).toEqual([{ type: 'text', value: 'Todo item' }])
    }
  })

  it('parses checked checkboxes', () => {
    const blocks = parseMarkdown('- [x] Done item')
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('checkbox')
    if (blocks[0].type === 'checkbox') {
      expect(blocks[0].checked).toBe(true)
    }
  })

  it('parses uppercase X as checked', () => {
    const blocks = parseMarkdown('- [X] Also done')
    expect(blocks.length).toBe(1)
    if (blocks[0].type === 'checkbox') {
      expect(blocks[0].checked).toBe(true)
    }
  })

  it('parses fenced code blocks', () => {
    const input = '```typescript\nconst x = 1\nconst y = 2\n```'
    const blocks = parseMarkdown(input)
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('code-block')
    if (blocks[0].type === 'code-block') {
      expect(blocks[0].lang).toBe('typescript')
      expect(blocks[0].code).toBe('const x = 1\nconst y = 2')
    }
  })

  it('parses code blocks without a language', () => {
    const input = '```\nhello\n```'
    const blocks = parseMarkdown(input)
    expect(blocks.length).toBe(1)
    if (blocks[0].type === 'code-block') {
      expect(blocks[0].lang).toBe('')
      expect(blocks[0].code).toBe('hello')
    }
  })

  it('parses paragraphs', () => {
    const blocks = parseMarkdown('Just some text.')
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('paragraph')
  })

  it('skips empty lines', () => {
    const blocks = parseMarkdown('# Title\n\nParagraph text')
    expect(blocks.length).toBe(2)
    expect(blocks[0].type).toBe('heading')
    expect(blocks[1].type).toBe('paragraph')
  })

  it('handles a mixed document', () => {
    const md = [
      '# App Overview',
      '',
      '## Features',
      '- [ ] Login flow',
      '- [x] Dashboard',
      '- Basic **navigation**',
      '',
      'Some description with `inline code`.',
      '',
      '```json',
      '{ "key": "value" }',
      '```',
    ].join('\n')

    const blocks = parseMarkdown(md)

    const types = blocks.map((b) => b.type)
    expect(types).toEqual([
      'heading',     // # App Overview
      'heading',     // ## Features
      'checkbox',    // - [ ] Login flow
      'checkbox',    // - [x] Dashboard
      'bullet',      // - Basic **navigation**
      'paragraph',   // Some description...
      'code-block',  // ```json ... ```
    ])
  })
})
