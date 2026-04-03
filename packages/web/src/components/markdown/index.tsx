import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useMemo } from 'react'
import './index.less'

interface MarkdownProps {
  content: string
  className?: string
}

interface InlineNode {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link'
  text: string
  href?: string
}

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  // Match [text](url), **bold**, *italic*, `code`
  const regex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    if (match[2] && match[3]) {
      // [text](url)
      nodes.push({ type: 'link', text: match[2], href: match[3] })
    } else if (match[5]) {
      nodes.push({ type: 'bold', text: match[5] })
    } else if (match[7]) {
      nodes.push({ type: 'italic', text: match[7] })
    } else if (match[9]) {
      nodes.push({ type: 'code', text: match[9] })
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }
  return nodes
}

function handleLinkClick(href: string) {
  // 支持评价页面链接: review://城市/景点
  if (href.startsWith('review://')) {
    const parts = href.replace('review://', '').split('/')
    if (parts.length >= 2) {
      const city = encodeURIComponent(parts[0])
      const attraction = encodeURIComponent(parts.slice(1).join('/'))
      Taro.navigateTo({
        url: `/pages/review/index?city=${city}&attraction=${attraction}`,
      })
      return
    }
  }
  // 普通 URL 打开
  if (href.startsWith('http')) {
    if (process.env.TARO_ENV === 'h5') {
      window.open(href, '_blank')
    } else {
      Taro.setClipboardData({ data: href })
    }
  }
}

function InlineRender({ text }: { text: string }) {
  const nodes = parseInline(text)
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === 'bold') {
          return <Text key={i} className='md-bold'>{node.text}</Text>
        }
        if (node.type === 'italic') {
          return <Text key={i} className='md-italic'>{node.text}</Text>
        }
        if (node.type === 'code') {
          return <Text key={i} className='md-code'>{node.text}</Text>
        }
        if (node.type === 'link') {
          return (
            <Text
              key={i}
              className='md-link'
              onClick={() => handleLinkClick(node.href || '')}
            >
              {node.text}
            </Text>
          )
        }
        return <Text key={i}>{node.text}</Text>
      })}
    </>
  )
}

interface Block {
  type: 'paragraph' | 'heading' | 'ul-item' | 'ol-item' | 'divider' | 'table'
  level?: number
  index?: number
  content: string
  rows?: string[][]
  headers?: string[]
}

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let tableLines: string[] = []

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', content: paragraph.join('\n') })
      paragraph = []
    }
  }

  const flushTable = () => {
    if (tableLines.length < 2) {
      // 不够构成表格，当普通文本处理
      tableLines.forEach(l => paragraph.push(l))
      tableLines = []
      return
    }

    const parseRow = (line: string): string[] =>
      line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length)

    const headers = parseRow(tableLines[0])
    // 跳过分隔行 (---|---|---)
    const startIdx = tableLines[1].match(/^[\s|:-]+$/) ? 2 : 1
    const rows: string[][] = []
    for (let i = startIdx; i < tableLines.length; i++) {
      rows.push(parseRow(tableLines[i]))
    }

    blocks.push({ type: 'table', content: '', headers, rows })
    tableLines = []
  }

  let olCounter = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // 检测表格行
    const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')

    if (isTableLine) {
      flushParagraph()
      if (olCounter > 0) olCounter = 0
      tableLines.push(trimmed)
      continue
    } else if (tableLines.length > 0) {
      flushTable()
    }

    if (trimmed === '') {
      flushParagraph()
      olCounter = 0
      continue
    }

    if (trimmed === '---' || trimmed === '***') {
      flushParagraph()
      olCounter = 0
      blocks.push({ type: 'divider', content: '' })
      continue
    }

    // Headings: ### heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      olCounter = 0
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      })
      continue
    }

    // Unordered list items: - item or * item
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (ulMatch) {
      flushParagraph()
      olCounter = 0
      blocks.push({ type: 'ul-item', content: ulMatch[1] })
      continue
    }

    // Ordered list items: 1. item
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      flushParagraph()
      olCounter++
      blocks.push({ type: 'ol-item', content: olMatch[1], index: olCounter })
      continue
    }

    olCounter = 0
    paragraph.push(trimmed)
  }

  if (tableLines.length > 0) flushTable()
  flushParagraph()
  return blocks
}

export default function Markdown({ content, className }: MarkdownProps) {
  const blocks = useMemo(() => parseBlocks(content), [content])

  return (
    <View className={`md ${className || ''}`}>
      {blocks.map((block, i) => {
        if (block.type === 'divider') {
          return <View key={i} className='md-divider' />
        }
        if (block.type === 'heading') {
          return (
            <View key={i} className={`md-heading md-heading--${block.level}`}>
              <InlineRender text={block.content} />
            </View>
          )
        }
        if (block.type === 'ul-item') {
          return (
            <View key={i} className='md-list-item'>
              <Text className='md-list-dot'>•</Text>
              <View className='md-list-text'>
                <InlineRender text={block.content} />
              </View>
            </View>
          )
        }
        if (block.type === 'ol-item') {
          return (
            <View key={i} className='md-list-item md-list-item--ol'>
              <Text className='md-list-num'>{block.index}.</Text>
              <View className='md-list-text'>
                <InlineRender text={block.content} />
              </View>
            </View>
          )
        }
        if (block.type === 'table' && block.headers && block.rows) {
          return (
            <View key={i} className='md-table-wrap'>
              <View className='md-table'>
                {/* Header row */}
                <View className='md-table-row md-table-row--header'>
                  {block.headers.map((h, hi) => (
                    <View key={hi} className='md-table-cell md-table-cell--header'>
                      <Text className='md-table-header-text'>
                        <InlineRender text={h} />
                      </Text>
                    </View>
                  ))}
                </View>
                {/* Body rows */}
                {block.rows.map((row, ri) => (
                  <View key={ri} className={`md-table-row ${ri % 2 === 1 ? 'md-table-row--striped' : ''}`}>
                    {row.map((cell, ci) => (
                      <View key={ci} className='md-table-cell'>
                        <Text className='md-table-cell-text'>
                          <InlineRender text={cell} />
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )
        }
        // paragraph
        return (
          <View key={i} className='md-paragraph'>
            <InlineRender text={block.content} />
          </View>
        )
      })}
    </View>
  )
}
