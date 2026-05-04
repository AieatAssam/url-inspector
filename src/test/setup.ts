import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
