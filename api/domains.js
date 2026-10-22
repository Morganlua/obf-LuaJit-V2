const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch('https://www.1secmail.com/api/v1/?action=getDomainList');
    const data = await response.json();
    
    // Fallback & extended domain list if empty
    const extendedDomains = [
      '1secmail.com', 
      '1secmail.org', 
      '1secmail.net', 
      'wwm.ru', 
      'esiom.com', 
      'vmail.me', 
      'kzmk.ru', 
      'v3mail.org'
    ];

    const finalDomains = Array.isArray(data) && data.length > 0 
      ? Array.from(new Set([...data, ...extendedDomains]))
      : extendedDomains;

    res.status(200).json(finalDomains);
  } catch (error) {
    res.status(200).json([
      '1secmail.com', '1secmail.org', '1secmail.net', 
      'wwm.ru', 'esiom.com', 'vmail.me', 'kzmk.ru'
    ]);
  }
};
