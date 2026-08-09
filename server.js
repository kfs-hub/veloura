/* ==========================================================================
   VELOURA DOTS - Main Express API Server
   Serves static web studio assets, commission APIs, & Admin Portal routes.
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { put } = require('@vercel/blob');
require('dotenv').config();

const db = require('./db');
const { sendCommissionConfirmation } = require('./services/email');

const app = express();
const PORT = process.env.PORT || 5500;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'veloura2026';

// Helper to upload image to Vercel Blob (if configured) or Base64 fallback
async function uploadImageToBlobOrBase64(file, folder = 'showcase') {
    if (!file) return null;
    try {
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            const ext = path.extname(file.originalname) || '.png';
            const safeName = path.basename(file.originalname, ext).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            const blobPath = `${folder}/${safeName}-${Date.now()}${ext}`;
            let blob;
            try {
                blob = await put(blobPath, file.buffer, { access: 'public' });
            } catch (putErr) {
                if (putErr.message && putErr.message.includes('private store')) {
                    blob = await put(blobPath, file.buffer, { access: 'private' });
                } else {
                    throw putErr;
                }
            }
            return blob.url;
        }
    } catch (err) {
        console.warn('Vercel Blob upload warning, falling back to Base64 Data URI:', err.message);
    }
    const mime = file.mimetype || 'image/png';
    const base64 = file.buffer.toString('base64');
    return `data:${mime};base64,${base64}`;
}

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Memory Storage Multer Configuration for Vercel Serverless & Vercel Blob Storage
const uploadShowcase = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4.5 * 1024 * 1024 }, // 4.5MB limit (fits within Vercel serverless request body limit)
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const mimeValid = allowedTypes.test(file.mimetype);
        const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimeValid && extValid) {
            return cb(null, true);
        }
        cb(new Error('Only image files (JPG, PNG, WEBP) under 4.5MB are allowed!'));
    }
});

const upload = uploadShowcase; // Reuse memory storage multer for commission attachments

// Admin Passkey Verification Middleware
function verifyAdmin(req, res, next) {
    const passcode = req.headers['x-admin-passcode'] || req.query.passcode;
    if (passcode === ADMIN_PASSCODE) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid Admin Passcode'
    });
}

// Serve static frontend files
app.use(express.static(__dirname));

// ==========================================================================
// PUBLIC CLIENT API ENDPOINTS
// ==========================================================================

// 1. Submit Custom Commission Inquiries
app.post('/api/commissions', upload.array('referenceFiles', 5), async (req, res) => {
    try {
        const {
            surfaceType,
            surfaceSize,
            colorPalette,
            visionText,
            budgetRange,
            timelineSelect,
            clientName,
            clientEmail,
            clientIg
        } = req.body;

        if (!clientName || !clientEmail) {
            return res.status(400).json({
                success: false,
                message: 'Name and Email Address are required to submit a commission request.'
            });
        }

        // Process uploaded reference files via Vercel Blob
        const uploadedFiles = await Promise.all((req.files || []).map(async file => {
            const uploadedUrl = await uploadImageToBlobOrBase64(file, 'moodboard');
            return {
                originalName: file.originalname,
                path: uploadedUrl,
                size: file.size
            };
        }));

        // Persist to PostgreSQL FIRST — before any email attempt
        const commission = await db.saveCommission({
            surfaceType,
            surfaceSize,
            colorPalette,
            visionText,
            budgetRange,
            timelineSelect,
            clientName,
            clientEmail,
            clientIg,
            uploadedFiles
        });

        // Respond immediately with success so the client always gets the ref ID
        res.status(201).json({
            success: true,
            message: 'Commission request submitted successfully!',
            commission: {
                refId: commission.refId,
                clientName: commission.clientName,
                clientEmail: commission.clientEmail,
                clientIg: commission.clientIg,
                surfaceType: commission.surfaceType,
                createdAt: commission.createdAt
            }
        });

        // Send emails asynchronously (fire-and-forget) — never blocks the HTTP response
        sendCommissionConfirmation(commission).catch(err => {
            console.error('Email send error (non-critical):', err.message);
        });

    } catch (err) {
        console.error('Error submitting commission:', err);
        res.status(500).json({
            success: false,
            message: 'An error occurred while saving your request. Please try again.'
        });
    }
});

// 2. Lookup Commission Status by Ref ID
app.get('/api/commissions/:refId', async (req, res) => {
    try {
        const { refId } = req.params;
        const commission = await db.getCommissionByRef(refId);

        if (!commission) {
            return res.status(404).json({
                success: false,
                message: `No commission found matching reference ID ${refId}.`
            });
        }

        res.json({ success: true, commission });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error.' });
    }
});

// 3. Get Showcase Products Catalog
app.get('/api/products', async (req, res) => {
    try {
        const { category } = req.query;
        const products = await db.getAllProducts(category);
        res.json({ success: true, count: products.length, products });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error.' });
    }
});

// ==========================================================================
// ADMIN PORTAL ENDPOINTS
// ==========================================================================

// Verify Passcode
app.post('/api/admin/verify', (req, res) => {
    const { passcode } = req.body;
    if (passcode === ADMIN_PASSCODE) {
        return res.json({ success: true, message: 'Authenticated' });
    }
    return res.status(401).json({ success: false, message: 'Invalid Admin Passcode' });
});

// Get All Commissions (Admin)
app.get('/api/admin/commissions', verifyAdmin, async (req, res) => {
    try {
        const commissions = await db.getAllCommissions();

        const total = commissions.length;
        const pending = commissions.filter(c => c.status === 'PENDING_REVIEW').length;
        const inProgress = commissions.filter(c => c.status === 'IN_PROGRESS').length;
        const completed = commissions.filter(c => c.status === 'COMPLETED').length;

        res.json({
            success: true,
            metrics: { total, pending, inProgress, completed },
            commissions
        });
    } catch (err) {
        console.error('Admin commissions error:', err);
        res.status(500).json({ success: false, message: 'Database error.' });
    }
});

// Update Commission Status (Admin)
app.put('/api/admin/commissions/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = ['PENDING_REVIEW', 'PROOF_SENT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value.' });
        }

        const updated = await db.updateCommissionStatus(id, status);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Commission record not found.' });
        }

        res.json({ success: true, message: `Commission status updated to ${status}`, commission: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error.' });
    }
});

// Add New Product Showcase Item (Admin) — supports multiple images
app.post('/api/admin/products', verifyAdmin, uploadShowcase.array('productImages', 10), async (req, res) => {
    try {
        const { title, category, categoryLabel, blurb, spec, surfaceType, surfaceSize, palette, budgetRange, timelineSelect, imageUrl, readyToShip } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Product title is required.' });
        }

        // Upload all attached files to Blob
        const uploadedUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadImageToBlobOrBase64(file);
                if (url) uploadedUrls.push(url);
            }
        }

        // Primary image: first uploaded file, or the URL field, or default
        const finalImgUrl = uploadedUrls[0] || imageUrl || 'showcase images/canvas.png';

        // All images array (uploaded files + optional URL if not already included)
        const allImageUrls = [...uploadedUrls];
        if (imageUrl && !allImageUrls.includes(imageUrl)) {
            allImageUrls.push(imageUrl);
        }

        const product = await db.addProduct({
            title, category, categoryLabel, blurb, spec, surfaceType, surfaceSize, palette,
            budgetRange, timelineSelect,
            imageUrl: finalImgUrl,
            imageUrls: allImageUrls,
            readyToShip
        });

        res.status(201).json({
            success: true,
            message: 'New artwork product added to showcase catalog!',
            product
        });
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ success: false, message: 'Failed to add product item.' });
    }
});

// Update Existing Product Showcase Item (Admin) — supports multiple images
app.put('/api/admin/products/:id', verifyAdmin, uploadShowcase.array('productImages', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, categoryLabel, blurb, spec, surfaceType, surfaceSize, palette, budgetRange, timelineSelect, imageUrl, readyToShip, existingImageUrls } = req.body;

        // Parse existing image URLs that the admin chose to keep
        let keptUrls = [];
        if (existingImageUrls) {
            try {
                keptUrls = JSON.parse(existingImageUrls);
                if (!Array.isArray(keptUrls)) keptUrls = [];
            } catch (e) { keptUrls = []; }
        }

        // Upload new files to Blob
        const newUploadedUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadImageToBlobOrBase64(file);
                if (url) newUploadedUrls.push(url);
            }
        }

        // Merge: kept existing + newly uploaded
        const allImageUrls = [...keptUrls, ...newUploadedUrls];

        // Primary image: first in the merged list, or imageUrl field, or leave unchanged
        let finalImgUrl = allImageUrls[0] || imageUrl || undefined;

        const updated = await db.updateProduct(id, {
            title, category, categoryLabel, blurb, spec, surfaceType, surfaceSize, palette,
            budgetRange, timelineSelect,
            imageUrl: finalImgUrl,
            imageUrls: allImageUrls.length > 0 ? allImageUrls : undefined,
            readyToShip: readyToShip !== undefined ? (readyToShip === true || readyToShip === 'true') : undefined
        });

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Product item not found.' });
        }

        res.json({
            success: true,
            message: 'Product updated successfully!',
            product: updated
        });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ success: false, message: 'Failed to update product item.' });
    }
});

// Delete Product Showcase Item (Admin)
app.delete('/api/admin/products/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await db.deleteProduct(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Product item not found.' });
        }
        res.json({ success: true, message: 'Product deleted from showcase.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error.' });
    }
});

// Express Error Handling Middleware (Catches Multer errors & server errors cleanly for Vercel)
app.use((err, req, res, next) => {
    console.error('Express App Error Handler:', err);
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: 'Uploaded file exceeds size limit (4.5MB). Image will be auto-compressed.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
        });
    }
    return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An unexpected error occurred on the server.'
    });
});

// Graceful shutdown — close PG pool on exit
process.on('SIGTERM', async () => {
    await db.pool.end();
    process.exit(0);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', studio: 'Veloura Dots Boutique Server' });
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`✨ Veloura Dots Server running on http://localhost:${PORT}`);
    console.log(`👑 Studio Admin Portal live at http://localhost:${PORT}/admin.html`);
    console.log(`======================================================\n`);
});
