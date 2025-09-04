import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Removed debug console logs for CI/production cleanliness

const ENV_PATH = path.resolve(__dirname, '.env');

export default defineConfig({
  plugins: [
    react(),
  //  ViteRestart({ restart: ['.env'] }),

    {
      name: 'custom-env-middleware',
      configureServer(server) {
        server.middlewares.use('/api/config', async (req, res, next) => {
          try {
            if (req.method === 'GET') {
              const current = dotenv.parse(fs.readFileSync(ENV_PATH));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(current));

            } else if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });

              req.on('end', () => {
                try {
                  const data = JSON.parse(body);

                  const existing = dotenv.parse(fs.readFileSync(ENV_PATH));

                  const merged = { ...existing, ...data };
                  const mergedContent = Object.entries(merged)
                    .map(([key, val]) => `${key}=${val}`)
                    .join('\n');

                  const tempPath = `${ENV_PATH}.tmp`;

                  try {
                    fs.writeFileSync(tempPath, mergedContent);

                    setTimeout(() => {
                      try {
                        fs.renameSync(tempPath, ENV_PATH);

                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ status: 'saved' }));

                      } catch (renameErr) {
                        res.statusCode = 500;
                        res.end('Rename error');
                      }
                    }, 200); // Delay to let Vite settle

                  } catch (writeErr) {
                    res.statusCode = 500;
                    res.end('Write error');
                  }

                } catch (parseErr) {
                  res.statusCode = 400;
                  res.end('Invalid JSON');
                }
              });

            } else {
              next();
            }

          } catch (error) {
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        });
      }
    }
  ],

  define: {
    'process.env.AZURE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_AZURE_OPENAI_API_KEY || ''),
    'process.env.AZURE_OPENAI_ENDPOINT': JSON.stringify(process.env.VITE_AZURE_OPENAI_ENDPOINT || ''),
    'process.env.AZURE_OPENAI_API_VERSION': JSON.stringify(process.env.VITE_AZURE_OPENAI_API_VERSION || ''),
    'import.meta.env.VITE_AZURE_OPENAI_MODEL': JSON.stringify(process.env.VITE_AZURE_OPENAI_MODEL || ''),
  },

  server: {
    port: 5173,
    host: true,
    allowedHosts: ['app-codepulseai.thepsi.com']
  }
});
