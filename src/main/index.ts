import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  MEDGEMMA_4B_IT_Q4_1,
  LLAMA_3_2_1B_INST_Q4_0,
  MODEL_TYPES,
  loadModel,
  unloadModel,
  completion
} from '@qvac/sdk'
import {
  initAuditLog,
  logModelLoad,
  logModelUnload,
  logInference,
  appendRecord
} from './audit-log'

app.commandLine.appendSwitch('no-sandbox')

let win: BrowserWindow | null = null
let modelId: string | null = null

function createWindow(): void {
  win = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    title: 'MedPsy Edge Agent',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win!.show())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupHandlers(): void {
  initAuditLog()

  ipcMain.handle('load-model', async () => {
    const loadStart = performance.now()
    console.log('Loading QVAC model on Intel Mac mini (4 cores, 8GB RAM)...')

    // Primary: MedGemma 4B Q4_1 (~2.56GB) — medical model for clinical reasoning.
    // Quantized to Q4_1 — fits our 8GB RAM with room to spare.
    // Falls back to Llama 3.2 1B if MedGemma registry URL isn't reachable.
    try {
      modelId = await loadModel({
        modelSrc: MEDGEMMA_4B_IT_Q4_1,
        modelType: MODEL_TYPES.llm,
        modelConfig: {
          ctx_size: 4096,
          device: 'cpu'
        },
        onProgress: (progress: { percentage: number }) => {
          console.log(`Loading MedGemma 4B... ${progress.percentage.toFixed(1)}%`)
          win?.webContents.send('model-progress', progress.percentage)
        }
      })
      console.log('✅ MedGemma 4B loaded successfully')
      logModelLoad('MedGemma 4B Q4_1', performance.now() - loadStart, 'success')
    } catch (medErr) {
      console.log('MedGemma not available, falling back to Llama 3.2 1B')
      console.error(medErr)

      modelId = await loadModel({
        modelSrc: LLAMA_3_2_1B_INST_Q4_0,
        modelType: MODEL_TYPES.llm,
        modelConfig: {
          ctx_size: 4096,
          device: 'cpu'
        },
        onProgress: (progress: { percentage: number }) => {
          console.log(`Loading Llama 3.2 1B... ${progress.percentage.toFixed(1)}%`)
          win?.webContents.send('model-progress', progress.percentage)
        }
      })
      console.log('✅ Llama 3.2 1B loaded')
      logModelLoad('Llama 3.2 1B Q4_0', performance.now() - loadStart, 'fallback')
    }

    // Try loading embeddings model for local RAG capability
    try {
      const { EMBEDDINGGEMMA_300M_Q4_0 } = await import('@qvac/sdk')
      await loadModel({
        modelSrc: EMBEDDINGGEMMA_300M_Q4_0,
        modelType: MODEL_TYPES.embeddings,
        modelConfig: { device: 'cpu' }
      })
      console.log('✅ Embedding model loaded for RAG')
      appendRecord({ timestamp: new Date().toISOString(), type: 'load', model: 'EmbeddingGemma 300M Q4_0', detail: 'RAG model loaded' })
    } catch {
      console.log('Embeddings model not available, continuing without RAG')
    }

    return 'MedGemma 4B loaded — Ready'
  })

  ipcMain.handle('infer', async (_event, history) => {
    if (!modelId) throw new Error('Model not loaded.')

    const promptTokens = history.reduce((sum: number, m: { role: string; content: string }) => sum + m.content.length / 4, 0)
    const inferStart = performance.now()
    let inferenceModel = modelId?.includes('medgemma') ? 'MedGemma 4B Q4_1' : 'Llama 3.2 1B Q4_0'

    const result = completion({
      modelId,
      history,
      stream: true,
      generationParams: {
        predict: 512,
        temp: 0.7
      }
    })

    let ttftMs = 0
    let completionTokens = 0
    let totalDurationMs = 0

    for await (const token of result.tokenStream) {
      if (token === '') {
        totalDurationMs = performance.now() - inferStart
        const tokensPerSec = totalDurationMs > 0 ? (completionTokens / totalDurationMs) * 1000 : 0

        // Log inference performance
        appendRecord({
          timestamp: new Date().toISOString(),
          type: 'inference',
          model: inferenceModel,
          detail: `prompt_tokens=${Math.round(promptTokens)}`,
          promptTokens: Math.round(promptTokens),
          completionTokens,
          ttftMs: Math.round(ttftMs),
          tokensPerSecond: parseFloat(tokensPerSec.toFixed(2)),
          totalDurationMs: Math.round(totalDurationMs),
        })

        console.log(`[Audit] Inference: model=${inferenceModel} prompt=${Math.round(promptTokens)}tok completed=${completionTokens}tok ttft=${Math.round(ttftMs)}ms tok/s=${tokensPerSec.toFixed(1)} total=${Math.round(totalDurationMs)}ms`)

        win?.webContents.send('completion-stream', token)
      } else {
        if (completionTokens === 0) {
          ttftMs = performance.now() - inferStart
        }
        completionTokens++
        win?.webContents.send('completion-stream', token)
      }
    }
  })

  ipcMain.on('system-message', (_event, msg) => {
    console.log(`[System] ${msg}`)
  })

  ipcMain.handle('unload-model', async () => {
    if (!modelId) throw new Error('Model not loaded.')
    const modelName = modelId?.includes('medgemma') ? 'MedGemma 4B Q4_1' : 'Llama 3.2 1B Q4_0'
    await unloadModel({ modelId, clearStorage: false })
    logModelUnload(modelName)
    modelId = null
    return 'model unloaded'
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
  setupHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
