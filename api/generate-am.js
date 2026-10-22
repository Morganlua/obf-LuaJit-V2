const fetch = require('node-fetch');

const BASE_SATRIAM = 'https://satriam.satriadeveloperz.workers.dev';
const BASE_GENEMAIL = 'https://generator.email';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getGeneratorEmailSession() {
  try {
    const init = await fetch(`${BASE_GENEMAIL}/`, {
      headers: { 'User-Agent': UA },
      timeout: 10000
    });
    const setCookies = init.headers.raw()['set-cookie'] || [];
    const hpCookie = setCookies.find(c => c && c.startsWith('__Host-ab_hp='));
    const rawCtx = setCookies.find(c => c && c.startsWith('inbox_ctx='));

    let domain = 'heyzalo.vn';
    if (rawCtx) {
      try {
        const dec = decodeURIComponent(rawCtx.split(';')[0].split('=')[1]);
        const extracted = dec.split('/')[0];
        if (extracted) domain = extracted;
      } catch (e) {}
    }

    const hpCookieHeader = hpCookie ? hpCookie.split(';')[0] : '';
    return { domain, hpCookieHeader };
  } catch (err) {
    return { domain: 'heyzalo.vn', hpCookieHeader: '' };
  }
}

function generateRandomUser() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let user = 'am';
  for (let i = 0; i < 6; i++) {
    user += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  user += Math.floor(Math.random() * 89 + 10);
  return user;
}

async function sendSatriamLink(email) {
  const res = await fetch(`${BASE_SATRIAM}/api/satriam/send-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA
    },
    body: JSON.stringify({ email }),
    timeout: 15000
  });
  return await res.json();
}

async function verifySatriamLink(email, magicLink) {
  const res = await fetch(`${BASE_SATRIAM}/api/satriam/verify-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA
    },
    body: JSON.stringify({ email, magicLink }),
    timeout: 15000
  });
  return await res.json();
}

async function fetchMagicLink(domain, user, hpCookieHeader, maxAttempts = 8) {
  const ctx = encodeURIComponent(`${domain}/${user}/`);
  const cookies = `inbox_ctx=${ctx}; ${hpCookieHeader}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await sleep(attempt === 1 ? 4000 : 2500);
    try {
      const res = await fetch(`${BASE_GENEMAIL}/inbox1/`, {
        headers: {
          'User-Agent': UA,
          'Cookie': cookies
        },
        timeout: 10000
      });
      const html = await res.text();

      const links = html.match(/https?:\/\/[^\s"'<>]+/gi) || [];
      const magicLink = links.find(l =>
        (l.includes('alight-creative.firebaseapp.com') || l.includes('alightcreative.com')) &&
        (l.includes('signInWithEmailLink') || l.includes('auth_action') || l.includes('links?link='))
      );

      if (magicLink) {
        return magicLink.replace(/&amp;/g, '&');
      }
    } catch (e) {}
  }

  throw new Error('Timeout menunggu email magic link dari Alight Motion');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sessionData = await getGeneratorEmailSession();
    const user = generateRandomUser();
    const email = `${user}@${sessionData.domain}`;
    const inbox = `${BASE_GENEMAIL}/${email}`;

    const sendRes = await sendSatriamLink(email);
    if (!sendRes?.success) {
      return res.status(400).json({
        status: false,
        error: sendRes?.message || sendRes?.error || 'Gagal mengirim link ke email'
      });
    }

    const magicLink = await fetchMagicLink(sessionData.domain, user, sessionData.hpCookieHeader);
    const verifyRes = await verifySatriamLink(email, magicLink);

    if (!verifyRes?.success) {
      return res.status(400).json({
        status: false,
        error: verifyRes?.message || verifyRes?.error || 'Gagal verifikasi magic link'
      });
    }

    return res.status(200).json({
      status: true,
      email,
      inbox,
      membershipStatus: verifyRes.membershipStatus || 'PREMIUM_ACTIVE',
      planName: verifyRes.planName || 'Alight Motion Pro / Member',
      orderId: verifyRes.orderId || ('AM-' + Math.floor(100000 + Math.random() * 900000)),
      validUntil: verifyRes.validUntil || '2027-12-31'
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      error: err.message || 'Terjadi kesalahan sistem serverless'
    });
  }
};
