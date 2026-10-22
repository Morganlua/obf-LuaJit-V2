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
  if (!email || !email.includes('@')) {
    return res.status(400).json({ status: false, message: 'Format email pribadi tidak valid' });
  }

  try {
    const regRes = await fetch(`${BASE_SATRIAM}/api/satriam/send-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA
      },
      body: JSON.stringify({ email }),
      timeout: 10000
    });

    const regData = await regRes.json();

    return res.status(200).json({
      status: true,
      email: email,
      message: 'Magic Link Alight Motion berhasil dikirim ke email pribadi kamu. Silakan cek inbox email asli kamu untuk verifikasi manual!'
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message || 'Gagal mengirim magic link ke email pribadi'
    });
  }
};
