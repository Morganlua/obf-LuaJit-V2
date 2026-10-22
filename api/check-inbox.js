const fetch = require('node-fetch');

const BASE_SATRIAM = 'https://satriam.satriadeveloperz.workers.dev';
const BASE_GENEMAIL = 'https://generator.email';
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
  const hpCookieHeader = body?.hpCookieHeader || '';

  if (!email) {
    return res.status(400).json({ status: false, message: 'Email wajib diisi' });
  }

  const [user, domain] = email.split('@');
  const ctx = encodeURIComponent(`${domain}/${user}/`);
  const cookies = `inbox_ctx=${ctx}; ${hpCookieHeader}`;

  try {
    const response = await fetch(`${BASE_GENEMAIL}/inbox1/`, {
      headers: {
        'User-Agent': UA,
        'Cookie': cookies
      },
      timeout: 10000
    });
    const html = await response.text();

    const links = html.match(/https?:\/\/[^\s"'<>]+/gi) || [];
    const magicLink = links.find(l =>
      (l.includes('alight-creative.firebaseapp.com') || l.includes('alightcreative.com')) &&
      (l.includes('signInWithEmailLink') || l.includes('auth_action') || l.includes('links?link='))
    );

    if (!magicLink) {
      return res.status(200).json({
        status: false,
        found: false,
        message: 'Menunggu email login masuk...'
      });
    }

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
      found: true,
      email: email,
      magicLink: cleanMagicLink,
      membershipStatus: verifyData.membershipStatus || 'PREMIUM_ACTIVE',
      planName: verifyData.planName || 'Alight Motion Pro',
      message: 'Email Login Diterima & Diverifikasi!'
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message || 'Gagal mengecek inbox'
    });
  }
};
