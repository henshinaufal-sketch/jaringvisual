import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: './tests',
  testMatch: 'local-file.spec.ts',
  outputDir: 'test-results/portable',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    offline: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {},
    trace: 'retain-on-failure',
  },
});
