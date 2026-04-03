import '@testing-library/jest-dom/vitest';

// ResizeObserver is not available in jsdom — provide a no-op stub
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
