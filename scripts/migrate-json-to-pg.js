/* ==========================================================================
   VELOURA DOTS - JSON to PostgreSQL Migration Script
   Migrates existing records from data/db.json into PostgreSQL tables.
   Usage:
       node scripts/migrate-json-to-pg.js
   ========================================================================== */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const dbPath = path.join(__dirname, '..', 'data', 'db.json');

async function migrate() {
    console.log('\n🚀 Starting JSON to PostgreSQL Migration...\n');

    if (!fs.existsSync(dbPath)) {
        console.log('⚠️ No data/db.json file found. Nothing to migrate.');
        process.exit(0);
    }

    let data;
    try {
        data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        console.error('❌ Failed to parse data/db.json:', e.message);
        process.exit(1);
    }

    const client = await pool.connect();

    try {
        // Ensure tables exist
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
        `);

        // Migrate Commissions
        let commMigrated = 0;
        const commissions = data.commissions || [];
        for (const c of commissions) {
            const exists = await client.query('SELECT id FROM commissions WHERE id = $1', [c.id]);
            if (exists.rowCount === 0) {
                await client.query(
                    `INSERT INTO commissions
                     (id, ref_id, status, surface_type, surface_size, color_palette, vision_text,
                      budget_range, timeline_select, client_name, client_email, client_ig, uploaded_files, created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
                    [
                        c.id,
                        c.refId,
                        c.status || 'PENDING_REVIEW',
                        c.surfaceType,
                        c.surfaceSize,
                        c.colorPalette,
                        c.visionText,
                        c.budgetRange,
                        c.timelineSelect,
                        c.clientName,
                        c.clientEmail,
                        c.clientIg,
                        JSON.stringify(c.uploadedFiles || []),
                        c.createdAt || new Date()
                    ]
                );
                commMigrated++;
            }
        }
        console.log(`✅ Commissions migrated: ${commMigrated}/${commissions.length}`);

        // Migrate Products
        let prodMigrated = 0;
        const products = data.products || [];
        for (const p of products) {
            const exists = await client.query('SELECT id FROM products WHERE id = $1', [p.id]);
            if (exists.rowCount === 0) {
                await client.query(
                    `INSERT INTO products
                     (id, title, category, category_label, blurb, spec, surface_type, palette, image_url, ready_to_ship, created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
                    [
                        p.id,
                        p.title,
                        p.category,
                        p.categoryLabel,
                        p.blurb,
                        p.spec,
                        p.surfaceType,
                        p.palette,
                        p.imageUrl,
                        p.readyToShip === true || p.readyToShip === 'true',
                        p.createdAt || new Date()
                    ]
                );
                prodMigrated++;
            }
        }
        console.log(`✅ Products migrated: ${prodMigrated}/${products.length}`);

        console.log('\n🎉 Migration successfully completed!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
