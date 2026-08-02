const ROUTE_TYPES = new Set(['default', 'form', 'post', 'job']);
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const stripQueryHash = (value) => String(value || '').split('?')[0].split('#')[0];

export const sanitizeOgSlug = (value) => {
  let cleaned = String(value || '')
    .trim()
    .replace(/\.(jpg|jpeg|png|webp)$/i, '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');

  cleaned = cleaned.replace(/^(form|job|post|product)\//i, '');
  cleaned = cleaned.replace(/^(form|job|post|product)-(form|job|post|product)-/i, '$1-');

  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return '';
  }

  return cleaned
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const normalizeOgTargetPath = (input) => {
  const raw = String(input || '').trim();
  if (!raw) {
    return { valid: false, error: 'Missing target path.' };
  }

  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      pathname = new URL(raw).pathname || '/';
    } catch {
      return { valid: false, error: 'Invalid target URL.' };
    }
  }

  pathname = stripQueryHash(pathname).replace(/\\/g, '/');
  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }

  pathname = pathname.replace(/\/+/g, '/');

  if (pathname === '/' || pathname === '') {
    return {
      valid: true,
      routeType: 'default',
      slug: 'default',
      targetPath: '/',
      routeKey: 'default'
    };
  }

  const parts = pathname.split('/').filter(Boolean);
  let routeType = (parts[0] || '').toLowerCase();
  
  if (!ROUTE_TYPES.has(routeType)) {
    if (routeType.startsWith('form')) routeType = 'form';
    else if (routeType.startsWith('post')) routeType = 'post';
    else if (routeType.startsWith('job')) routeType = 'job';
    else routeType = 'job'; // Default to job for numeric / raw IDs
  }

  if (routeType === 'default') {
    return {
      valid: true,
      routeType: 'default',
      slug: 'default',
      targetPath: '/',
      routeKey: 'default'
    };
  }

  const slugParts = ROUTE_TYPES.has(parts[0]?.toLowerCase()) ? parts.slice(1) : parts;
  const slug = sanitizeOgSlug(slugParts.join('/')) || sanitizeOgSlug(parts.join('/')) || 'default';

  return {
    valid: true,
    routeType,
    slug,
    targetPath: `/${routeType}/${slug}`,
    routeKey: `${routeType}/${slug}`
  };
};

export const getOgAssetBaseName = (routeType, slug) => {
  const safeType = ROUTE_TYPES.has(routeType) ? routeType : 'default';
  const safeSlug = sanitizeOgSlug(slug) || 'default';

  if (safeType === 'default' || safeSlug === 'default') {
    return 'og_default.jpg';
  }

  return `og_${safeSlug}.jpg`;
};

export const getOgFallbackAssetNames = (routeType) => {
  const safeType = ROUTE_TYPES.has(routeType) ? routeType : 'default';
  if (safeType === 'default') {
    return ['og_default.jpg'];
  }
  return [`og_${safeType}-default.jpg`, 'og_default.jpg'];
};

export const buildOgAssetPath = (routeType, slug) => `/uploads/${getOgAssetBaseName(routeType, slug)}`;

export const buildOgPublicUrl = (targetPath, baseUrl) => {
  const origin = String(baseUrl || '').replace(/\/+$/, '');
  const normalizedPath = normalizeOgTargetPath(targetPath);
  if (!normalizedPath.valid) {
    return origin || '';
  }
  return normalizedPath.targetPath === '/' ? origin : `${origin}${normalizedPath.targetPath}`;
};

