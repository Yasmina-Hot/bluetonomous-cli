import Conf from 'conf'
import { type AppConfig } from './schema.js'
import { DEFAULT_CONFIG } from './defaults.js'

let _instance: ConfigManager | null = null

export class ConfigManager {
  private store: Conf<AppConfig>

  private constructor() {
    // conf uses JSON Schema (AJV) not Zod — skip runtime schema validation here
    // Zod validation happens at read time when needed
    this.store = new Conf<AppConfig>({
      projectName: 'bluetonomous',
      defaults: DEFAULT_CONFIG as AppConfig,
    })
  }

  static getInstance(): ConfigManager {
    if (!_instance) _instance = new ConfigManager()
    return _instance
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.store.get(key) as AppConfig[K]
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value)
  }

  getAll(): AppConfig {
    return this.store.store as AppConfig
  }

  reset(key?: keyof AppConfig): void {
    if (key) {
      this.store.delete(key)
    } else {
      this.store.clear()
    }
  }

  get configPath(): string {
    return this.store.path
  }
}

export const config = ConfigManager.getInstance()
