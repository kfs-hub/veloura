/* ==========================================================================
   VELOURA DOTS - Transactional Email Service
   Sends branded receipt emails to clients & alert emails to studio owner.
   ========================================================================== */

const nodemailer = require('nodemailer');

// Configure transporter from ENV or fallback to log mode
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

async function sendCommissionConfirmation(commission) {
    const clientHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF8F5; color: #1A1A1E; padding: 40px 20px; }
            .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid rgba(197,160,89,0.3); border-radius: 16px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            .brand { font-size: 22px; font-weight: 800; letter-spacing: 3px; color: #1A1A1E; text-align: center; margin-bottom: 4px; }
            .tagline { font-size: 12px; color: #8C6E30; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 30px; }
            .divider { height: 1px; background: rgba(197,160,89,0.2); margin: 24px 0; }
            .ref-pill { background: #FAF5EC; border: 1px solid #C5A059; padding: 8px 16px; border-radius: 20px; font-weight: 700; color: #8C6E30; display: inline-block; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
            .detail-label { color: #7E8291; }
            .detail-value { font-weight: 600; color: #1A1A1E; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #7E8291; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="brand">VELOURA DOTS</div>
            <div class="tagline">••• Handmade with Care •••</div>
            
            <h2 style="color: #1A1A1E; margin-bottom: 8px;">Commission Inquiry Received</h2>
            <p style="color: #4A4D58; font-size: 15px; line-height: 1.6;">
                Dear ${commission.clientName},<br><br>
                Thank you for sharing your artistic vision with Veloura Dots Studio. We have registered your custom order inquiry under reference ID:
            </p>
            
            <div style="text-align: center; margin: 20px 0;">
                <span class="ref-pill">Reference ID: ${commission.refId}</span>
            </div>

            <div class="divider"></div>

            <div class="detail-row">
                <span class="detail-label">Surface Category:</span>
                <span class="detail-value">${commission.surfaceType}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Dimensions / Size:</span>
                <span class="detail-value">${commission.surfaceSize}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Color Palette:</span>
                <span class="detail-value">${commission.colorPalette}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Target Budget:</span>
                <span class="detail-value">${commission.budgetRange}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Timeline:</span>
                <span class="detail-value">${commission.timelineSelect}</span>
            </div>

            <div class="divider"></div>

            <h4 style="margin-bottom: 10px; color: #8C6E30;">What Happens Next?</h4>
            <ol style="color: #4A4D58; font-size: 14px; padding-left: 20px; line-height: 1.7;">
                <li>Our studio artist is reviewing your surface choice and vision notes.</li>
                <li>You will receive a personalized digital proof & final pricing quote within 24 hours.</li>
                ${commission.clientIg ? `<li>We may also send a quick preview via Instagram DM to <strong>${commission.clientIg}</strong>!</li>` : ''}
            </ol>

            <div class="footer">
                © 2026 Veloura Dots Boutique Studio • Precision Hand-Painted Mandala Art
            </div>
        </div>
    </body>
    </html>
    `;

    // Studio notification email
    const studioHtml = `
    <h2>🎨 New Commission Inquiry Alert</h2>
    <p><strong>Ref ID:</strong> ${commission.refId}</p>
    <p><strong>Client:</strong> ${commission.clientName} (${commission.clientEmail})</p>
    <p><strong>Instagram:</strong> ${commission.clientIg || 'N/A'}</p>
    <hr>
    <p><strong>Surface:</strong> ${commission.surfaceType} (${commission.surfaceSize})</p>
    <p><strong>Palette:</strong> ${commission.colorPalette}</p>
    <p><strong>Budget:</strong> ${commission.budgetRange}</p>
    <p><strong>Timeline:</strong> ${commission.timelineSelect}</p>
    <p><strong>Vision Notes:</strong></p>
    <blockquote style="background:#f4f4f4; padding: 12px;">${commission.visionText || 'No custom vision text provided.'}</blockquote>
    <p><strong>Attached Reference Files:</strong> ${commission.uploadedFiles.length} file(s)</p>
    `;

    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL SERVICE] Sent Receipt for ${commission.refId} to ${commission.clientEmail}`);
    console.log(`======================================================\n`);

    if (process.env.SMTP_USER) {
        try {
            await transporter.sendMail({
                from: '"Veloura Dots Studio" <commissions@velouradots.art>',
                to: commission.clientEmail,
                subject: `Commission Receipt: ${commission.refId} - Veloura Dots`,
                html: clientHtml
            });

            await transporter.sendMail({
                from: '"Studio Bot" <bot@velouradots.art>',
                to: process.env.STUDIO_ADMIN_EMAIL || 'studio@velouradots.art',
                subject: `[NEW COMMISSION] ${commission.refId} from ${commission.clientName}`,
                html: studioHtml
            });
        } catch (err) {
            console.error('SMTP Send Error:', err.message);
        }
    }
}

module.exports = { sendCommissionConfirmation };
