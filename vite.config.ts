import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

console.log('🚀 vite.config.ts is being loaded...');

const ENV_PATH = path.resolve(__dirname, '.env');

export default defineConfig({
  plugins: [
    react(),
  //  ViteRestart({ restart: ['.env'] }),

    {
      name: 'custom-env-middleware',
      configureServer(server) {
        console.log('🛠️ Middleware attached');

        server.middlewares.use('/api/config', async (req, res, next) => {
          try {
            console.log(`➡️  Incoming ${req.method} request on /api/config`);

            if (req.method === 'GET') {
              console.log('📥 Handling GET /api/config');
              const current = dotenv.parse(fs.readFileSync(ENV_PATH));
              console.log('📤 Current .env:', current);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(current));

            } else if (req.method === 'POST') {
              console.log('📥 Handling POST /api/config');

              let body = '';
              req.on('data', chunk => {
                body += chunk;
                console.log('📦 Receiving chunk:', chunk.toString());
              });

              req.on('end', () => {
                console.log('📨 Full body received:', body);

                try {
                  const data = JSON.parse(body);
                  console.log('🔧 Parsed data from client:', data);

                  const existing = dotenv.parse(fs.readFileSync(ENV_PATH));
                  console.log('🧾 Existing .env:', existing);

                  const merged = { ...existing, ...data };
                  const mergedContent = Object.entries(merged)
                    .map(([key, val]) => `${key}=${val}`)
                    .join('\n');

                  const tempPath = `${ENV_PATH}.tmp`;
                  console.log('🛠️ Writing to temp .env file:', tempPath);

                  try {
                    fs.writeFileSync(tempPath, mergedContent);
                    console.log('✅ Temp file written successfully.');

                    setTimeout(() => {
                      try {
                        fs.renameSync(tempPath, ENV_PATH);
                        console.log('✅ .env safely renamed → Restart will follow.');

                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ status: 'saved' }));

                      } catch (renameErr) {
                        console.error('🛑 Rename failed:', renameErr);
                        res.statusCode = 500;
                        res.end('Rename error');
                      }
                    }, 200); // Delay to let Vite settle

                  } catch (writeErr) {
                    console.error('🛑 Temp write failed:', writeErr);
                    res.statusCode = 500;
                    res.end('Write error');
                  }

                } catch (parseErr) {
                  console.error('🛑 JSON parse error:', parseErr);
                  res.statusCode = 400;
                  res.end('Invalid JSON');
                }
              });

            } else {
              console.warn(`⚠️ Unhandled HTTP method: ${req.method}`);
              next();
            }

          } catch (error) {
            console.error('🛑 Middleware Error:', error);
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
