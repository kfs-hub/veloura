/* ==========================================================================
   VELOURA DOTS - Static Image Upload Script for Vercel Blob
   Uploads all static images (logo, showcase images, ig image, color palette)
   to Vercel Blob storage and generates a Vercel Blob asset map.
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');
require('dotenv').config();

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!BLOB_TOKEN) {
    console.error('❌ Error: BLOB_READ_WRITE_TOKEN environment variable is not set.');
    console.error('Please set BLOB_READ_WRITE_TOKEN in your .env file or run with Vercel CLI.');
    process.exit(1);
}

const staticDirs = [
    { dir: 'showcase images', folder: 'showcase' },
    { dir: 'ig image', folder: 'instagram' },
    { dir: 'color palette', folder: 'palettes' }
];

async function safePut(pathname, buffer) {
    try {
        return await put(pathname, buffer, { access: 'public', token: BLOB_TOKEN });
    } catch (err) {
        if (err.message && err.message.includes('private store')) {
            return await put(pathname, buffer, { access: 'private', token: BLOB_TOKEN });
        }
        throw err;
    }
}

async function uploadStaticAssets() {
    console.log('🚀 Starting Vercel Blob Static Assets Upload...\n');
    const assetMap = {};

    // 1. Upload logo.png
    const logoPath = path.join(__dirname, '..', 'logo.png');
    if (fs.existsSync(logoPath)) {
        console.log('Uploading logo.png...');
        const buffer = fs.readFileSync(logoPath);
        const blob = await safePut('branding/logo.png', buffer);
        assetMap['logo.png'] = blob.url;
        console.log(`✅ logo.png -> ${blob.url}`);
    }

    // 2. Upload directories
    for (const item of staticDirs) {
        const fullDir = path.join(__dirname, '..', item.dir);
        if (fs.existsSync(fullDir)) {
            const files = fs.readdirSync(fullDir);
            for (const file of files) {
                const filePath = path.join(fullDir, file);
                if (fs.statSync(filePath).isFile()) {
                    console.log(`Uploading ${item.dir}/${file}...`);
                    const buffer = fs.readFileSync(filePath);
                    const ext = path.extname(file);
                    const safeName = path.basename(file, ext).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                    const blob = await safePut(`${item.folder}/${safeName}${ext}`, buffer);
                    const relKey = `${item.dir}/${file}`;
                    assetMap[relKey] = blob.url;
                    console.log(`✅ ${relKey} -> ${blob.url}`);
                }
            }
        }
    }

    console.log('\n======================================================');
    console.log('✨ All Static Assets Uploaded to Vercel Blob!');
    console.log('======================================================\n');

    // Save asset map to json
    fs.writeFileSync(path.join(__dirname, '..', 'blob-assets.json'), JSON.stringify(assetMap, null, 2));
    console.log('📄 Saved asset mapping to blob-assets.json');
}

uploadStaticAssets().catch(err => {
    console.error('❌ Upload error:', err);
});
