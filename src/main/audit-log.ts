/**
 * Inference Audit Logger
 * Captures model loads/unloads and inference performance metrics
 * for hackathon reproducibility requirements.
 *
 * Output: audit-log.json — structured JSON log
 * Metrics: prompt tokens, completion tokens, TTFT (ms), tokens/sec
 */

import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

interface InferenceRecord {
  timestamp: string
  type: 'load' | 'unload' | 'inference'
  model?: string
  detail?: string
  promptTokens?: number
  completionTokens?: number
  ttftMs?: number          // Time to first token
  tokensPerSecond?: number
  totalDurationMs?: number
}

const LOG_PATH = join(app.getPath('userData'), 'audit-log.json')
const MAX_BACKUPS = 3

export function initAuditLog(): void {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  // Rotate if too big (>1MB)
  if (existsSync(LOG_PATH)) {
    const size = require('fs').statSync(LOG_PATH).size
    if (size > 1_000_000) {
      for (let i = MAX_BACKUPS - 1; i >= 0; i--) {
        const old = `${LOG_PATH}.${i}`
        const newer = `${LOG_PATH}.${i + 1}`
        if (existsSync(old)) require('fs').renameSync(old, newer)
      }
      require('fs').renameSync(LOG_PATH, `${LOG_PATH}.1`)
    }
  }

  appendRecord({
    timestamp: new Date().toISOString(),
    type: 'load',
    detail: 'Application started',
  })
}

export function appendRecord(record: InferenceRecord): void {
  try {
    const entries: InferenceRecord[] = []
    if (existsSync(LOG_PATH)) {
      const raw = require('fs').readFileSync(LOG_PATH, 'utf-8').trim()
      if (raw) entries.push(...JSON.parse(raw))
    }
    entries.push(record)

    // Keep last 500 entries max
    const trimmed = entries.length > 500 ? entries.slice(-500) : entries
    writeFileSync(LOG_PATH, JSON.stringify(trimmed, null, 2))
  } catch (err) {
    console.error('[AuditLog] write error:', err)
  }
}

export function logModelLoad(modelName: string, durationMs: number, status: 'success' | 'fallback' | 'error'): void {
  appendRecord({
    timestamp: new Date().toISOString(),
    type: 'load',
    model: modelName,
    detail: `status=${status}, duration=${durationMs}ms`,
  })
}

export function logModelUnload(modelName: string): void {
  appendRecord({
    timestamp: new Date().toISOString(),
    type: 'unload',
    model: modelName,
    detail: 'Model unloaded',
  })
}

// Wrap the inference call to capture performance metrics
export async function logInference(
  promptTokens: number,
  onPerformance: (metrics: { ttftMs: number; totalMs: number; tokensPerSec: number }) => void,
  fn: () => AsyncGenerator<string, void, unknown>
): Promise<AsyncGenerator<string, void, unknown>> {
  const startTime = performance.now()
  let firstTokenTime = 0
  let tokensReceived = 0
  let model = ''

  const wrappedGenerator = {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<string, void>> {
          const result = await fn().next()

          if (result.done) {
            const totalDurationMs = performance.now() - startTime
            const ttftMs = firstTokenTime > 0 ? firstTokenTime - startTime : totalDurationMs
            const tokensPerSec = totalDurationMs > 0 ? (tokensReceived / totalDurationMs) * 1000 : 0

            onPerformance({
              ttftMs,
              totalMs: totalDurationMs,
              tokensPerSec: parseFloat(tokensPerSec.toFixed(1)),
            })

            return { value: '' as any, done: true }
          }

          if (tokensReceived === 0) {
            firstTokenTime = performance.now()
          }
          tokensReceived++

          return { value: result.value, done: false }
        }
      }
    }
  }

  return wrappedGenerator as any
}
