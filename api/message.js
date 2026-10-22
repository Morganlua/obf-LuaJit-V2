const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { login, domain, id } = req.query;
  if (!login || !domain || !id) {
    return res.status(400).json({});
  }

  try {
    const url = `https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${encodeURIComponent(id)}`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data || {});
  } catch (error) {
    res.status(200).json({});
  }
};