export const normalizeOgImagePath = (imagePath) => {
  const raw = String(imagePath || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/uploads/')) return raw;
  if (raw.startsWith('uploads/')) return `/${raw}`;
  if (raw.startsWith('/')) return raw;
  return `/${raw}`;
};

export const parseOgConfig = (ogConfig) => {
  const config = ogConfig && typeof ogConfig === 'object' ? ogConfig : {};
  const routes = [];

  if (config.routes && typeof config.routes === 'object') {
    for (const [key, value] of Object.entries(config.routes)) {
      if (!value || typeof value !== 'object') continue;
      const normalized = normalizeOgTargetPath(value.target_path || key);
      if (!normalized.valid) continue;
      routes.push({
        ...value,
        route_type: value.route_type || normalized.routeType,
        slug: value.slug || normalized.slug,
        target_path: value.target_path || normalized.targetPath,
        route_key: value.route_key || normalized.routeKey,
        image: normalizeOgImagePath(value.image || value.asset_path || '')
      });
    }
  }

  if (config.custom && typeof config.custom === 'object') {
    for (const [key, value] of Object.entries(config.custom)) {
      if (!value || typeof value !== 'object') continue;
      const normalized = normalizeOgTargetPath(value.target_path || value.target_url || key);
      if (!normalized.valid) continue;
      const routeKey = normalized.routeKey;
      if (routes.some((route) => route.route_key === routeKey)) continue;
      routes.push({
        id: value.id || normalized.slug,
        route_type: value.route_type || normalized.routeType,
        slug: value.slug || normalized.slug,
        target_path: value.target_path || normalized.targetPath,
        route_key: routeKey,
        asset_path: value.asset_path || '',
        public_url: value.public_url || '',
        image: normalizeOgImagePath(value.image || value.asset_path || ''),
        title: value.title || '',
        description: value.description || '',
        created_at: value.created_at || '',
        updated_at: value.updated_at || ''
      });
    }
  }

  routes.sort((a, b) => String(a.target_path || '').localeCompare(String(b.target_path || '')));

  return {
    default: config.default || {
      title: 'Subi e-sevai Portal',
      description: 'Apply for E-Sevai services, view job alerts, and stay updated.',
      image: '/income_og_preview.jpg'
    },
    routes,
    routesByKey: routes.reduce((acc, route) => {
      acc[route.route_key] = route;
      return acc;
    }, {})
  };
};

export const findMatchingOgRecord = (ogConfig, targetInput) => {
  if (!ogConfig) return null;
  const rawStr = String(targetInput || '').trim();
  if (!rawStr) return null;

  const normalized = normalizeOgTargetPath(rawStr);
  const parsed = parseOgConfig(ogConfig);

  if (normalized.valid && parsed.routesByKey[normalized.routeKey]) {
    return parsed.routesByKey[normalized.routeKey];
  }

  const routeMatch = parsed.routes.find((r) =>
    r.slug === normalized.slug ||
    r.id === normalized.slug ||
    r.target_path === normalized.targetPath ||
    r.route_key === normalized.routeKey
  );
  if (routeMatch) return routeMatch;

  if (ogConfig.custom && typeof ogConfig.custom === 'object') {
    for (const [k, v] of Object.entries(ogConfig.custom)) {
      if (!v || typeof v !== 'object') continue;
      const kClean = String(k || '').toLowerCase();
      const targetClean = String(v.target_path || v.target_url || v.public_url || '').toLowerCase();
      const slugClean = String(v.slug || v.id || '').toLowerCase();

      if (
        kClean === normalized.slug ||
        kClean === normalized.routeKey ||
        kClean === rawStr.toLowerCase() ||
        slugClean === normalized.slug ||
        targetClean.endsWith(normalized.targetPath.toLowerCase())
      ) {
        return {
          id: v.id || normalized.slug,
          route_type: v.route_type || normalized.routeType,
          slug: v.slug || normalized.slug,
          target_path: v.target_path || normalized.targetPath,
          route_key: normalized.routeKey,
          image: normalizeOgImagePath(v.image || v.asset_path || ''),
          title: v.title || '',
          description: v.description || '',
          created_at: v.created_at || '',
          updated_at: v.updated_at || ''
        };
      }
    }
  }

  return null;
};

export const resolveOgRecordForTarget = (ogConfig, targetPath) => {
  const matched = findMatchingOgRecord(ogConfig, targetPath);
  if (matched) return matched;

  const normalized = normalizeOgTargetPath(targetPath);
  const parsed = parseOgConfig(ogConfig);

  if (normalized.valid && normalized.routeType !== 'default') {
    const routeFallback = parsed.routesByKey[normalized.routeType];
    if (routeFallback) {
      return routeFallback;
    }
  }

  return {
    ...parsed.default,
    image: normalizeOgImagePath(parsed.default.image || '/income_og_preview.jpg')
  };
};

export const getSupportedImageExtensions = () => Array.from(SUPPORTED_IMAGE_EXTENSIONS);

