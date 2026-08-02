import fs from 'fs';
import path from 'path';
import {
  findMatchingOgRecord,
  getOgFallbackAssetNames,
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

function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return botAgents.some((bot) => ua.includes(bot));
}

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getGoogleDriveId = (url) => {
  if (!url) return null;
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  return null;
};

const getImageUrl = (url, baseUrl, fallbackImage = '/uploads/og_default.jpg', timestamp = null) => {
  let finalUrl = '';
  if (!url) {
    finalUrl = `${baseUrl}/${fallbackImage.replace(/^\/+/, '')}`;
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('drive.google.com')) {
      const driveId = getGoogleDriveId(url);
      if (driveId) {
        finalUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
      } else {
        finalUrl = url;
      }
    } else {
      finalUrl = url;
    }
  } else {
    finalUrl = `${baseUrl}/${url.replace(/^\/+/, '')}`;
  }

  const vParam = timestamp ? (new Date(timestamp).getTime() || timestamp) : Date.now();
  return finalUrl.includes('?') ? `${finalUrl}&v=${vParam}` : `${finalUrl}?v=${vParam}`;
};

const resolveRouteImage = (ogConfig, targetPath, baseUrl) => {
  const normalized = normalizeOgTargetPath(targetPath);
  const parsed = parseOgConfig(ogConfig);
  const defaultImage = normalizeOgImagePath(parsed.default?.image || '/uploads/og_default.jpg') || '/uploads/og_default.jpg';

  if (!normalized.valid) {
    return getImageUrl(defaultImage, baseUrl, defaultImage);
  }

  const candidates = [];
  const exact = parsed.routesByKey[normalized.routeKey];
  if (exact?.image) candidates.push(exact.image);

  if (normalized.routeType !== 'default') {
    candidates.push(...getOgFallbackAssetNames(normalized.routeType));
  }

  candidates.push(defaultImage, '/uploads/og_default.jpg');

  const chosen = candidates.find((candidate) => {
    const clean = normalizeOgImagePath(candidate);
    if (!clean) return false;
    if (clean.startsWith('http://') || clean.startsWith('https://')) return true;
    const localFile = path.join(process.cwd(), 'public', clean.replace(/^\/+/, ''));
    return fs.existsSync(localFile);
  }) || defaultImage;

  return getImageUrl(chosen, baseUrl, defaultImage, exact?.updated_at);
};

const defaultMockJobs = [
  {
    id: 1,
    title: 'TNEB Wireman Recruitment',
    description: 'Tamil Nadu Electricity Board (TNEB) announces openings for Wireman positions. Required qualification: ITI in Electrical Trade. Age limit: 18-35 years. Apply before June 30, 2026.',
    img_url: ''
  },
  {
    id: 2,
    title: 'TNPSC Group 4 Openings',
    description: 'TNPSC has released the recruitment notification for Group 4 services including VAO, Junior Assistant, and Typist. Minimum qualification: 10th standard pass. Apply today through the official channel.',
    img_url: ''
  },
  {
    id: 'csir-csmcri',
    title: 'CSIR-CSMCRI JRF & Project Assistant Recruitment',
    description: 'CSIR - Central Salt and Marine Chemicals Research Institute invites applications for research fellows and project assistants. Apply online.',
    img_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/CSIR_India_logo.png'
  },
  {
    id: 'tnpsc-group-4',
    title: 'TNPSC Group 4 Exam Recruitment 2026',
    description: 'Official recruitment for TNPSC Group 4 services (VAO, Typist, Junior Assistant). Check eligibility, syllabus and apply now.',
    img_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Tamil_Nadu_State_Emblem.svg/512px-Tamil_Nadu_State_Emblem.svg.png'
  }
];

const defaultMockProducts = [
  {
    ProductID: 'prod-1',
    Category: 'Phone Cover',
    CoverType: 'Case',
    Brand: 'Samsung',
    CustomBrand: '',
    ModelName: 'Samsung S24 Ultra',
    ProductName: 'Samsung S24 Ultra Clear Case',
    Type: '',
    Price: '299',
    TagNumber: 'TAG-S24U-01',
    ImageURL: '',
    Count: '5'
  },
  {
    ProductID: 'prod-2',
    Category: 'Phone Cover',
    CoverType: 'Flip Case',
    Brand: 'Apple',
    CustomBrand: '',
    ModelName: 'iPhone 15 Pro',
    ProductName: 'iPhone 15 Pro Leather Flip Case',
    Type: '',
    Price: '499',
    TagNumber: 'TAG-IP15P-02',
    ImageURL: '',
    Count: '0'
  },
  {
    ProductID: 'prod-3',
    Category: 'Headphone',
    CoverType: '',
    Brand: 'Sony',
    CustomBrand: '',
    ModelName: '',
    ProductName: 'SUBI BassBoost Wireless Headphone',
    Type: '',
    Price: '999',
    TagNumber: 'TAG-HP-03',
    ImageURL: '',
    Count: '3'
  },
  {
    ProductID: 'prod-4',
    Category: 'Speaker',
    CoverType: '',
    Brand: 'JBL',
    CustomBrand: '',
    ModelName: '',
    ProductName: 'SUBI Go Portable Bluetooth Speaker',
    Type: '',
    Price: '1499',
    TagNumber: 'TAG-SPK-04',
    ImageURL: '',
    Count: '0'
  },
  {
    ProductID: 'prod-5',
    Category: 'Charger',
    CoverType: '',
    Brand: 'Anker',
    CustomBrand: '',
    ModelName: '',
    ProductName: 'SUBI SuperCharge Dual Port 33W',
    Type: 'Fast Charger',
    Price: '350',
    TagNumber: 'TAG-CHG-05',
    ImageURL: '',
    Count: '10'
  }
];

