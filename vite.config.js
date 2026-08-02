import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin to handle local OG image upload and processing
function localOgUploadPlugin() {
  return {
    name: 'local-og-upload',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/upload-og-image' && req.method === 'POST') {
          try {
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
              try {
                const buffer = Buffer.concat(chunks);
                const bodyStr = buffer.toString('utf8');
                const json = JSON.parse(bodyStr);
                
                if (!json.image) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'No image provided' }));
                  return;
                }
                
                // Extract base64 data
                const base64Data = json.image.replace(/^data:image\/\w+;base64,/, "");
                const fileBuffer = Buffer.from(base64Data, 'base64');
                
                // Dynamic import jimp to process the image
                const { Jimp } = await import('jimp');
                const image = await Jimp.read(fileBuffer);
                const aspect = json.aspect || 'landscape';
                
                if (aspect === 'square') {
                  image.resize({ w: 1024, h: 1024 });
                } else {
                  image.resize({ w: 1200, h: 630 });
                }
                
                // Clean key for file name
                const cleanKey = (json.key || json.routeType || 'link').toLowerCase().replace(/[^a-z0-9_-]/g, '');
                const fileName = `og_${cleanKey}.jpg`;

                // Ensure public/uploads directory exists
                const uploadsDir = path.join(process.cwd(), 'public/uploads');
                if (!fs.existsSync(uploadsDir)) {
                  fs.mkdirSync(uploadsDir, { recursive: true });
                }

                const publicJpgPath = path.join(uploadsDir, fileName);
                await image.write(publicJpgPath, { quality: 85 });
                
                // Save to dist/uploads as well if dist exists
                const distUploadsDir = path.join(process.cwd(), 'dist/uploads');
                if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
                  if (!fs.existsSync(distUploadsDir)) fs.mkdirSync(distUploadsDir, { recursive: true });
                  await image.write(path.join(distUploadsDir, fileName), { quality: 85 });
                }
                
                // Update public/data/og.json
                const ogJsonPath = path.join(process.cwd(), 'public/data/og.json');
                let ogConfig = {};
                try {
                  if (fs.existsSync(ogJsonPath)) {
                    ogConfig = JSON.parse(fs.readFileSync(ogJsonPath, 'utf8'));
                  }
                } catch (e) {
                  console.error('Error reading og.json:', e);
                }

                if (!ogConfig.custom) ogConfig.custom = {};
                ogConfig.custom[cleanKey] = {
                  target_url: json.targetUrl || '',
                  title: json.title || '',
                  description: json.description || '',
                  image: `/uploads/${fileName}`,
                  created_at: new Date().toISOString()
                };

                fs.writeFileSync(ogJsonPath, JSON.stringify(ogConfig, null, 2), 'utf8');

                // If dist/data/og.json exists, update it too
                const distOgJsonPath = path.join(process.cwd(), 'dist/data/og.json');
                if (fs.existsSync(path.join(process.cwd(), 'dist/data'))) {
                  fs.writeFileSync(distOgJsonPath, JSON.stringify(ogConfig, null, 2), 'utf8');
                }

                console.log(`[Vite Upload API] Successfully saved OG image to public/uploads/${fileName} and updated public/data/og.json`);
                
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  imagePath: `/uploads/${fileName}`,
                  message: `OG Image saved locally to public/data/og.json & public/uploads/${fileName}!`
                }));
              } catch (e) {
                console.error('[Vite Upload API] Error processing image:', e);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
          } catch (e) {
            console.error('[Vite Upload API] Connection error:', e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localOgUploadPlugin()],
})
