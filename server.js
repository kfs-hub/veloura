/* ==========================================================================
   VELOURA DOTS - Main Express API Server
   Serves static web studio assets, commission APIs, & Admin Portal routes.
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const db = require('./db');
const { sendCommissionConfirmation } = require('./services/email');

const app = express();
const PORT = process.env.PORT || 5500;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'veloura2026';

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Uploads directory for reference images (supports Vercel /tmp)
const uploadsDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'moodboard-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const mimeValid = allowedTypes.test(file.mimetype);
        const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimeValid && extValid) {
            return cb(null, true);
        }
        cb(new Error('Only image files (JPG, PNG, WEBP) under 5MB are allowed!'));
    }
});

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

        // Process uploaded file paths
        const uploadedFiles = (req.files || []).map(file => ({
            originalName: file.originalname,
            path: `/uploads/${file.filename}`,
            size: file.size
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

// Add New Product Showcase Item (Admin)
app.post('/api/admin/products', verifyAdmin, upload.single('productImage'), async (req, res) => {
    try {
        const { title, category, categoryLabel, blurb, spec, surfaceType, palette, imageUrl, readyToShip } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Product title is required.' });
        }

        let finalImgUrl = imageUrl || 'showcase images/canvas.png';
        if (req.file) {
            finalImgUrl = `/uploads/${req.file.filename}`;
        }

        const product = await db.addProduct({
            title, category, categoryLabel, blurb, spec, surfaceType, palette,
            imageUrl: finalImgUrl, readyToShip
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
