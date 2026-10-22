const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function decodeBase64(str) {
  try { return Buffer.from(str, 'base64').toString('utf-8'); } catch (_) { return ''; }
}

function resolvePayload(value, depth = 0) {
  if (!value || depth > 4) return '';
  const raw = String(value).trim();
  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw);
      const queryKeys = ['safelink_redirect', 'url', 'target', 'goto', 'r', 'out', 'u', 'link', 'data', 'an', 'dest', 'redirect', 'to'];
      for (const key of queryKeys) {
        const val = parsed.searchParams.get(key);
        if (val) {
          const resolved = resolvePayload(val, depth + 1);
          if (resolved && /^https?:\/\//i.test(resolved)) return resolved;
        }
      }
    }
  } catch (_) {}

  const decoded = decodeBase64(raw);
  if (decoded && decoded !== raw) {
    if (/^https?:\/\//i.test(decoded)) return decoded;
    try {
      const json = JSON.parse(decoded);
      const nested = json.safelink || json.link || json.url || json.target || json.destination || json.dest;
      if (nested) {
        const resolved = resolvePayload(nested, depth + 1);
        if (resolved) return resolved;
      }
    } catch (_) {}
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  return '';
}

function isExternalDestination(u, currentHost) {
  try {
    if (!/^https?:\/\//i.test(u)) return false;
    const parsed = new URL(u);
    const h = parsed.hostname.toLowerCase();
    const internalHosts = ['khaddavi.', 'contentmenarik.com', 'bicolink.', 'bico.site', 'sub2unlock.', 'move2link.'];
    if (internalHosts.some(ih => h.includes(ih)) || h === currentHost) return false;
    return true;
  } catch (_) { return false; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let bodyData = req.body;
  if (typeof bodyData === 'string') {
    try { bodyData = JSON.parse(bodyData); } catch (e) {}
  }

  let url = req.query.url || (bodyData && bodyData.url);
  if (!url) return res.status(400).json({ status: false, error: 'URL shortlink wajib diisi' });

  const raw = String(url).trim();
  try {
    const directCheck = resolvePayload(raw);
    if (directCheck && /^https?:\/\//i.test(directCheck) && !directCheck.includes('khaddavi.')) {
      return res.status(200).json({ status: true, data: { original_url: raw, destination_url: directCheck, method: 'Payload Decode' } });
    }

    const response = await axios.get(raw, {
      headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://www.google.com/' },
      maxRedirects: 5,
      timeout: 15000
    });

    const finalUrl = response.request && response.request.res ? response.request.res.responseUrl || raw : raw;
    const $ = cheerio.load(response.data);

    const btnHref = $('#slu-btn[href], a.slu-btn[href], #btn-main[href], a#get-link[href]').attr('href');
    if (btnHref && isExternalDestination(btnHref, new URL(finalUrl).hostname)) {
      return res.status(200).json({ status: true, data: { original_url: raw, destination_url: btnHref, method: 'DOM Extraction' } });
    }

    if (finalUrl !== raw && isExternalDestination(finalUrl, new URL(raw).hostname)) {
      return res.status(200).json({ status: true, data: { original_url: raw, destination_url: finalUrl, method: 'HTTP Redirect' } });
    }

    return res.status(400).json({ status: false, error: 'Gagal menemukan link tujuan' });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message || 'Gagal memproses bypass' });
  }
};
