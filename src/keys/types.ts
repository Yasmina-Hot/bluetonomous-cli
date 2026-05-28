export type StorageBackend = 'keychain' | 'encrypted-file' | 'env'

export interface KeyEntry {
  providerId: string
  value: string
  backend: StorageBackend
}

export interface KeyBackend {
  get(providerId: string): Promise<string | null>
  set(providerId: string, value: string): Promise<void>
  delete(providerId: string): Promise<void>
  list(): Promise<string[]>
  isAvailable(): Promise<boolean>
}
