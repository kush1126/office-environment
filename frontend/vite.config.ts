import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const aiImagePlugin = () => ({
  name: 'ai-image-generator',
  configureServer(server: any) {
    // 1. Horde Community Diffusion Endpoint
    server.middlewares.use('/ai-engine/horde', async (req: any, res: any) => {
      try {
        const reqUrl = new URL(req.url, 'http://localhost:3000');
        const prompt = reqUrl.searchParams.get('prompt') || 'medical syringe on white background';
        const width = parseInt(reqUrl.searchParams.get('width') || '512');
        const height = parseInt(reqUrl.searchParams.get('height') || '512');

        const submitRes = await fetch('https://aihorde.net/api/v2/generate/async', {
          method: 'POST',
          headers: {
            'apikey': '0000000000',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            params: {
              steps: 25,
              width: Math.min(width, 512),
              height: Math.min(height, 512),
              sampler_name: 'k_euler',
              cfg_scale: 7.5
            }
          })
        });

        if (!submitRes.ok) {
          res.statusCode = 502;
          return res.end(JSON.stringify({ error: 'AI Horde cluster queue is currently full' }));
        }

        const submitData = await submitRes.json();
        const jobId = submitData.id;
        if (!jobId) {
          res.statusCode = 502;
          return res.end(JSON.stringify({ error: 'Could not obtain AI Horde job ID' }));
        }

        // Poll for up to 40 seconds
        let imgBuffer: ArrayBuffer | null = null;
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const statusRes = await fetch(`https://aihorde.net/api/v2/generate/status/${jobId}`);
          if (statusRes.ok) {
            const data = await statusRes.json();
            if (data.done && data.generations && data.generations.length > 0) {
              const imgUrl = data.generations[0].img;
              const imgRes = await fetch(imgUrl);
              if (imgRes.ok) {
                imgBuffer = await imgRes.arrayBuffer();
                break;
              }
            }
          }
        }

        if (imgBuffer) {
          res.setHeader('Content-Type', 'image/webp');
          res.statusCode = 200;
          return res.end(Buffer.from(imgBuffer));
        }

        res.statusCode = 504;
        return res.end(JSON.stringify({ error: 'AI Horde generation timed out' }));
      } catch (err: any) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err.message }));
      }
    });

    // 2. Direct AI Image Synthesis Fallback
    server.middlewares.use('/ai-engine/generate', async (req: any, res: any) => {
      try {
        const reqUrl = new URL(req.url, 'http://localhost:3000');
        const prompt = reqUrl.searchParams.get('prompt') || 'pharmaceutical injection syringe';
        const width = reqUrl.searchParams.get('width') || '1024';
        const height = reqUrl.searchParams.get('height') || '576';
        const seed = reqUrl.searchParams.get('seed') || Math.floor(Math.random() * 1000000).toString();

        const cleanPrompt = prompt.slice(0, 350).trim();
        const targetUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 75000);
        const upstream = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (upstream.ok) {
          const buffer = await upstream.arrayBuffer();
          res.setHeader('Content-Type', 'image/jpeg');
          res.statusCode = 200;
          return res.end(Buffer.from(buffer));
        }

        res.statusCode = 502;
        return res.end(JSON.stringify({ error: 'Image synthesis service unavailable' }));
      } catch (err: any) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
  }
});

export default defineConfig({
  base: './',
  plugins: [react(), aiImagePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          monaco: ['@monaco-editor/react'],
        },
      },
    },
  },
})
