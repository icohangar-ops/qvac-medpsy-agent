import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('qvacAPI', {
  loadModel: (): Promise<string> => ipcRenderer.invoke('load-model'),
  infer: (history: { role: string; content: string }[]): Promise<void> =>
    ipcRenderer.invoke('infer', history),
  onCompletionStream: (cb: (token: string) => void): void => {
    ipcRenderer.on('completion-stream', (_event, token) => cb(token))
  },
  onModelProgress: (cb: (pct: number) => void): void => {
    ipcRenderer.on('model-progress', (_event, pct) => cb(pct))
  },
  unloadModel: (): Promise<string> => ipcRenderer.invoke('unload-model')
})
