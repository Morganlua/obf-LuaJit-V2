const fetch = require('node-fetch');

const BASE_SATRIAM = 'https://satriam.satriadeveloperz.workers.dev';
const BASE_GENEMAIL = 'https://generator.email';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const genEmailRes = await fetch(`${BASE_GENEMAIL}/`, {
      headers: { 'User-Agent': UA },
      timeout: 10000
    });

    const setCookie = genEmailRes.headers.get('set-cookie') || '';
    const emailMatch = setCookie.match(/emb%5B%5D=([^;]+)/);
    let email = emailMatch ? decodeURIComponent(emailMatch[1]) : '';

    if (!email) {
      const html = await genEmailRes.text();
      const match = html.match(/id="email_ch_text">([^<]+)</);
      if (match) email = match[1].trim();
    }

    if (!email) {
      email = `am${Math.random().toString(36).substring(2, 10)}@pastipremium.store`;
    }

    await fetch(`${BASE_SATRIAM}/api/satriam/send-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA
      },
      body: JSON.stringify({ email }),
      timeout: 10000
    });

    return res.status(200).json({
      status: true,
      email: email,
      hpCookieHeader: setCookie,
      message: 'Email berhasil dibuat. Silakan login di Alight Motion!'
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message || 'Gagal generate email'
    });
  }
};
