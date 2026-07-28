/* ==========================================================================
   VELOURA DOTS - PostgreSQL Database Layer with Fallback Support
   Pure PostgreSQL database interface for commissions and product showcases.
   Supports local JSON database fallback if PostgreSQL service is offline.
   All methods are async — use with await in server.js
   ========================================================================== */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'db.json');

// Connection pool (reads DATABASE_URL from .env)
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:veloura_admin@localhost:5432/veloura_dots';

const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('render.com') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : false
});

let isPgConnected = false;

// Helper JSON DB operations for dev fallback
function readJsonDb() {
    try {
        if (!fs.existsSync(dbPath)) {
            const initial = { commissions: [], products: [] };
            fs.mkdirSync(path.dirname(dbPath), { recursive: true });
            fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2));
            return initial;
        }
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (!data.commissions) data.commissions = [];
        if (!data.products) data.products = [];
        return data;
    } catch (e) {
        return { commissions: [], products: [] };
    }
}

function writeJsonDb(data) {
    try {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error writing fallback DB:', e.message);
    }
}

// Auto-initialize PostgreSQL tables and indexes on connection
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
}

// Test connection on startup
pool.connect(async (err, client, release) => {
    if (err) {
        isPgConnected = false;
        console.log('💡 PostgreSQL not running locally — using JSON fallback (data/db.json)');
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

        if (isPgConnected) {
            try {
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
            } catch (err) {
                console.error('PostgreSQL save error, using fallback:', err.message);
            }
        }

        // Fallback: save to JSON file
        const store = readJsonDb();
        const newComm = {
            id,
            refId,
            status: 'PENDING_REVIEW',
            surfaceType: data.surfaceType || 'Canvas Art',
            surfaceSize: data.surfaceSize || 'Medium',
            colorPalette: data.colorPalette || 'Veloura Classic',
            visionText: data.visionText || '',
            budgetRange: data.budgetRange || '$150 - $300',
            timelineSelect: data.timelineSelect || 'Standard 3-4 Weeks',
            clientName: data.clientName || 'Valued Collector',
            clientEmail: data.clientEmail,
            clientIg: data.clientIg || '',
            uploadedFiles: data.uploadedFiles || [],
            createdAt: new Date().toISOString(),
            updatedAt: null
        };
        store.commissions.push(newComm);
        writeJsonDb(store);
        return newComm;
    },

    async getCommissionByRef(refId) {
        if (isPgConnected) {
            try {
                const result = await pool.query(
                    'SELECT * FROM commissions WHERE LOWER(ref_id) = LOWER($1)',
                    [refId]
                );
                if (result.rows[0]) return mapCommission(result.rows[0]);
            } catch (err) {
                console.error('PostgreSQL query error, using fallback:', err.message);
            }
        }

        const store = readJsonDb();
        return store.commissions.find(c => c.refId.toLowerCase() === refId.toLowerCase()) || null;
    },

    async getCommissionById(id) {
        if (isPgConnected) {
            try {
                const result = await pool.query(
                    'SELECT * FROM commissions WHERE id = $1',
                    [id]
                );
                if (result.rows[0]) return mapCommission(result.rows[0]);
            } catch (err) {
                console.error('PostgreSQL query error, using fallback:', err.message);
            }
        }

        const store = readJsonDb();
        return store.commissions.find(c => c.id === id) || null;
    },

    async getAllCommissions() {
        if (isPgConnected) {
            try {
                const result = await pool.query(
                    'SELECT * FROM commissions ORDER BY created_at DESC'
                );
                return result.rows.map(mapCommission);
            } catch (err) {
                console.error('PostgreSQL query error, using fallback:', err.message);
            }
        }

        const store = readJsonDb();
        return store.commissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    async updateCommissionStatus(id, newStatus) {
        if (isPgConnected) {
            try {
                const result = await pool.query(
                    `UPDATE commissions
                     SET status = $1, updated_at = NOW()
                     WHERE id = $2 OR ref_id = $2
                     RETURNING *`,
                    [newStatus, id]
                );
                if (result.rows[0]) return mapCommission(result.rows[0]);
            } catch (err) {
                console.error('PostgreSQL update error, using fallback:', err.message);
            }
        }

        const store = readJsonDb();
        const item = store.commissions.find(c => c.id === id || c.refId === id);
        if (!item) return null;
        item.status = newStatus;
        item.updatedAt = new Date().toISOString();
        writeJsonDb(store);
        return item;
    },

    // =========================================================================
    // PRODUCTS
    // =========================================================================

    async getAllProducts(category) {
        if (isPgConnected) {
            try {
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
            } catch (err) {
                console.error('PostgreSQL product query error, using fallback:', err.message);
            }
        }

        const store = readJsonDb();
        const defaultProducts = [
            { id: 'prod-1', title: 'Cosmic Sanctuary Mandala', category: 'canvas', categoryLabel: 'Canvases & Wall Art', blurb: 'Meditative focal points for modern spaces. Multi-layered acrylic dot mandalas painted on gallery-wrapped stretched canvas with liquid gold highlights.', spec: '12" x 12" Gallery Canvas', surfaceType: 'Canvas Art', palette: 'Veloura Classic', imageUrl: 'showcase images/canvas.png', readyToShip: true },
            { id: 'prod-2', title: 'Golden Solstice Coffee Mug', category: 'drinkware', categoryLabel: 'Mugs & Drinkware', blurb: 'Elevate your daily ritual. Custom hand-painted ceramic mugs featuring dense gold and ruby mandala dots, double-sealed with dishwasher-safe crystal gloss varnish.', spec: '15 oz Ceramic Drinkware', surfaceType: 'Ceramic Mug', palette: 'Veloura Classic', imageUrl: 'showcase images/mug.png', readyToShip: true },
            { id: 'prod-3', title: 'Ivory & Emerald Stainless Flask', category: 'drinkware', categoryLabel: 'Mugs & Drinkware', blurb: 'Tactile art on the go. Double-walled insulated stainless steel travel bottle adorned with high-precision vertical mandala dot columns.', spec: '750ml Vacuum Bottle', surfaceType: 'Stainless Bottle', palette: 'Emerald Sanctuary', imageUrl: 'showcase images/flask.png', readyToShip: true },
            { id: 'prod-4', title: 'Heirloom Jewelry Box', category: 'boxes', categoryLabel: 'Keepsake Boxes & Decor', blurb: "Treasured storage for life's sacred items. Hand-carved solid mahogany wooden box with a central multi-ring ruby and gold dot mandala lid design.", spec: '8" Wood Box with Velvet Lining', surfaceType: 'Wooden Box', palette: 'Veloura Classic', imageUrl: 'showcase images/jewelry_box.jpeg', readyToShip: true },
            { id: 'prod-5', title: 'Celestial Quartz Coaster Quad', category: 'boxes', categoryLabel: 'Keepsake Boxes & Decor', blurb: 'Functional table art. Set of 4 natural stone or acacia wood coasters painted with vibrant concentric metallic dot starbursts and heat-resistant resin topcoat.', spec: 'Set of 4 Stone/Wood Coasters', surfaceType: 'Coasters & Trays', palette: 'Celestial Moonlight', imageUrl: 'showcase images/coasters.png', readyToShip: true },
            { id: 'prod-6', title: 'Bespoke Client Objects', category: 'custom', categoryLabel: 'Custom Items', blurb: '"Have a specific object in mind? We can dot it." From acoustic guitars and leather journals to phone cases, candleholders, and keepsake decor.', spec: 'Client Provided Surface', surfaceType: 'Custom Object', palette: 'Custom Palette', imageUrl: 'showcase images/custom_item.png', readyToShip: false }
        ];

        let list = store.products.length > 0 ? store.products : defaultProducts;
        if (category && category !== 'all') {
            list = list.filter(p => p.category === category);
        }
        return list;
    },

    async addProduct(prodData) {
        const id = `prod-${Date.now()}`;

        if (isPgConnected) {
            try {
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
            } catch (err) {
                console.error('PostgreSQL product add error, using fallback:', err.message);
            }
        }

        const store = readJsonDb();
        const newProd = {
            id,
            title: prodData.title,
            category: prodData.category || 'canvas',
            categoryLabel: prodData.categoryLabel || 'Canvases & Wall Art',
            blurb: prodData.blurb || '',
            spec: prodData.spec || '',
            surfaceType: prodData.surfaceType || 'Canvas Art',
            palette: prodData.palette || 'Veloura Classic',
            imageUrl: prodData.imageUrl || 'showcase images/canvas.png',
            readyToShip: prodData.readyToShip === true || prodData.readyToShip === 'true',
            createdAt: new Date().toISOString()
        };
        store.products.push(newProd);
        writeJsonDb(store);
        return newProd;
    },

    async deleteProduct(id) {
        if (isPgConnected) {
            try {
                const result = await pool.query(
                    'DELETE FROM products WHERE id = $1 RETURNING id',
                    [id]
                );
                return result.rowCount > 0;
            } catch (err) {
                console.error('PostgreSQL product delete error, using fallback:', err.message);
            }
        }

        const store = readJsonDb();
        const initialLength = store.products.length;
        store.products = store.products.filter(p => p.id !== id);
        if (store.products.length !== initialLength) {
            writeJsonDb(store);
            return true;
        }
        return false;
    },

    // Expose pool and connection state
    pool,
    getIsConnected: () => isPgConnected
};

module.exports = db;

