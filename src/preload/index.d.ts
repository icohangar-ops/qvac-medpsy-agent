import type { AgentType } from './index'

declare global {
  interface Window {
    qvacAPI: {
      loadModel: () => Promise<string>
      infer: (history: { role: string; content: string }[]) => Promise<void>
      onCompletionStream: (cb: (token: string) => void) => void
      onAgentSwitch: (cb: (agent: AgentType) => void) => void
      addSystemMessage: (msg: string) => void
      unloadModel: () => Promise<string>
    }
  }
}

export {}
