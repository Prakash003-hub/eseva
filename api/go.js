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

export default async function handler(req, res) {
  const { id } = req.query; // this represents the slug/id
  const userAgent = req.headers['user-agent'] || '';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'subionline.in';
  const baseUrl = `${protocol}://${host}`;

  const cleanId = (id || '').toString().trim().toLowerCase();
  
  if (!cleanId) {
    return res.redirect(302, '/user');
  }

  // Get scriptUrl
  const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;
  let redirectObj = null;

  if (scriptUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout
      
      // Fetch the specific redirect details from GAS
      const fetchUrl = `${scriptUrl}?action=getRedirectById&id=${encodeURIComponent(cleanId)}`;
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          redirectObj = json.data;
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch redirect for slug [${cleanId}] from GAS:`, err);
    }
  }

  // Fallback if not found in Spreadsheet
  if (!redirectObj) {
    return res.redirect(302, '/user');
  }

  const targetUrl = redirectObj.target_url || '/user';
  const title = redirectObj.title || 'SUBI Online Service';
  const description = redirectObj.description || 'Redirecting to SUBI Online Service...';
  const imageUrl = redirectObj.img_url || `${baseUrl}/income_og_preview.jpg`;
  const sharedUrl = `${baseUrl}/go/${cleanId}`;

  // Bot vs Real User Routing
  if (!isBot(userAgent)) {
    return res.redirect(302, targetUrl);
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
  <meta property="og:site_name" content="SUBI Online Service" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Fallback Redirect in case user-agent spoofed or browser got here -->
  <meta http-equiv="refresh" content="0;url=${targetUrl}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <img src="${imageUrl}" alt="${title}" />
  <script>
    window.location.replace("${targetUrl}");
  </script>
</body>
</html>`);
}
