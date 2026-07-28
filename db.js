/* ==========================================================================
   VELOURA DOTS - Pure PostgreSQL Database Layer
   Pure PostgreSQL database interface for commissions and product showcases.
   All methods are async — use with await in server.js
   ========================================================================== */

const { Pool } = require('pg');

// Connection pool (reads DATABASE_URL from .env)
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:veloura_admin@localhost:5432/veloura_dots';

const pool = new Pool({
    connectionString: connectionString,
    ssl: (process.env.DATABASE_URL || connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('vercel-storage.com'))
        ? { rejectUnauthorized: false }
        : false
});

let isPgConnected = false;

// Auto-initialize PostgreSQL tables, indexes, and seed default showcase items on connection
async function initTables(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS commissions (
            id              TEXT PRIMARY KEY,
            ref_id          TEXT UNIQUE NOT NULL,
            status          TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
            surface_type    TEXT,
            surface_size    TEXT,
            color_palette   TEXT,
            vision_text     TEXT,
            budget_range    TEXT,
            timeline_select TEXT,
            client_name     TEXT NOT NULL,
            client_email    TEXT NOT NULL,
            client_ig       TEXT,
            uploaded_files  JSONB DEFAULT '[]'::jsonb,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ
        );
        CREATE TABLE IF NOT EXISTS products (
            id             TEXT PRIMARY KEY,
            title          TEXT NOT NULL,
            category       TEXT NOT NULL DEFAULT 'canvas',
            category_label TEXT,
            blurb          TEXT,
            spec           TEXT,
            surface_type   TEXT,
            palette        TEXT,
            image_url      TEXT,
            ready_to_ship  BOOLEAN DEFAULT true,
            created_at     TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_commissions_ref_id ON commissions (ref_id);
        CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions (status);
        CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
    `);

    // Seed default showcase items if products table is empty
    const countRes = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
        const seedProducts = [
            { id: 'prod-1', title: 'Cosmic Sanctuary Mandala', category: 'canvas', categoryLabel: 'Canvases & Wall Art', blurb: 'Meditative focal points for modern spaces. Multi-layered acrylic dot mandalas painted on gallery-wrapped stretched canvas with liquid gold highlights.', spec: '12" x 12" Gallery Canvas', surfaceType: 'Canvas Art', palette: 'Veloura Classic', imageUrl: 'showcase images/canvas.png', readyToShip: true },
            { id: 'prod-2', title: 'Golden Solstice Coffee Mug', category: 'drinkware', categoryLabel: 'Mugs & Drinkware', blurb: 'Elevate your daily ritual. Custom hand-painted ceramic mugs featuring dense gold and ruby mandala dots, double-sealed with dishwasher-safe crystal gloss varnish.', spec: '15 oz Ceramic Drinkware', surfaceType: 'Ceramic Mug', palette: 'Veloura Classic', imageUrl: 'showcase images/mug.png', readyToShip: true },
            { id: 'prod-3', title: 'Ivory & Emerald Stainless Flask', category: 'drinkware', categoryLabel: 'Mugs & Drinkware', blurb: 'Tactile art on the go. Double-walled insulated stainless steel travel bottle adorned with high-precision vertical mandala dot columns.', spec: '750ml Vacuum Bottle', surfaceType: 'Stainless Bottle', palette: 'Emerald Sanctuary', imageUrl: 'showcase images/flask.png', readyToShip: true },
            { id: 'prod-4', title: 'Heirloom Jewelry Box', category: 'boxes', categoryLabel: 'Keepsake Boxes & Decor', blurb: "Treasured storage for life's sacred items. Hand-carved solid mahogany wooden box with a central multi-ring ruby and gold dot mandala lid design.", spec: '8" Wood Box with Velvet Lining', surfaceType: 'Wooden Box', palette: 'Veloura Classic', imageUrl: 'showcase images/jewelry_box.jpeg', readyToShip: true },
            { id: 'prod-5', title: 'Celestial Quartz Coaster Quad', category: 'boxes', categoryLabel: 'Keepsake Boxes & Decor', blurb: 'Functional table art. Set of 4 natural stone or acacia wood coasters painted with vibrant concentric metallic dot starbursts and heat-resistant resin topcoat.', spec: 'Set of 4 Stone/Wood Coasters', surfaceType: 'Coasters & Trays', palette: 'Celestial Moonlight', imageUrl: 'showcase images/coasters.png', readyToShip: true },
            { id: 'prod-6', title: 'Bespoke Client Objects', category: 'custom', categoryLabel: 'Custom Items', blurb: '"Have a specific object in mind? We can dot it." From acoustic guitars and leather journals to phone cases, candleholders, and keepsake decor.', spec: 'Client Provided Surface', surfaceType: 'Custom Object', palette: 'Custom Palette', imageUrl: 'showcase images/custom_item.png', readyToShip: false }
        ];

        for (const p of seedProducts) {
            await client.query(
                `INSERT INTO products (id, title, category, category_label, blurb, spec, surface_type, palette, image_url, ready_to_ship)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                 ON CONFLICT (id) DO NOTHING`,
                [p.id, p.title, p.category, p.categoryLabel, p.blurb, p.spec, p.surfaceType, p.palette, p.imageUrl, p.readyToShip]
            );
        }
    }
}

// Test connection on startup
pool.connect(async (err, client, release) => {
    if (err) {
        isPgConnected = false;
        console.error('❌ PostgreSQL connection error:', err.message);
    } else {
        isPgConnected = true;
        console.log('✅ PostgreSQL connected successfully');
        try {
            await initTables(client);
            console.log('✅ PostgreSQL tables & indexes verified/initialized');
        } catch (initErr) {
            console.error('⚠️ Error initializing PostgreSQL tables:', initErr.message);
        }
        release();
    }
});

function generateRefId() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `#VD-${num}`;
}

// Helper: map snake_case DB row → camelCase JS object
function mapCommission(row) {
    if (!row) return null;
    return {
        id: row.id,
        refId: row.ref_id,
        status: row.status,
        surfaceType: row.surface_type,
        surfaceSize: row.surface_size,
        colorPalette: row.color_palette,
        visionText: row.vision_text,
        budgetRange: row.budget_range,
        timelineSelect: row.timeline_select,
        clientName: row.client_name,
        clientEmail: row.client_email,
        clientIg: row.client_ig,
        uploadedFiles: typeof row.uploaded_files === 'string' ? JSON.parse(row.uploaded_files) : (row.uploaded_files || []),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function mapProduct(row) {
    if (!row) return null;
    return {
        id: row.id,
        title: row.title,
        category: row.category,
        categoryLabel: row.category_label,
        blurb: row.blurb,
        spec: row.spec,
        surfaceType: row.surface_type,
        palette: row.palette,
        imageUrl: row.image_url,
        readyToShip: row.ready_to_ship,
        createdAt: row.created_at
    };
}

const db = {

    // =========================================================================
    // COMMISSIONS
    // =========================================================================

    async saveCommission(data) {
        const refId = generateRefId();
        const id = `comm-${Date.now()}`;

        const result = await pool.query(
            `INSERT INTO commissions
             (id, ref_id, status, surface_type, surface_size, color_palette, vision_text,
              budget_range, timeline_select, client_name, client_email, client_ig, uploaded_files, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
             RETURNING *`,
            [
                id,
                refId,
                'PENDING_REVIEW',
                data.surfaceType || 'Canvas Art',
                data.surfaceSize || 'Medium',
                data.colorPalette || 'Veloura Classic',
                data.visionText || '',
                data.budgetRange || '$150 - $300',
                data.timelineSelect || 'Standard 3-4 Weeks',
                data.clientName || 'Valued Collector',
                data.clientEmail,
                data.clientIg || '',
                JSON.stringify(data.uploadedFiles || [])
            ]
        );
        return mapCommission(result.rows[0]);
    },

    async getCommissionByRef(refId) {
        const result = await pool.query(
            'SELECT * FROM commissions WHERE LOWER(ref_id) = LOWER($1)',
            [refId]
        );
        return mapCommission(result.rows[0]);
    },

    async getCommissionById(id) {
        const result = await pool.query(
            'SELECT * FROM commissions WHERE id = $1',
            [id]
        );
        return mapCommission(result.rows[0]);
    },

    async getAllCommissions() {
        const result = await pool.query(
            'SELECT * FROM commissions ORDER BY created_at DESC'
        );
        return result.rows.map(mapCommission);
    },

    async updateCommissionStatus(id, newStatus) {
        const result = await pool.query(
            `UPDATE commissions
             SET status = $1, updated_at = NOW()
             WHERE id = $2 OR ref_id = $2
             RETURNING *`,
            [newStatus, id]
        );
        return mapCommission(result.rows[0]);
    },

    // =========================================================================
    // PRODUCTS
    // =========================================================================

    async getAllProducts(category) {
        let result;
        if (!category || category === 'all') {
            result = await pool.query('SELECT * FROM products ORDER BY created_at ASC');
        } else {
            result = await pool.query(
                'SELECT * FROM products WHERE category = $1 ORDER BY created_at ASC',
                [category]
            );
        }
        return result.rows.map(mapProduct);
    },

    async addProduct(prodData) {
        const id = `prod-${Date.now()}`;

        const result = await pool.query(
            `INSERT INTO products
             (id, title, category, category_label, blurb, spec, surface_type, palette, image_url, ready_to_ship, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
             RETURNING *`,
            [
                id,
                prodData.title,
                prodData.category || 'canvas',
                prodData.categoryLabel || 'Canvases & Wall Art',
                prodData.blurb || '',
                prodData.spec || '',
                prodData.surfaceType || 'Canvas Art',
                prodData.palette || 'Veloura Classic',
                prodData.imageUrl || 'showcase images/canvas.png',
                prodData.readyToShip === true || prodData.readyToShip === 'true'
            ]
        );
        return mapProduct(result.rows[0]);
    },

    async deleteProduct(id) {
        const result = await pool.query(
            'DELETE FROM products WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rowCount > 0;
    },

    // Expose pool and connection state
    pool,
    getIsConnected: () => isPgConnected
};

module.exports = db;
