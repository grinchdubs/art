const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const pool = require('../db');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

router.post('/generate', async (req, res) => {
  const {
    artwork_ids = [],
    artist_name = '',
    portfolio_title = 'Portfolio',
    statement_id,
    include_price = false,
    include_status = false,
  } = req.body;

  try {
    // Fetch artworks in the requested order
    const artworkResult = await pool.query(
      `SELECT a.*,
         json_agg(DISTINCT jsonb_build_object(
           'file_path', gi.file_path, 'is_primary', ai.is_primary
         )) FILTER (WHERE gi.id IS NOT NULL) as images
       FROM artworks a
       LEFT JOIN artwork_images ai ON a.id = ai.artwork_id
       LEFT JOIN gallery_images gi ON ai.image_id = gi.id
       WHERE a.id = ANY($1)
       GROUP BY a.id`,
      [artwork_ids]
    );

    // Preserve requested order
    const artworkMap = Object.fromEntries(artworkResult.rows.map(a => [a.id, a]));
    const artworks = artwork_ids.map(id => artworkMap[id]).filter(Boolean);

    let statement = null;
    if (statement_id) {
      const sr = await pool.query('SELECT * FROM artist_statements WHERE id = $1', [statement_id]);
      statement = sr.rows[0] || null;
    }

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: { Title: portfolio_title, Author: artist_name },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="portfolio.pdf"`);
    doc.pipe(res);

    const W = doc.page.width - 144;
    const gray = (v) => `#${v.toString(16).repeat(3)}`;

    // ── Cover page ──────────────────────────────────────────────
    const midY = (doc.page.height - 144) / 2;
    doc.y = midY;
    doc
      .font('Helvetica-Bold').fontSize(32).fillColor('#000')
      .text(portfolio_title, { align: 'center' });
    doc.moveDown(0.6);
    if (artist_name) {
      doc.font('Helvetica').fontSize(16).fillColor('#444')
        .text(artist_name, { align: 'center' });
      doc.moveDown(0.4);
    }
    doc.font('Helvetica').fontSize(11).fillColor('#888')
      .text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }), { align: 'center' });

    // ── Statement page ───────────────────────────────────────────
    if (statement) {
      doc.addPage();
      if (statement.bio_text) {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#888')
          .text('ARTIST BIO', { characterSpacing: 1.5 });
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(11).fillColor('#222')
          .text(statement.bio_text, { lineGap: 4 });
        doc.moveDown(1.5);
      }
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#888')
        .text('ARTIST STATEMENT', { characterSpacing: 1.5 });
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(11).fillColor('#222')
        .text(statement.statement_text, { lineGap: 4 });
    }

    // ── Artwork pages ────────────────────────────────────────────
    for (const artwork of artworks) {
      doc.addPage();

      const primaryImage = artwork.images?.find(img => img.is_primary) || artwork.images?.[0];
      const imagePath = primaryImage?.file_path
        ? path.join(UPLOADS_DIR, primaryImage.file_path)
        : null;

      if (imagePath && fs.existsSync(imagePath)) {
        try {
          doc.image(imagePath, { fit: [W, 380], align: 'center' });
        } catch (_) { /* skip broken image */ }
      }

      doc.moveDown(1);

      // Rule line
      doc.moveTo(72, doc.y).lineTo(72 + W, doc.y)
        .strokeColor('#ddd').lineWidth(0.5).stroke();
      doc.moveDown(0.6);

      doc.font('Helvetica-Bold').fontSize(15).fillColor('#111')
        .text(artwork.title || 'Untitled');
      doc.moveDown(0.3);

      const meta = [];
      if (artwork.creation_date) meta.push(new Date(artwork.creation_date).getFullYear());
      if (artwork.medium) meta.push(artwork.medium);
      if (artwork.dimensions) meta.push(artwork.dimensions);
      if (meta.length) {
        doc.font('Helvetica').fontSize(10).fillColor('#555')
          .text(meta.join('   ·   '));
      }

      if (include_price && artwork.price) {
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(10).fillColor('#333')
          .text(`$${parseFloat(artwork.price).toLocaleString()}`);
      }

      if (include_status && artwork.sale_status) {
        doc.moveDown(0.2);
        doc.font('Helvetica').fontSize(9).fillColor('#888')
          .text(artwork.sale_status);
      }

      if (artwork.notes) {
        doc.moveDown(0.6);
        doc.font('Helvetica').fontSize(9).fillColor('#666')
          .text(artwork.notes, { lineGap: 3 });
      }
    }

    doc.end();
  } catch (err) {
    console.error('Portfolio generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to generate portfolio' });
    }
  }
});

module.exports = router;
