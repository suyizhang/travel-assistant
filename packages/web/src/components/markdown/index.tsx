import { View, Text } from '@tarojs/components'
import { useMemo } from 'react'
import './index.less'

interface MarkdownProps {
  content: string
  className?: string
}

interface InlineNode {
  type: 'text' | 'bold' | 'italic' | 'code'
  text: string
}

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  // Match **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    if (match[2]) {
      nodes.push({ type: 'bold', text: match[2] })
    } else if (match[4]) {
      nodes.push({ type: 'italic', text: match[4] })
    } else if (match[6]) {
      nodes.push({ type: 'code', text: match[6] })
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }
  return nodes
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
        return <Text key={i}>{node.text}</Text>
      })}
    </>
  )
}

interface Block {
  type: 'paragraph' | 'heading' | 'list-item' | 'divider'
  level?: number
  content: string
}

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', content: paragraph.join('\n') })
      paragraph = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '') {
      flushParagraph()
      continue
    }

    if (trimmed === '---' || trimmed === '***') {
      flushParagraph()
      blocks.push({ type: 'divider', content: '' })
      continue
    }

    // Headings: ### heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      })
      continue
    }

    // List items: - item or * item or 1. item
    const listMatch = trimmed.match(/^[-*]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      blocks.push({ type: 'list-item', content: listMatch[1] })
      continue
    }

    paragraph.push(trimmed)
  }

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
        if (block.type === 'list-item') {
          return (
            <View key={i} className='md-list-item'>
              <Text className='md-list-dot'>•</Text>
              <View className='md-list-text'>
                <InlineRender text={block.content} />
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
