import type { ProviderAdapter } from './types.js'

class ProviderRegistry {
  private adapters = new Map<string, ProviderAdapter>()

  register(id: string, adapter: ProviderAdapter): void {
    this.adapters.set(id, adapter)
  }

  get(id: string): ProviderAdapter | undefined {
    return this.adapters.get(id)
  }

  list(): Array<{ id: string; adapter: ProviderAdapter }> {
    return [...this.adapters.entries()].map(([id, adapter]) => ({ id, adapter }))
  }

  has(id: string): boolean {
    return this.adapters.has(id)
  }

  remove(id: string): void {
    this.adapters.delete(id)
  }
}

export const providerRegistry = new ProviderRegistry()
