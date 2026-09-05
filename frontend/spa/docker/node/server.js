const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 8080;

const BUILD_DIR = path.join(__dirname, 'build');

// --- Legal pages (Impressum / Datenschutzerklärung) ------------------------
// Fully operator-configurable at runtime, so self-hosters never need to rebuild
// the image. For each page there are three modes, resolved in this order:
//   1. url    -> set HOPPS_IMPRINT_URL / HOPPS_PRIVACY_URL to link an existing
//                external page (the footer links there directly).
//   2. inline -> mount a file into HOPPS_LEGAL_DIR (default /app/legal):
//                impressum.{html,txt,md} / datenschutz.{html,txt,md}. It is
//                served from here and rendered inside the app.
//   3. none   -> neither is set: the page and its footer link stay hidden.
// A configured URL always takes precedence over a mounted file.
const LEGAL_DIR = process.env.HOPPS_LEGAL_DIR || path.join(__dirname, 'legal');
const LEGAL_PAGES = {
    imprint: { urlEnv: 'HOPPS_IMPRINT_URL', file: 'impressum' },
    privacy: { urlEnv: 'HOPPS_PRIVACY_URL', file: 'datenschutz' },
};
// Checked in order; first existing file wins.
const CONTENT_TYPES = [
    { ext: 'html', format: 'html', mime: 'text/html; charset=utf-8' },
    { ext: 'txt', format: 'text', mime: 'text/plain; charset=utf-8' },
    { ext: 'md', format: 'text', mime: 'text/plain; charset=utf-8' },
];

function configuredUrl(page) {
    return (process.env[LEGAL_PAGES[page].urlEnv] || '').trim();
}

function resolveFile(page) {
    for (const type of CONTENT_TYPES) {
        const filePath = path.join(LEGAL_DIR, `${LEGAL_PAGES[page].file}.${type.ext}`);
        if (fs.existsSync(filePath)) {
            return { filePath, ...type };
        }
    }
    return null;
}

function resolvePage(page) {
    const url = configuredUrl(page);
    if (url) {
        return { mode: 'url', url };
    }
    const file = resolveFile(page);
    if (file) {
        return { mode: 'inline', format: file.format };
    }
    return { mode: 'none' };
}

// Tells the SPA, per page, whether to show a footer link and where it points.
app.get('/legal/config', (req, res) => {
    res.json({
        imprint: resolvePage('imprint'),
        privacy: resolvePage('privacy'),
    });
});

// Serves the operator-mounted content file for a page (inline mode only).
function serveContent(page) {
    return (req, res) => {
        if (configuredUrl(page)) {
            res.status(404).json({ error: 'page is configured as an external url' });
            return;
        }
        const file = resolveFile(page);
        if (!file) {
            res.status(404).json({ error: 'no content configured for this page' });
            return;
        }
        res.setHeader('Content-Type', file.mime);
        // The content is operator-supplied; keep the browser from sniffing another
        // type and disable caching so an updated mount shows up immediately.
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(file.filePath).pipe(res);
    };
}
app.get('/legal/imprint', serveContent('imprint'));
app.get('/legal/privacy', serveContent('privacy'));

// Serve the static files from the React app
app.use(express.static(BUILD_DIR));

// Handles any requests that don't match the ones above
app.get('/{*any}', (req, res) => {
    res.sendFile(path.join(BUILD_DIR, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
