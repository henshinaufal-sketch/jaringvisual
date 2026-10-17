import { defineConfig } from '@playwright/test';
import localConfig from './playwright.local.config';

export default defineConfig({ ...localConfig, metadata: { directFile: true } });
