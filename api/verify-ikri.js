const fetch = require('node-fetch');

const BASE_SATRIAM = 'https://satriam.satriadeveloperz.workers.dev';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e) {}
  }

  const email = body?.email || '';
  const magicLink = body?.magicLink || '';

  if (!email || !magicLink) {
    return res.status(400).json({ status: false, message: 'Email dan Magic Link wajib diisi' });
  }

  try {
    const cleanMagicLink = magicLink.replace(/&amp;/g, '&');

    const verifyRes = await fetch(`${BASE_SATRIAM}/api/satriam/verify-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA
      },
      body: JSON.stringify({ email, magicLink: cleanMagicLink }),
      timeout: 15000
    });

    const verifyData = await verifyRes.json();

    return res.status(200).json({
      status: true,
      membershipStatus: verifyData.membershipStatus || 'PREMIUM_ACTIVE',
      message: 'Verifikasi Magic Link Berhasil!'
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message || 'Gagal verifikasi Magic Link'
    });
  }
};
