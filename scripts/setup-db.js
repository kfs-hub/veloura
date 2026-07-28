/* ==========================================================================
   VELOURA DOTS - Database Setup & Seed Script
   Run ONCE after PostgreSQL is installed and DATABASE_URL is set in .env:
       node scripts/setup-db.js
   ========================================================================== */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setup() {
    console.log('\n🎨 Veloura Dots - PostgreSQL Setup\n');

    const client = await pool.connect();

    try {
        // Create commissions table
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
        `);
        console.log('✅ Table created: commissions');

        // Create products table
        await client.query(`
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
        `);
        console.log('✅ Table created: products');

        // Seed default showcase products (skip if already exist)
        const seedProducts = [
            { id: 'prod-1', title: 'Cosmic Sanctuary Mandala', category: 'canvas', categoryLabel: 'Canvases & Wall Art', blurb: 'Meditative focal points for modern spaces. Multi-layered acrylic dot mandalas painted on gallery-wrapped stretched canvas with liquid gold highlights.', spec: '12" x 12" Gallery Canvas', surfaceType: 'Canvas Art', palette: 'Veloura Classic', imageUrl: 'showcase images/canvas.png', readyToShip: true },
            { id: 'prod-2', title: 'Golden Solstice Coffee Mug', category: 'drinkware', categoryLabel: 'Mugs & Drinkware', blurb: 'Elevate your daily ritual. Custom hand-painted ceramic mugs featuring dense gold and ruby mandala dots, double-sealed with dishwasher-safe crystal gloss varnish.', spec: '15 oz Ceramic Drinkware', surfaceType: 'Ceramic Mug', palette: 'Veloura Classic', imageUrl: 'showcase images/mug.png', readyToShip: true },
            { id: 'prod-3', title: 'Ivory & Emerald Stainless Flask', category: 'drinkware', categoryLabel: 'Mugs & Drinkware', blurb: 'Tactile art on the go. Double-walled insulated stainless steel travel bottle adorned with high-precision vertical mandala dot columns.', spec: '750ml Vacuum Bottle', surfaceType: 'Stainless Bottle', palette: 'Emerald Sanctuary', imageUrl: 'showcase images/flask.png', readyToShip: true },
            { id: 'prod-4', title: 'Heirloom Jewelry Box', category: 'boxes', categoryLabel: 'Keepsake Boxes & Decor', blurb: "Treasured storage for life's sacred items. Hand-carved solid mahogany wooden box with a central multi-ring ruby and gold dot mandala lid design.", spec: '8" Wood Box with Velvet Lining', surfaceType: 'Wooden Box', palette: 'Veloura Classic', imageUrl: 'showcase images/jewelry_box.jpeg', readyToShip: true },
            { id: 'prod-5', title: 'Celestial Quartz Coaster Quad', category: 'boxes', categoryLabel: 'Keepsake Boxes & Decor', blurb: 'Functional table art. Set of 4 natural stone or acacia wood coasters painted with vibrant concentric metallic dot starbursts and heat-resistant resin topcoat.', spec: 'Set of 4 Stone/Wood Coasters', surfaceType: 'Coasters & Trays', palette: 'Celestial Moonlight', imageUrl: 'showcase images/coasters.png', readyToShip: true },
            { id: 'prod-6', title: 'Bespoke Client Objects', category: 'custom', categoryLabel: 'Custom Items', blurb: '"Have a specific object in mind? We can dot it." From acoustic guitars and leather journals to phone cases, candleholders, and keepsake decor.', spec: 'Client Provided Surface', surfaceType: 'Custom Object', palette: 'Custom Palette', imageUrl: 'showcase images/custom_item.png', readyToShip: false }
        ];

        let seeded = 0;
        for (const p of seedProducts) {
            const exists = await client.query('SELECT id FROM products WHERE id = $1', [p.id]);
            if (exists.rowCount === 0) {
                await client.query(
                    `INSERT INTO products (id, title, category, category_label, blurb, spec, surface_type, palette, image_url, ready_to_ship)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                    [p.id, p.title, p.category, p.categoryLabel, p.blurb, p.spec, p.surfaceType, p.palette, p.imageUrl, p.readyToShip]
                );
                seeded++;
            }
        }
        console.log(`✅ Seeded ${seeded} showcase products (skipped existing)`);

        console.log('\n🎉 Database setup complete! Run: node server.js\n');

    } catch (err) {
        console.error('❌ Setup failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

setup();
