import fs from 'fs';
import path from 'path';

// List of user-agent substrings commonly associated with crawlers/bots
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
  return botAgents.some(bot => ua.includes(bot));
}

const getGoogleDriveId = (url) => {
  if (!url) return null;
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  return null;
};

const getImageUrl = (url, baseUrl, fallbackImage = '/income_og_preview.jpg') => {
  if (!url) return `${baseUrl}/${fallbackImage.replace(/^\/+/, '')}`;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('drive.google.com')) {
      const driveId = getGoogleDriveId(url);
      if (driveId) {
        return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
      }
    }
    return url;
  }
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    return `${baseUrl}/${url.replace(/^\/+/, '')}`;
  }
  return url;
};

// Default mock jobs list matching db.js
const defaultMockJobs = [
  {
    id: 1,
    title: "TNEB Wireman Recruitment",
    description: "Tamil Nadu Electricity Board (TNEB) announces openings for Wireman positions. Required qualification: ITI in Electrical Trade. Age limit: 18-35 years. Apply before June 30, 2026.",
    img_url: ""
  },
  {
    id: 2,
    title: "TNPSC Group 4 Openings",
    description: "TNPSC has released the recruitment notification for Group 4 services including VAO, Junior Assistant, and Typist. Minimum qualification: 10th standard pass. Apply today through the official channel.",
    img_url: ""
  },
  {
    id: "csir-csmcri",
    title: "CSIR-CSMCRI JRF & Project Assistant Recruitment",
    description: "CSIR - Central Salt and Marine Chemicals Research Institute invites applications for research fellows and project assistants. Apply online.",
    img_url: "https://upload.wikimedia.org/wikipedia/commons/e/e4/CSIR_India_logo.png"
  },
  {
    id: "tnpsc-group-4",
    title: "TNPSC Group 4 Exam Recruitment 2026",
    description: "Official recruitment for TNPSC Group 4 services (VAO, Typist, Junior Assistant). Check eligibility, syllabus and apply now.",
    img_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Tamil_Nadu_State_Emblem.svg/512px-Tamil_Nadu_State_Emblem.svg.png"
  }
];

// Default mock products list matching db.js
const defaultMockProducts = [
  {
    ProductID: "prod-1",
    Category: "Phone Cover",
    CoverType: "Case",
    Brand: "Samsung",
    CustomBrand: "",
    ModelName: "Samsung S24 Ultra",
    ProductName: "Samsung S24 Ultra Clear Case",
    Type: "",
    Price: "299",
    TagNumber: "TAG-S24U-01",
    ImageURL: "",
    Count: "5"
  },
  {
    ProductID: "prod-2",
    Category: "Phone Cover",
    CoverType: "Flip Case",
    Brand: "Apple",
    CustomBrand: "",
    ModelName: "iPhone 15 Pro",
    ProductName: "iPhone 15 Pro Leather Flip Case",
    Type: "",
    Price: "499",
    TagNumber: "TAG-IP15P-02",
    ImageURL: "",
    Count: "0"
  },
  {
    ProductID: "prod-3",
    Category: "Headphone",
    CoverType: "",
    Brand: "Sony",
    CustomBrand: "",
    ModelName: "",
    ProductName: "SUBI BassBoost Wireless Headphone",
    Type: "",
    Price: "999",
    TagNumber: "TAG-HP-03",
    ImageURL: "",
    Count: "3"
  },
  {
    ProductID: "prod-4",
    Category: "Speaker",
    CoverType: "",
    Brand: "JBL",
    CustomBrand: "",
    ModelName: "",
    ProductName: "SUBI Go Portable Bluetooth Speaker",
    Type: "",
    Price: "1499",
    TagNumber: "TAG-SPK-04",
    ImageURL: "",
    Count: "0"
  },
  {
    ProductID: "prod-5",
    Category: "Charger",
    CoverType: "",
    Brand: "Anker",
    CustomBrand: "",
    ModelName: "",
    ProductName: "SUBI SuperCharge Dual Port 33W",
    Type: "Fast Charger",
    Price: "350",
    TagNumber: "TAG-CHG-05",
    ImageURL: "",
    Count: "10"
  }
];

