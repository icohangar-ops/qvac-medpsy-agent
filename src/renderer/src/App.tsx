import { useEffect, useRef, useState } from 'react'

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  agent?: string
}

type AgentType = 'diagnostic' | 'research' | 'wellness' | 'orchestrator'

const AGENTS: { key: AgentType; label: string; emoji: string; description: string }[] = [
  {
    key: 'orchestrator',
    label: 'Agent Orchestrator',
    emoji: '🧠',
    description: 'Routes queries to the right specialist agent'
  },
  {
    key: 'diagnostic',
    label: 'Diagnostic Agent',
    emoji: '🩺',
    description: 'Analyzes symptoms and suggests possible conditions'
  },
  {
    key: 'research',
    label: 'Medical Research Agent',
    emoji: '🔬',
    description: 'Retrieves medical knowledge via local RAG'
  },
  {
    key: 'wellness',
    label: 'Wellness Agent',
    emoji: '🌿',
    description: 'Provides preventive health and wellness guidance'
  }
]

function App(): React.JSX.Element {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [activeAgent, setActiveAgent] = useState<AgentType>('orchestrator')
  const [modelStatus, setModelStatus] = useState('Loading model…')
  const [modelProgress, setModelProgress] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.qvacAPI.loadModel().then((status) => {
      setModelStatus(status)
      setLoading(false)
    })

    window.qvacAPI.onCompletionStream((token: string) => {
      if (token === '') {
        setProcessing(false)
      } else {
        setMessages(prev => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1].content += token
          }
          return updated
        })
      }
    })

    window.qvacAPI.onModelProgress((pct: number) => {
      setModelProgress(pct)
    })

    return () => { window.qvacAPI.unloadModel() }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (): void => {
    if (!input.trim() || processing || loading) return

    const userMsg: Message = { role: 'user', content: input, agent: activeAgent }
    const nextHistory = [...messages, userMsg]

    setMessages([...nextHistory, { role: 'assistant', content: '', agent: activeAgent }])

    const systemPrompt = getSystemPrompt(activeAgent)
    window.qvacAPI.infer([
      { role: 'system', content: systemPrompt },
      ...nextHistory.map(m => ({ role: m.role, content: m.content }))
    ])
    setInput('')
    setProcessing(true)
  }

  const getSystemPrompt = (agent: AgentType): string => {
    switch (agent) {
      case 'diagnostic':
        return 'You are a diagnostic medical AI assistant powered by QVAC MedGemma. ' +
          'Analyze symptoms carefully. List possible conditions from most to least likely. ' +
          'Always include a disclaimer that this is not medical advice. ' +
          'Ask clarifying questions about duration, severity, and associated symptoms. ' +
          'Keep responses concise and structured with bullet points.'
      case 'research':
        return 'You are a medical research assistant powered by QVAC MedGemma. ' +
          'Answer questions about medical conditions, treatments, and research. ' +
          'Cite specific medical knowledge when possible. ' +
          'Keep responses factual and evidence-based. ' +
          'Always include appropriate medical disclaimers.'
      case 'wellness':
        return 'You are a wellness and preventive health coach powered by QVAC MedGemma. ' +
          'Provide guidance on nutrition, exercise, sleep, stress management. ' +
          'Keep advice practical and actionable. ' +
          'Encourage healthy habits without being prescriptive. ' +
          'Always include appropriate health disclaimers.'
      case 'orchestrator':
      default:
        return 'You are a medical AI orchestrator. For symptom analysis, recommend using the Diagnostic Agent (🩺). ' +
          'For medical research questions, recommend the Research Agent (🔬). ' +
          'For wellness/preventive health, recommend the Wellness Agent (🌿). ' +
          'Answer general questions yourself but route specialized queries. ' +
          'Keep responses concise and helpful.'
    }
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧬</span>
          <h1 className="text-base font-semibold">MedPsy Edge Agent</h1>
        </div>
        <span className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
          <span className={`inline-block w-2 h-2 rounded-full ${
            loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
          }`} />
          {loading ? `Loading... ${modelProgress.toFixed(0)}%` : modelStatus}
        </span>
      </header>

      {/* Agent Switcher */}
      <div className="flex gap-1.5 px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 overflow-x-auto">
        {AGENTS.map(a => (
          <button
            key={a.key}
            onClick={() => setActiveAgent(a.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeAgent === a.key
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            <span>{a.emoji}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Agent context bar */}
      <div className="px-4 py-1.5 bg-zinc-900/30 border-b border-zinc-800/50">
        <p className="text-xs text-zinc-500">
          Active Agent: <span className="text-indigo-400">{AGENTS.find(a => a.key === activeAgent)?.emoji} {AGENTS.find(a => a.key === activeAgent)?.label}</span>
          &nbsp;— {AGENTS.find(a => a.key === activeAgent)?.description}
        </p>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <span className="text-4xl mb-3">🧬</span>
            <p className="text-sm font-medium">MedPsy Edge Agent</p>
            <p className="text-xs mt-1">Running locally on QVAC SDK with MedGemma 4B</p>
            <p className="text-xs mt-4 text-zinc-700">Ask a health question or switch agents above</p>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center h-full flex-col gap-3">
            <span className="text-3xl">🧬</span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-xs text-zinc-500 mt-2">Downloading MedGemma 4B model ({modelProgress.toFixed(0)}%)</p>
            <div className="w-48 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${modelProgress}%` }}
              />
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : msg.role === 'system'
                    ? 'bg-zinc-800/50 text-zinc-400 italic rounded-bl-md text-xs'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
                }`}
              >
                {msg.agent && msg.role === 'assistant' && (
                  <div className="text-xs text-indigo-400 mb-1">
                    {AGENTS.find(a => a.key === msg.agent)?.emoji} {AGENTS.find(a => a.key === msg.agent)?.label}
                  </div>
                )}
                {msg.content || (
                  <span className="text-zinc-500 italic animate-pulse">Streaming response…</span>
                )}
              </div>
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </main>

      {/* Status Bar */}
      <div className="px-4 py-1 bg-zinc-900/30 border-t border-zinc-800/30">
        <div className="flex gap-4 text-[10px] text-zinc-600">
          <span>📚 RAG: Medical Knowledge Base</span>
          <span>🔒 All local — no data leaves device</span>
          <span>⚡ QVAC Fabric v1</span>
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <div className="flex gap-3">
          <textarea
            className="flex-1 resize-none rounded-xl bg-zinc-800 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500/50"
            rows={1}
            placeholder={`Ask ${AGENTS.find(a => a.key === activeAgent)?.label}…`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={loading || processing}
          />
          <button
            onClick={handleSend}
            disabled={loading || processing || !input.trim()}
            className="self-end rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
