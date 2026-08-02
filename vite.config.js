import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin to handle local OG image upload, auto-crop, resize & compress
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
                const width = image.width;
                const height = image.height;
                const aspect = json.aspect || 'landscape';
                
                console.log(`[Local OG Plugin] Processing image: ${width}x${height} | Target Aspect: ${aspect}`);
                
                // Auto crop to target ratio before resizing
                if (aspect === 'square') {
                  if (width !== height) {
                    const minDim = Math.min(width, height);
                    const cropX = Math.max(0, Math.floor((width - minDim) / 2));
                    const cropY = Math.max(0, Math.floor((height - minDim) / 2));
                    image.crop({ x: cropX, y: cropY, w: minDim, h: minDim });
                  }
                  image.resize({ w: 1024, h: 1024 });
                } else {
                  // Landscape 1.91:1 (1200x630)
                  const targetRatio = 1200 / 630;
                  const currentRatio = width / height;
                  
                  if (currentRatio > targetRatio) {
                    const targetWidth = Math.floor(height * targetRatio);
                    const cropX = Math.max(0, Math.floor((width - targetWidth) / 2));
                    image.crop({ x: cropX, y: 0, w: targetWidth, h: height });
                  } else if (currentRatio < targetRatio) {
                    const targetHeight = Math.floor(width / targetRatio);
                    const cropY = Math.max(0, Math.floor((height - targetHeight) / 2));
                    image.crop({ x: 0, y: cropY, w: width, h: targetHeight });
                  }
                  image.resize({ w: 1200, h: 630 });
                }
                
                // Helper to extract clean key (target ID) from path or URL
                const extractCleanKey = (str) => {
                  if (!str) return 'link';
                  const cleanStr = String(str).trim();
                  if (cleanStr === '/' || cleanStr === 'default') return 'default';

                  const matchParam = cleanStr.match(/(?:formId|jobId|postId|productId|id)=([a-zA-Z0-9_-]+)/i);
                  if (matchParam && matchParam[1]) return matchParam[1].toLowerCase();

                  const matchPath = cleanStr.match(/(?:^\/|\/)?(?:form|post|job|product|accessories)\/([a-zA-Z0-9_-]+)/i);
                  if (matchPath && matchPath[1]) return matchPath[1].toLowerCase();

                  const matchLast = cleanStr.match(/([a-zA-Z0-9_-]+)(?:\?|#|$)/);
                  if (matchLast && matchLast[1]) {
                    const token = matchLast[1].toLowerCase();
                    if (!['http', 'https', 'user', 'index.html', 'com', 'app'].includes(token)) {
                      return token;
                    }
                  }

                  return cleanStr.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                };

                const cleanKey = extractCleanKey(json.key || json.path || json.targetUrl || 'link');

                // Determine destination file name & path
                let fileName = '';
                let relImagePath = '';

                if (json.routeType === 'default' || cleanKey === 'default') {
                  fileName = 'income_og_preview.jpg';
                  relImagePath = '/income_og_preview.jpg';
                } else if (json.routeType === 'post') {
                  fileName = 'post_og_preview.jpg';
                  relImagePath = '/post_og_preview.jpg';
                } else if (json.routeType === 'form') {
                  fileName = 'form_og_preview.jpg';
                  relImagePath = '/form_og_preview.jpg';
                } else if (json.routeType === 'job') {
                  fileName = 'job_og_preview.jpg';
                  relImagePath = '/job_og_preview.jpg';
                } else if (json.routeType === 'product') {
                  fileName = 'product_og_preview.jpg';
                  relImagePath = '/product_og_preview.jpg';
                } else {
                  fileName = `og_${cleanKey}.jpg`;
                  relImagePath = `/uploads/${fileName}`;
                }

                if (relImagePath.startsWith('/uploads/')) {
                  const uploadsDir = path.join(process.cwd(), 'public/uploads');
                  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                  await image.write(path.join(uploadsDir, fileName), { quality: 85 });

                  // Save to dist/uploads as well if dist exists
                  const distUploadsDir = path.join(process.cwd(), 'dist/uploads');
                  if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
                    if (!fs.existsSync(distUploadsDir)) fs.mkdirSync(distUploadsDir, { recursive: true });
                    await image.write(path.join(distUploadsDir, fileName), { quality: 85 });
                  }
                } else {
                  const publicPath = path.join(process.cwd(), `public/${fileName}`);
                  await image.write(publicPath, { quality: 85 });
                  
                  if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
                    await image.write(path.join(process.cwd(), `dist/${fileName}`), { quality: 85 });
                  }
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

                if (['default', 'post', 'form', 'job', 'product'].includes(json.routeType)) {
                  if (ogConfig[json.routeType]) {
                    ogConfig[json.routeType].image = relImagePath;
                  }
                } else {
                  if (!ogConfig.custom) ogConfig.custom = {};
                  ogConfig.custom[cleanKey] = {
                    target_url: json.targetUrl || json.path || '',
                    title: json.title || '',
                    description: json.description || '',
                    image: relImagePath,
                    created_at: new Date().toISOString()
                  };
                }

                fs.writeFileSync(ogJsonPath, JSON.stringify(ogConfig, null, 2), 'utf8');

                const distOgJsonPath = path.join(process.cwd(), 'dist/data/og.json');
                if (fs.existsSync(path.join(process.cwd(), 'dist/data'))) {
                  fs.writeFileSync(distOgJsonPath, JSON.stringify(ogConfig, null, 2), 'utf8');
                }

                console.log(`[Local OG Plugin] Saved cropped & compressed OG image to public${relImagePath}`);
                
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  imagePath: `/uploads/${fileName}`,
                  message: `OG Image auto-cropped, resized & saved locally to public/uploads/${fileName}!`
                }));
              } catch (e) {
                console.error('[Local OG Plugin] Error processing image:', e);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
          } catch (e) {
            console.error('[Local OG Plugin] Connection error:', e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        } else if (req.url === '/api/delete-og-image' && req.method === 'POST') {
          try {
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', async () => {
              try {
                const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                const key = (json.key || '').trim().toLowerCase();
                
                if (!key) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'No key provided' }));
                  return;
                }

                const ogJsonPath = path.join(process.cwd(), 'public/data/og.json');
                let ogConfig = {};
                if (fs.existsSync(ogJsonPath)) {
                  ogConfig = JSON.parse(fs.readFileSync(ogJsonPath, 'utf8'));
                }

                if (ogConfig.custom && ogConfig.custom[key]) {
                  const imagePath = ogConfig.custom[key].image;
                  delete ogConfig.custom[key];
                  fs.writeFileSync(ogJsonPath, JSON.stringify(ogConfig, null, 2), 'utf8');

                  if (imagePath && imagePath.startsWith('/uploads/')) {
                    const localImgFile = path.join(process.cwd(), 'public', imagePath);
                    if (fs.existsSync(localImgFile)) {
                      try { fs.unlinkSync(localImgFile); } catch (err) {}
                    }
                  }

                  const distOgJson = path.join(process.cwd(), 'dist/data/og.json');
                  if (fs.existsSync(path.join(process.cwd(), 'dist/data'))) {
                    fs.writeFileSync(distOgJson, JSON.stringify(ogConfig, null, 2), 'utf8');
                  }
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: `OG entry '${key}' deleted successfully!` }));
              } catch (e) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
          } catch (e) {
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
