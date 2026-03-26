/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  mutate: [
    'src/stores/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  reporters: ['html', 'progress', 'clear-text'],
  htmlReporter: {
    fileName: '../_bmad-output/mutation-reports/frontend/index.html',
  },
  thresholds: {
    high: 80,
    low: 60,
    break: null,
  },
  timeoutMS: 15000,
  timeoutFactor: 1.5,
  disableTypeChecks: true,
  vitest: {
    configFile: 'vitest.config.ts',
  },
}
