const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    const email = body?.email || '';
    const magicLink = body?.magicLink || body?.link || '';

    if (!email || !magicLink) {
      return res.status(400).json({
        status: false,
        message: 'Email dan Magic Link wajib diisi!'
      });
    }

    const response = await fetch('https://satriam.satriadeveloperz.workers.dev/api/satriam/verify-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: JSON.stringify({ email, magicLink }),
      timeout: 15000
    });

    const data = await response.json();
    return res.status(200).json({
      status: data.success || true,
      email: email,
      membershipStatus: data.membershipStatus || 'PREMIUM_ACTIVE',
      planName: data.planName || 'Alight Motion Pro / Member',
      message: data.message || 'Verifikasi manual Magic Link berhasil!'
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message || 'Gagal memproses verifikasi'
    });
  }
};
