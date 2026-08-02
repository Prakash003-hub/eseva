const ROUTE_TYPES = new Set(['default', 'form', 'post', 'job']);
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const stripQueryHash = (value) => String(value || '').split('?')[0].split('#')[0];

export const sanitizeOgSlug = (value) => {
  const cleaned = String(value || '')
    .trim()
    .replace(/\.(jpg|jpeg|png|webp)$/i, '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');

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
  const routeType = (parts[0] || '').toLowerCase();
  if (!ROUTE_TYPES.has(routeType)) {
    return { valid: false, error: `Invalid route type: ${routeType || pathname}` };
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

  const slug = sanitizeOgSlug(parts.slice(1).join('/'));
  if (!slug) {
    return { valid: false, error: 'Missing slug when required.' };
  }

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

export const resolveOgRecordForTarget = (ogConfig, targetPath) => {
  const normalized = normalizeOgTargetPath(targetPath);
  const parsed = parseOgConfig(ogConfig);

  if (!normalized.valid) {
    return {
      ...parsed.default,
      image: normalizeOgImagePath(parsed.default.image || '/income_og_preview.jpg')
    };
  }

  const exact = parsed.routesByKey[normalized.routeKey];
  if (exact) {
    return exact;
  }

  if (normalized.routeType !== 'default') {
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