export default async function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const { type, id } = req.query;

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'subi-eseva-service.vercel.app';
  const baseUrl = `${protocol}://${host}`;

  const ogJsonPath = path.join(process.cwd(), 'public/data/og.json');
  let ogConfig = null;
  try {
    if (fs.existsSync(ogJsonPath)) {
      ogConfig = JSON.parse(fs.readFileSync(ogJsonPath, 'utf8'));
    }
  } catch (error) {
    console.error('Failed to read public/data/og.json:', error);
  }

  const defaults = (ogConfig && ogConfig.default) || {
    title: 'Subi e-sevai Portal',
    description: 'Apply for E-Sevai services, view job alerts, and stay updated.',
    image: '/uploads/og_default.jpg'
  };

  let redirectPath = '/user';
  if (type === 'user') {
    const queryParams = new URLSearchParams(req.query);
    queryParams.delete('type');
    const queryString = queryParams.toString();
    redirectPath = `/user${queryString ? `?${queryString}` : ''}`;
  } else if (type === 'home') {
    redirectPath = '/';
  } else if (['post', 'form', 'job', 'product', 'accessories'].includes(type)) {
    redirectPath = `/user`;
  }

  const sharedUrl = type === 'home'
    ? baseUrl
    : (type === 'user' ? `${baseUrl}${redirectPath}` : `${baseUrl}/${type}/${id}`);

  let title = defaults.title;
  let description = defaults.description;
  let imageUrl = getImageUrl(defaults.image, baseUrl, defaults.image);

  try {
    const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;
    const targetId = (id || req.query.formId || req.query.jobId || req.query.postId || req.query.productId || req.query.id || '').toString().trim().toLowerCase();
    const pageTargetPath = type === 'home'
      ? '/'
      : (['post', 'form', 'job'].includes(type) ? `/${type}/${id}` : '');

    let customRedirect = null;
    const pageOgRecord = findMatchingOgRecord(ogConfig, pageTargetPath || targetId) || (pageTargetPath ? resolveOgRecordForTarget(ogConfig, pageTargetPath) : null);

    const dataPath = path.join(process.cwd(), 'src/data.json');
    let mockData = { forms: [], posts: [] };
    try {
      mockData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
      console.error('Failed to read local data.json:', error);
    }

    let localItems = [];
    if (type === 'post') {
      localItems = mockData.posts || [];
    } else if (type === 'form') {
      localItems = mockData.forms || [];
    } else if (type === 'job') {
      localItems = defaultMockJobs;
    } else if (type === 'product' || type === 'accessories') {
      localItems = defaultMockProducts;
    }

    let item = null;
    if (type === 'product' || type === 'accessories') {
      item = localItems.find((x) => String(x.ProductID) === String(id));
    } else if (['post', 'form', 'job'].includes(type)) {
      item = localItems.find((x) => String(x.id) === String(id));
    }

    if (item) {
      if (type === 'product' || type === 'accessories') {
        title = item.ProductName || `${item.Brand} ${item.ModelName} (${item.Category})`;
        description = `Price: ₹${item.Price} | Category: ${item.Category} | Brand: ${item.Brand} ${item.ModelName ? `- ${item.ModelName}` : ''}`;
      } else {
        title = item.title || title;
        description = item.description || description;
      }
    }

    if (pageOgRecord) {
      if (pageOgRecord.title) title = pageOgRecord.title;
      if (pageOgRecord.description) description = pageOgRecord.description;
      if (pageOgRecord.image) {
        imageUrl = getImageUrl(pageOgRecord.image, baseUrl, defaults.image, pageOgRecord.updated_at);
      } else {
        imageUrl = resolveRouteImage(ogConfig, pageTargetPath, baseUrl);
      }
    } else if (item && (item.ImageURL || item.img_url)) {
      imageUrl = getImageUrl(item.ImageURL || item.img_url, baseUrl, defaults.image);
    } else if (pageTargetPath) {
      imageUrl = resolveRouteImage(ogConfig, pageTargetPath, baseUrl);
    }

    if (!pageOgRecord && targetId && scriptUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const redirectRes = await fetch(`${scriptUrl}?action=getRedirectById&id=${encodeURIComponent(targetId)}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (redirectRes.ok) {
          const json = await redirectRes.json();
          if (json.success && json.data) {
            customRedirect = json.data;
            if (customRedirect.title) title = customRedirect.title;
            if (customRedirect.description) description = customRedirect.description;
            if (customRedirect.img_url) {
              imageUrl = getImageUrl(customRedirect.img_url, baseUrl, defaults.image);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch custom redirect for targetId [${targetId}]:`, error);
      }
    }

    if (type === 'post') {
      redirectPath = `/user?tab=home&postId=${id}`;
    } else if (type === 'job') {
      redirectPath = `/user?tab=jobs&jobId=${id}`;
    } else if (type === 'form') {
      redirectPath = `/user?tab=apply&formId=${id}`;
    } else if (type === 'product' || type === 'accessories') {
      redirectPath = `/user?tab=accessories&productId=${id}`;
    }
  } catch (error) {
    console.error('Error processing sharing request:', error);
  }

  if (!isBot(userAgent)) {
    return res.redirect(302, redirectPath);
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
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:url" content="${escapeHtml(sharedUrl)}" />
  <meta property="og:site_name" content="Subi e-sevai" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectPath)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />
  <script>
    window.location.replace(${JSON.stringify(redirectPath)});
  </script>
</body>
</html>`);
}
