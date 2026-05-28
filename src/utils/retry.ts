export interface RetryOptions {
  maxAttempts: number
  initialDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const { maxAttempts, initialDelayMs = 1000, maxDelayMs = 30_000, shouldRetry } = opts
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === maxAttempts) break
      if (shouldRetry && !shouldRetry(err, attempt)) break

      const delay = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs)
      const jitter = Math.random() * 200
      await sleep(delay + jitter)
    }
  }

  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
