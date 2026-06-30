import '@testing-library/jest-dom'

// Mock import.meta.env for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_VAPID_PUBLIC_KEY: '',
    VITE_SENTRY_DSN: '',
    MODE: 'test',
  },
  writable: true,
})

// Suppress console errors in tests for known mocked modules
const originalError = console.error
console.error = (...args) => {
  if (args[0]?.includes?.('Warning: ReactDOM.render') ||
      args[0]?.includes?.('act(...)')) return
  originalError(...args)
}