export default async function handler(req, res) {
  const { type, id } = req.query;
  const userAgent = req.headers['user-agent'] || '';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'tnsevai.vercel.app';
  const baseUrl = `${protocol}://${host}`;

  // Read config file for fallback values
  const ogConfigPath = path.join(process.cwd(), 'public/data/og.json');
  let ogConfig = {};
  try {
    ogConfig = JSON.parse(fs.readFileSync(ogConfigPath, 'utf8'));
  } catch (e) {
    console.error('Failed to read public/data/og.json:', e);
  }

  // Determine typeKey (mapping user tabs if type === 'user')
  let typeKey = ['post', 'form', 'job', 'product', 'accessories'].includes(type) ? type : 'post';
  if (type === 'user') {
    const tab = req.query.tab;
    if (tab === 'accessories') {
      typeKey = 'product';
    } else if (tab === 'apply') {
      typeKey = 'form';
    } else if (tab === 'home') {
      typeKey = 'post';
    }
  } else if (type === 'accessories') {
    typeKey = 'product';
  }

  const defaults = ogConfig[typeKey] || {
    title: 'Subi e sevai Portal',
    description: 'Apply for E-Sevai services, view job alerts, and stay updated.',
    image: '/income_og_preview.jpg'
  };

  // Determine redirectPath
  let redirectPath = '/user';
  if (type === 'user') {
    // Reconstruct /user with its query parameters except 'type'
    const queryParams = new URLSearchParams(req.query);
    queryParams.delete('type');
    const queryString = queryParams.toString();
    redirectPath = `/user${queryString ? '?' + queryString : ''}`;
  } else if (type === 'home') {
    redirectPath = '/';
  }

  // Determine sharedUrl
  const sharedUrl = type === 'home'
    ? baseUrl
    : (type === 'user' ? `${baseUrl}${redirectPath}` : `${baseUrl}/${type}/${id}`);

  let title = defaults.title;
  let description = defaults.description;
  let imageUrl = `${baseUrl}/${defaults.image.replace(/^\/+/, '')}`;
  let item = null;

  try {
    const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;

    // 1. Read local database first to minimize time delay for static items
    const dataPath = path.join(process.cwd(), 'src/data.json');
    let mockData = { forms: [], posts: [] };
    try {
      mockData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (e) {
      console.error('Failed to read local data.json:', e);
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

    // Try to find the item locally first (extremely fast, no network delay)
    if (type === 'product' || type === 'accessories') {
      item = localItems.find(x => String(x.ProductID) === String(id));
    } else {
      item = localItems.find(x => String(x.id) === String(id));
    }

    // 2. If not found locally, fetch live data from GAS (with reduced timeout of 1.2s to prevent bot timeouts)
    if (!item && scriptUrl) {
      try {
        let actionName = 'getPosts';
        if (type === 'job') actionName = 'getJobs';
        if (type === 'form') actionName = 'getForms';
        if (type === 'product' || type === 'accessories') actionName = 'getProducts';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout

        const response = await fetch(scriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action: actionName }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          if (json.success && Array.isArray(json.data)) {
            if (type === 'product' || type === 'accessories') {
              item = json.data.find(x => String(x.ProductID) === String(id));
            } else {
              item = json.data.find(x => String(x.id) === String(id));
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch ${type} from GAS (timeout or network error):`, err);
      }
    }

    // Add debug logging
    console.log("Item:", item);

    // 4. Map tags and redirect paths
    if (item) {
      if (type === 'product' || type === 'accessories') {
        title = item.ProductName || `${item.Brand} ${item.ModelName} (${item.Category})`;
        description = `Price: ₹${item.Price} | Category: ${item.Category} | Brand: ${item.Brand} ${item.ModelName ? `- ${item.ModelName}` : ''}`;
        imageUrl = getImageUrl(item.ImageURL || item.img_url, baseUrl, defaults.image);
      } else {
        title = item.title;
        description = item.description;
        imageUrl = getImageUrl(item.img_url, baseUrl, defaults.image);
      }
    }

    if (type === 'post') {
      redirectPath = `/user?tab=home&postId=${id}`;
    } else if (type === 'job') {
      redirectPath = `/user?tab=home&jobId=${id}`;
    } else if (type === 'form') {
      redirectPath = `/user?tab=apply&formId=${id}`;
    } else if (type === 'product' || type === 'accessories') {
      redirectPath = `/user?tab=accessories&productId=${id}`;
    }

  } catch (err) {
    console.error('Error processing sharing request:', err);
  }

  // 5. Bot vs Real User Routing
  if (!isBot(userAgent)) {
    return res.redirect(302, redirectPath);
  }

  // Pre-render HTML for bot social sharing crawlers
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}" />
  
  <!-- SEO & Standard Meta Tags -->
  <link rel="canonical" href="${sharedUrl}" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:url" content="${sharedUrl}" />
  <meta property="og:site_name" content="Subi e sevai" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Fallback Redirect in case user-agent spoofed or browser got here -->
  <meta http-equiv="refresh" content="0;url=${redirectPath}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${imageUrl}" alt="${title}" />
  <script>
    window.location.replace("${redirectPath}");
  </script>
</body>
</html>`);
}
