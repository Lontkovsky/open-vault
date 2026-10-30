import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const names = ['VITE_IDENTITY_ORIGIN', 'VITE_BALLOT_ORIGIN', 'VITE_MANAGEMENT_ORIGIN'] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  for (const name of names) {
    const value = env[name];
    if (value === undefined) throw new Error(`${name} is required`);
    const parsed = new URL(value);
    if (parsed.origin !== value || !['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${name} must be an exact HTTP origin`);
    if (mode === 'production' && parsed.protocol !== 'https:') throw new Error(`${name} must use HTTPS in production`);
  }
  return { plugins: [react()], build: { sourcemap: false, target: 'es2023' },
    server: { headers: { 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' } } };
});
