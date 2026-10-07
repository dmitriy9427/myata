/**
 * Vite + React. На GitHub Pages приложение живёт в подпапке /myata/ — её
 * передаёт сборка в Actions через BASE_URL; локально — с корня.
 */
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: process.env.BASE_URL ?? '/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // host: true — dev-сервер доступен с телефона в той же Wi-Fi-сети.
  server: { port: 5193, host: true },
  plugins: [react()],
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
})
