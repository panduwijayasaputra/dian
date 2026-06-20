import '@testing-library/jest-dom'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach } from 'vitest'

// Provide a fresh IndexedDB for every test file
beforeEach(() => {
  global.indexedDB = new IDBFactory()
})
