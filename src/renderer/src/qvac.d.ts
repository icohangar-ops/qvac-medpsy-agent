export {}

declare global {
  interface Window {
    qvacAPI: {
      loadModel: () => Promise<string>
      infer: (history: { role: string; content: string }[]) => Promise<void>
      onCompletionStream: (cb: (token: string) => void) => void
      onModelProgress: (cb: (pct: number) => void) => void
      unloadModel: () => Promise<string>
    }
  }
}
