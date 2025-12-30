import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use relative paths so it works on Amplify/S3/CloudFront even if not hosted at domain root
  base: './',
})
