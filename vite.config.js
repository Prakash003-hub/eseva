import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {
  buildOgAssetPath,
  buildOgPublicUrl,
  normalizeOgTargetPath,
  parseOgConfig,
  sanitizeOgSlug
} from './src/utils/og.js';

const UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
const LANDSCAPE_WIDTH = 1200;
const LANDSCAPE_HEIGHT = 630;
const TARGET_RATIO = LANDSCAPE_WIDTH / LANDSCAPE_HEIGHT;

const readJsonFile = (filePath, fallback = {}) => {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[OG] Failed to read ${filePath}:`, error);
    return fallback;
  }
};

const writeJsonFile = (filePath, data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const readRequestBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    try {
      resolve(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      reject(error);
    }
  });
  req.on('error', reject);
});

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const listOgRecords = (ogConfig) => {
  return parseOgConfig(ogConfig).routes.map((record) => ({
    id: record.id || record.slug,
    route_type: record.route_type,
    slug: record.slug,
    target_path: record.target_path,
    route_key: record.route_key,
    local_asset_path: record.asset_path || record.local_asset_path || '',
    public_page_url: record.public_url || record.public_page_url || '',
    image: record.image || '',
    title: record.title || '',
    description: record.description || '',
    created_at: record.created_at || '',
    updated_at: record.updated_at || ''
  }));
};

const upsertOgRecord = (ogConfig, record, imagePath, targetUrl, previousKey = '') => {
  const next = {
    ...ogConfig,
    default: ogConfig.default || {
      title: 'Subi e-sevai Portal',
      description: 'Apply for E-Sevai services, view job alerts, and stay updated.',
      image: '/income_og_preview.jpg'
    },
    routes: { ...(ogConfig.routes || {}) },
    custom: { ...(ogConfig.custom || {}) }
  };

  const normalizedKey = record.route_key;
  const legacyKey = sanitizeOgSlug(record.slug) || record.slug;
  const now = new Date().toISOString();
  const previousNormalized = previousKey ? normalizeOgTargetPath(previousKey) : null;

  const previousRoute = previousNormalized && previousNormalized.valid ? next.routes?.[previousNormalized.routeKey] : null;
  const previousLegacy = previousNormalized && previousNormalized.valid ? next.custom?.[previousNormalized.slug] : null;

  if (previousRoute && previousNormalized.routeKey !== normalizedKey) {
    delete next.routes[previousNormalized.routeKey];
  }
  if (previousLegacy && previousNormalized.slug !== legacyKey) {
    delete next.custom[previousNormalized.slug];
  }

  const existingRoute = next.routes[normalizedKey];
  const createdAt = existingRoute?.created_at || previousRoute?.created_at || now;

  const finalRecord = {
    id: record.id || record.slug,
    route_type: record.route_type,
    slug: record.slug,
    target_path: record.target_path,
    route_key: normalizedKey,
    local_asset_path: imagePath.startsWith('/uploads/') ? `public${imagePath}` : imagePath,
    public_page_url: targetUrl,
    public_url: targetUrl,
    asset_path: `public${imagePath}`,
    image: imagePath,
    title: record.title || '',
    description: record.description || '',
    created_at: createdAt,
    updated_at: now
  };

  next.routes[normalizedKey] = finalRecord;
  next.custom[legacyKey] = {
    id: finalRecord.id,
    route_type: finalRecord.route_type,
    slug: finalRecord.slug,
    target_path: finalRecord.target_path,
    target_url: finalRecord.public_url,
    public_url: finalRecord.public_url,
    asset_path: finalRecord.asset_path,
    local_asset_path: finalRecord.local_asset_path,
    title: finalRecord.title,
    description: finalRecord.description,
    image: finalRecord.image,
    created_at: createdAt,
    updated_at: now
  };

  if (record.route_type === 'default') {
    next.default = {
      title: record.title || next.default.title,
      description: record.description || next.default.description,
      image: imagePath
    };
  }

  return next;
};

const removeOgRecord = (ogConfig, rawInput) => {
  const next = {
    ...ogConfig,
    routes: { ...(ogConfig.routes || {}) },
    custom: { ...(ogConfig.custom || {}) }
  };

  let imagePath = '';
  const rawStr = String(rawInput || '').trim();
  const normalized = normalizeOgTargetPath(rawStr);

  const keysToCheck = Array.from(new Set([
    rawStr,
    normalized.slug,
    normalized.routeKey,
    normalized.targetPath,
    rawStr.toLowerCase().replace(/[^a-z0-9_-]/g, '')
  ].filter(Boolean)));

  for (const k of keysToCheck) {
    if (next.routes && next.routes[k]) {
      if (!imagePath) imagePath = next.routes[k].image || next.routes[k].asset_path || '';
      delete next.routes[k];
    }
    if (next.custom && next.custom[k]) {
      if (!imagePath) imagePath = next.custom[k].image || next.custom[k].asset_path || '';
      delete next.custom[k];
    }
  }

  return { next, imagePath };
};

const processUpload = async (json) => {
  if (!json.image) {
    return { statusCode: 400, body: { success: false, error: 'Missing image data.' } };
  }

  const normalized = normalizeOgTargetPath(json.targetPath || json.targetUrl || json.key || json.path);
  if (!normalized.valid) {
    return { statusCode: 400, body: { success: false, error: normalized.error } };
  }

  const routeType = normalized.routeType;
  const slug = normalized.slug;
  const targetPath = normalized.targetPath;
  const routeKey = normalized.routeKey;
  const overwrite = json.overwrite === true || String(json.overwrite).toLowerCase() === 'true';
  const previousKey = json.previousKey || json.previous_key || '';

  const ogJsonPath = path.join(process.cwd(), 'public/data/og.json');
  const ogConfig = readJsonFile(ogJsonPath, {});
  const parsed = parseOgConfig(ogConfig);
  const existing = parsed.routesByKey[routeKey];

  if (existing && !overwrite && (!previousKey || normalizeOgTargetPath(previousKey).routeKey !== routeKey)) {
    return { statusCode: 409, body: { success: false, error: `An OG image already exists for ${targetPath}.` } };
  }

  const base64Data = String(json.image).replace(/^data:image\/\w+;base64,/, '');
  const estimatedBytes = Buffer.byteLength(base64Data, 'base64');
  if (!estimatedBytes || estimatedBytes > UPLOAD_LIMIT_BYTES) {
    return { statusCode: 400, body: { success: false, error: 'File size limit exceeded. Please upload an image under 10MB.' } };
  }

  const mimeType = String(json.mimeType || '').toLowerCase();
  const fileNameHint = String(json.fileName || '').toLowerCase();
  const supportedMime =
    mimeType.includes('jpeg') ||
    mimeType.includes('jpg') ||
    mimeType.includes('png') ||
    mimeType.includes('webp') ||
    fileNameHint.endsWith('.jpg') ||
    fileNameHint.endsWith('.jpeg') ||
    fileNameHint.endsWith('.png') ||
    fileNameHint.endsWith('.webp');

  if (!supportedMime) {
    return { statusCode: 400, body: { success: false, error: 'Unsupported file type. Use JPG, JPEG, PNG, or WebP.' } };
  }

  const cleanBuffer = Buffer.from(base64Data, 'base64');
  let finalBuffer = cleanBuffer;

  try {
    const { Jimp } = await import('jimp');
    const image = await Jimp.read(cleanBuffer);
    const width = image?.bitmap?.width || image?.width;
    const height = image?.bitmap?.height || image?.height;

    if (width && height) {
      const aspectOption = String(json.aspect || json.aspectRatio || 'landscape').toLowerCase();
      const isSquare = aspectOption === 'square' || aspectOption === '1:1' || aspectOption === '1.1' || aspectOption === '1-1';

      const targetW = isSquare ? 1024 : LANDSCAPE_WIDTH;
      const targetH = isSquare ? 1024 : LANDSCAPE_HEIGHT;
      const targetRatio = targetW / targetH;

      if (typeof image.crop === 'function') {
        if (width / height > targetRatio) {
          const cropW = Math.floor(height * targetRatio);
          const cropX = Math.max(0, Math.floor((width - cropW) / 2));
          image.crop(cropX, 0, cropW, height);
        } else if (width / height < targetRatio) {
          const cropH = Math.floor(width / targetRatio);
          const cropY = Math.max(0, Math.floor((height - cropH) / 2));
          image.crop(0, cropY, width, cropH);
        }
      }

      if (typeof image.resize === 'function') {
        image.resize(targetW, targetH);
      }
      if (typeof image.quality === 'function') {
        image.quality(85);
      }

      if (typeof image.getBufferAsync === 'function') {
        finalBuffer = await image.getBufferAsync('image/jpeg');
      } else if (typeof image.getBuffer === 'function') {
        finalBuffer = await new Promise((resolve) => {
          image.getBuffer('image/jpeg', (err, buf) => resolve(err ? cleanBuffer : buf));
        });
      }
    }
  } catch (error) {
    console.warn('[OG Server Process Warning - Falling back to Canvas Buffer]:', error?.message || error);
    finalBuffer = cleanBuffer;
  }

  const uploadsDir = path.join(process.cwd(), 'public/uploads');
  ensureDir(uploadsDir);

  const fileName = buildOgAssetPath(routeType, slug).replace('/uploads/', '');
  const assetPath = path.join(uploadsDir, fileName);

  try {
    fs.writeFileSync(assetPath, finalBuffer);
  } catch (error) {
    console.error('[OG] Failed to write upload:', error);
    return { statusCode: 500, body: { success: false, error: 'Failed to write image file.' } };
  }

  const targetUrl = buildOgPublicUrl(
    targetPath,
    json.publicBaseUrl || json.baseUrl || json.origin || 'https://subi-eseva-service.vercel.app'
  );
  const record = {
    id: slug,
    route_type: routeType,
    slug,
    target_path: targetPath,
    route_key: routeKey,
    title: String(json.title || '').trim(),
    description: String(json.description || '').trim()
  };

  const nextConfig = upsertOgRecord(ogConfig, record, `/uploads/${fileName}`, targetUrl, previousKey);
  try {
    writeJsonFile(ogJsonPath, nextConfig);

    const distDataDir = path.join(process.cwd(), 'dist/data');
    if (fs.existsSync(distDataDir)) {
      writeJsonFile(path.join(distDataDir, 'og.json'), nextConfig);
    }
  } catch (error) {
    console.error('[OG] Failed to write metadata:', error);
    return { statusCode: 500, body: { success: false, error: 'Failed to update metadata.' } };
  }

  if (previousKey && normalizeOgTargetPath(previousKey).routeKey !== routeKey) {
    const previousNormalized = normalizeOgTargetPath(previousKey);
    const previousRecord = parsed.routesByKey[previousNormalized.routeKey];
    if (previousRecord?.image && previousRecord.image.startsWith('/uploads/') && previousRecord.image !== `/uploads/${fileName}`) {
      const oldFile = path.join(process.cwd(), 'public', previousRecord.image);
      if (fs.existsSync(oldFile)) {
        try { fs.unlinkSync(oldFile); } catch {}
      }
    }
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      imagePath: `/uploads/${fileName}`,
      record: nextConfig.routes[routeKey],
      message: `OG image saved to public/uploads/${fileName}`
    }
  };
};

const processDelete = async (json) => {
  const rawKey = json.targetPath || json.key || json.path || json.route || json.slug || json.id || '';
  if (!rawKey) {
    return { statusCode: 400, body: { success: false, error: 'Missing target path or key for deletion.' } };
  }

  const ogJsonPath = path.join(process.cwd(), 'public/data/og.json');
  const ogConfig = readJsonFile(ogJsonPath, {});

  const { next, imagePath } = removeOgRecord(ogConfig, rawKey);

  try {
    if (imagePath && imagePath.startsWith('/uploads/')) {
      const localFile = path.join(process.cwd(), 'public', imagePath);
      if (fs.existsSync(localFile)) {
        try { fs.unlinkSync(localFile); } catch (err) {}
      }
    }
  } catch (error) {
    return { statusCode: 500, body: { success: false, error: 'Failed to delete image file.' } };
  }

  try {
    writeJsonFile(ogJsonPath, next);
    const distDataDir = path.join(process.cwd(), 'dist/data');
    if (fs.existsSync(distDataDir)) {
      writeJsonFile(path.join(distDataDir, 'og.json'), next);
    }
  } catch (error) {
    console.error('[OG] Failed to update metadata after deletion:', error);
    return { statusCode: 500, body: { success: false, error: 'Failed to update metadata.' } };
  }

  return {
    statusCode: 200,
    body: { success: true, message: `OG image for '${rawKey}' deleted successfully.` }
  };
};

const CHATBOT_CONFIG_PATH = path.join(process.cwd(), 'src', 'config', 'chatbotFlow.json');

const saveChatbotFlowFile = (payload) => {
  const content = {
    version: payload.version || '1.0',
    updated_at: new Date().toISOString(),
    flows: payload.flows || []
  };
  writeJsonFile(CHATBOT_CONFIG_PATH, content);
  return content;
};

function localChatbotPlugin() {
  return {
    name: 'local-chatbot-sync',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        // Save directly to src/config/chatbotFlow.json
        if (req.url.startsWith('/api/chatbot/save-flow') && req.method === 'POST') {
          try {
            const body = JSON.parse(await readRequestBody(req));
            const savedContent = saveChatbotFlowFile(body);
            sendJson(res, 200, {
              success: true,
              message: 'Successfully updated src/config/chatbotFlow.json on disk.',
              data: savedContent
            });
          } catch (error) {
            console.error('[Chatbot Save Error]:', error);
            sendJson(res, 500, { success: false, error: error.message || 'Failed to save chatbotFlow.json' });
          }
          return;
        }

        next();
      });
    }
  };
}

function localOgUploadPlugin() {
  return {
    name: 'local-og-upload',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        if (req.url.startsWith('/api/upload-og-image') && req.method === 'POST') {
          try {
            const body = JSON.parse(await readRequestBody(req));
            const result = await processUpload(body);
            sendJson(res, result.statusCode, result.body);
          } catch (error) {
            console.error('[OG] Upload error:', error);
            sendJson(res, 500, { success: false, error: error.message || 'Unexpected upload failure.' });
          }
          return;
        }

        if (req.url.startsWith('/api/delete-og-image') && req.method === 'POST') {
          try {
            const body = JSON.parse(await readRequestBody(req));
            const result = await processDelete(body);
            sendJson(res, result.statusCode, result.body);
          } catch (error) {
            console.error('[OG] Delete error:', error);
            sendJson(res, 500, { success: false, error: error.message || 'Unexpected deletion failure.' });
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localOgUploadPlugin(), localChatbotPlugin()]
});
