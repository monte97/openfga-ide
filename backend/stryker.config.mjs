/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/server.ts',
    '!src/logger.ts',
  ],
  reporters: ['html', 'progress', 'clear-text'],
  htmlReporter: {
    fileName: '../_bmad-output/mutation-reports/backend/index.html',
  },
  thresholds: {
    high: 80,
    low: 60,
    break: null,
  },
  timeoutMS: 10000,
  timeoutFactor: 1.5,
  disableTypeChecks: true,
}
