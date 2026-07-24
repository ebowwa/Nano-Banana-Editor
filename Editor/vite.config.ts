import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { execSync } from 'child_process';

export default defineConfig(({ mode }) => {
    // Load from .env files first
    const env = loadEnv(mode, '.', '');
    
    // Try to get values from Doppler if available
    let dopplerEnv = {};
    try {
      const dopplerOutput = execSync('doppler secrets download --no-file --format json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
      });
      dopplerEnv = JSON.parse(dopplerOutput);
    } catch (e) {
      // Doppler not configured or not available, fall back to .env files
      console.log('Using local .env files (Doppler not configured or available)');
    }
    
    // Merge environments - Doppler takes precedence if available
    const finalEnv = {
      GEMINI_API_KEY: dopplerEnv.GEMINI_API_KEY || env.GEMINI_API_KEY,
      GOOGLE_CLIENT_ID: dopplerEnv.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID,
      API_KEY: dopplerEnv.API_KEY || env.API_KEY || dopplerEnv.GOOGLE_API_KEY || env.GOOGLE_API_KEY
    };
    
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(finalEnv.API_KEY || finalEnv.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(finalEnv.GEMINI_API_KEY),
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(finalEnv.GOOGLE_CLIENT_ID)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
