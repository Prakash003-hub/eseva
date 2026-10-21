import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processIcons() {
  const inputPath = 'C:\\Users\\praka\\.gemini\\antigravity-ide\\brain\\1de3c85f-0ed9-4cff-a5a8-310a5c075153\\.user_uploaded\\media_1792560398463.jpg';
  const publicDir = path.resolve(__dirname, '../public');

  console.log('Reading uploaded image from:', inputPath);
  const img = await Jimp.read(inputPath);
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  console.log(`Original image size: ${w}x${h}`);

  // Find tight bounding box of the green emblem
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = img.bitmap.data[idx];
      const g = img.bitmap.data[idx + 1];
      const b = img.bitmap.data[idx + 2];
      // non-white threshold
      if (r < 240 || g < 240 || b < 240) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Add 10px breathing room
  minX = Math.max(0, minX - 10);
  maxX = Math.min(w - 1, maxX + 10);
  minY = Math.max(0, minY - 10);
  maxY = Math.min(h - 1, maxY + 10);

  const emblemW = maxX - minX;
  const emblemH = maxY - minY;
  console.log(`Cropped emblem size: ${emblemW}x${emblemH}`);

  // Crop to emblem
  const cropped = img.clone().crop({ x: minX, y: minY, w: emblemW, h: emblemH });

  // Function to create a padded, centered icon on pure #FFFFFF background
  async function createPaddedIcon(size, paddingRatio = 0.80) {
    const canvas = new Jimp({ width: size, height: size, color: 0xFFFFFFFF });
    
    // Scale emblem so its max dimension matches (size * paddingRatio)
    const targetDim = Math.round(size * paddingRatio);
    let targetW, targetH;
    if (emblemW > emblemH) {
      targetW = targetDim;
      targetH = Math.round(emblemH * (targetDim / emblemW));
    } else {
      targetH = targetDim;
      targetW = Math.round(emblemW * (targetDim / emblemH));
    }

    const scaledEmblem = cropped.clone().resize({ w: targetW, h: targetH });
    
    // Center it on canvas
    const offsetX = Math.round((size - targetW) / 2);
    const offsetY = Math.round((size - targetH) / 2);

    canvas.composite(scaledEmblem, offsetX, offsetY);
    return canvas;
  }

  // 1. whatsbro_logo.png (512x512)
  const logo512 = await createPaddedIcon(512, 0.82);
  const origLogoPath = path.join(publicDir, 'whatsbro_logo.png');
  await logo512.write(origLogoPath);
  console.log('Generated whatsbro_logo.png (512x512)');

  // 2. icon-512.png (512x512 - Android launcher standard)
  const icon512Path = path.join(publicDir, 'icon-512.png');
  await logo512.write(icon512Path);
  console.log('Generated icon-512.png (512x512)');

  // 3. icon-192.png (192x192 - Android home screen standard)
  const icon192 = await createPaddedIcon(192, 0.82);
  const icon192Path = path.join(publicDir, 'icon-192.png');
  await icon192.write(icon192Path);
  console.log('Generated icon-192.png (192x192)');

  // 4. apple-touch-icon.png (180x180 - iOS Home Screen)
  const icon180 = await createPaddedIcon(180, 0.80);
  const icon180Path = path.join(publicDir, 'apple-touch-icon.png');
  await icon180.write(icon180Path);
  console.log('Generated apple-touch-icon.png (180x180)');

  // 5. favicon.png (64x64)
  const icon64 = await createPaddedIcon(64, 0.88);
  const icon64Path = path.join(publicDir, 'favicon.png');
  await icon64.write(icon64Path);
  console.log('Generated favicon.png (64x64)');

  // 6. whatsbro_avatar.png (512x512)
  const avatarPath = path.join(publicDir, 'whatsbro_avatar.png');
  await logo512.write(avatarPath);
  console.log('Generated whatsbro_avatar.png (512x512)');

  console.log('All icons generated successfully with optimal mobile safe-zones!');
}

processIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
