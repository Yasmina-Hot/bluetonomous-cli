import React, { useCallback, useRef, useState } from 'react'
import { Box, Text, render, useApp, useInput } from 'ink'
import type { Message, ProviderAdapter } from '../providers/types.js'

type ChatTuiOptions = {
  adapter: ProviderAdapter
  model: string
  system?: string
  temperature?: number
  maxTokens?: number
  stream: boolean
}

type ChatEntry = {
  id: number
  role: 'user' | 'assistant'
  content: string
}

export async function runChatTui(options: ChatTuiOptions): Promise<void> {
  const instance = render(<ChatTui {...options} />)
  await instance.waitUntilExit()
}

function ChatTui({ adapter, model, system, temperature, maxTokens, stream }: ChatTuiOptions) {
  const { exit } = useApp()
  const [draft, setDraft] = useState('')
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesRef = useRef<Message[]>([])
  const nextId = useRef(1)

  const submit = useCallback(async () => {
    const prompt = draft.trim()
    if (!prompt || busy) return

    if (prompt === '/exit' || prompt === '/quit') {
      exit()
      return
    }

    if (prompt === '/clear') {
      messagesRef.current = []
      setEntries([])
      setDraft('')
      setError(null)
      return
    }

    setDraft('')
    setBusy(true)
    setError(null)

    const userMessage: Message = { role: 'user', content: prompt }
    const requestMessages = [...messagesRef.current, userMessage]
    messagesRef.current = requestMessages

    const userEntry: ChatEntry = { id: nextId.current++, role: 'user', content: prompt }
    const assistantId = nextId.current++
    setEntries((current) => [
      ...current,
      userEntry,
      { id: assistantId, role: 'assistant', content: '' },
    ])

    try {
      let assistantText = ''

      if (stream) {
        for await (const chunk of adapter.streamText({
          model,
          messages: requestMessages,
          system,
          temperature,
          maxTokens,
        })) {
          if (chunk.type === 'text' && chunk.text) {
            assistantText += chunk.text
            setEntries((current) =>
              current.map((entry) =>
                entry.id === assistantId ? { ...entry, content: assistantText } : entry,
              ),
            )
          }
        }
      } else {
        const result = await adapter.generateText({
          model,
          messages: requestMessages,
          system,
          temperature,
          maxTokens,
        })
        assistantText = result.text
        setEntries((current) =>
          current.map((entry) =>
            entry.id === assistantId ? { ...entry, content: assistantText } : entry,
          ),
        )
      }

      messagesRef.current = [...requestMessages, { role: 'assistant', content: assistantText }]
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setEntries((current) => current.filter((entry) => entry.id !== assistantId))
    } finally {
      setBusy(false)
    }
  }, [adapter, busy, draft, exit, maxTokens, model, stream, system, temperature])

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit()
      return
    }

    if (busy) return

    if (key.return) {
      void submit()
      return
    }

    if (key.backspace || key.delete) {
      setDraft((current) => current.slice(0, -1))
      return
    }

    if (input && !key.ctrl && !key.meta) {
      setDraft((current) => current + input)
    }
  })

  const visibleEntries = entries.slice(-10)
  const status = busy ? 'thinking' : 'ready'

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={1}>
        <Text color="cyanBright">bluetonomous</Text>
        <Text color="gray">  {adapter.config.displayName} / {model}  </Text>
        <Text color={busy ? 'yellow' : 'green'}>{status}</Text>
      </Box>

      <Box flexDirection="column" minHeight={10}>
        {visibleEntries.length === 0 ? (
          <Box marginY={1}>
            <Text color="gray">No messages yet.</Text>
          </Box>
        ) : (
          visibleEntries.map((entry) => <MessageBlock key={entry.id} entry={entry} busy={busy} />)
        )}
      </Box>

      {error ? (
        <Box borderStyle="single" borderColor="red" paddingX={1} marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      ) : null}

      <Box borderStyle="single" borderColor={busy ? 'gray' : 'green'} paddingX={1}>
        <Text color={busy ? 'gray' : 'green'}>You </Text>
        <Text>{draft}</Text>
        {!busy ? <Text inverse> </Text> : null}
      </Box>
    </Box>
  )
}

function MessageBlock({ entry, busy }: { entry: ChatEntry; busy: boolean }) {
  const isUser = entry.role === 'user'
  const label = isUser ? 'You' : 'Assistant'
  const color = isUser ? 'green' : 'blue'
  const content = entry.content || (busy && !isUser ? '...' : '')

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={color}>{label}</Text>
      <Text wrap="wrap">{content}</Text>
    </Box>
  )
}
