import fs from 'fs';
import path from 'path';
import {
  normalizeOgImagePath,
  normalizeOgTargetPath,
  parseOgConfig,
  resolveOgRecordForTarget
} from '../src/utils/og.js';

const botAgents = [
  'facebookexternalhit',
  'twitterbot',
  'whatsapp',
  'linkedinbot',
  'telegrambot',
  'slackbot',
  'discordbot',
  'googlebot',
  'bingbot',
  'baiduspider',
  'yandex',
  'pinterest',
  'outbrain'
];

const isBot = (userAgent) => {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return botAgents.some((bot) => ua.includes(bot));
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getImageUrl = (url, baseUrl, fallbackImage = '/income_og_preview.jpg') => {
  if (!url) return `${baseUrl}/${fallbackImage.replace(/^\/+/, '')}`;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('drive.google.com')) {
      const driveIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (driveIdMatch && driveIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1000`;
      }
    }
    return url;
  }
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    return `${baseUrl}/${url.replace(/^\/+/, '')}`;
  }
  return `${baseUrl}/${url.replace(/^\/+/, '')}`;
};

const pickImage = (ogConfig, targetPath, baseUrl) => {
  const normalized = normalizeOgTargetPath(targetPath);
  const parsed = parseOgConfig(ogConfig);
  const defaultImage = normalizeOgImagePath(parsed.default?.image || '/income_og_preview.jpg');
  if (!normalized.valid) return getImageUrl(defaultImage, baseUrl, defaultImage);
  const record = resolveOgRecordForTarget(ogConfig, targetPath);
  return getImageUrl(record.image || defaultImage, baseUrl, defaultImage);
};

export default async function handler(req, res) {
  const { id } = req.query;
  const userAgent = req.headers['user-agent'] || '';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'subi-eseva-service.vercel.app';
  const baseUrl = `${protocol}://${host}`;

  const cleanId = (id || '').toString().trim().toLowerCase();
  if (!cleanId) {
    return res.redirect(302, '/user');
  }

  const ogConfigPath = path.join(process.cwd(), 'public/data/og.json');
  let ogConfig = {};
  try {
    ogConfig = JSON.parse(fs.readFileSync(ogConfigPath, 'utf8'));
  } catch {}

  const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;
  let redirectObj = null;

  if (scriptUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(`${scriptUrl}?action=getRedirectById&id=${encodeURIComponent(cleanId)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          redirectObj = json.data;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch redirect for slug [${cleanId}] from GAS:`, error);
    }
  }

  const targetUrl = redirectObj?.target_url || '/user';
  const title = redirectObj?.title || 'Subi e sevai';
  const description = redirectObj?.description || 'Redirecting to Subi e sevai...';
  let redirectTargetPath = `/go/${cleanId}`;
  if (redirectObj?.target_url) {
    try {
      redirectTargetPath = new URL(redirectObj.target_url, baseUrl).pathname || redirectTargetPath;
    } catch {}
  }
  const imageUrl = redirectObj?.img_url
    ? getImageUrl(redirectObj.img_url, baseUrl)
    : pickImage(ogConfig, redirectTargetPath, baseUrl);
  const sharedUrl = `${baseUrl}/go/${cleanId}`;

  if (!isBot(userAgent)) {
    return res.redirect(302, targetUrl);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(sharedUrl)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(sharedUrl)}" />
  <meta property="og:site_name" content="Subi e sevai" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(targetUrl)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />
  <script>
    window.location.replace(${JSON.stringify(targetUrl)});
  </script>
</body>
</html>`);
}
