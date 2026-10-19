export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan metode POST' });

  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Kode Lua input masih kosong!' });

    // 1. Eksekusi Transformasi XOR String & Global Masking
    const transformedLua = processMorganzLogic(code);

    // 2. Encode ke Base64 agar aman dikirim lewat JSON API Vercel tanpa rusak/error UTF-8
    const base64Bytecode = Buffer.from(transformedLua).toString('base64');

    return res.status(200).json({
      success: true,
      result: transformedLua, // Preview teks kode ter-obfuscate
      base64Data: base64Bytecode // Data biner murni untuk didownload
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function createXorStringExpr(str, key) {
  if (!str || str.length === 0) return '""';
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) ^ key);
  }
  return `((function() local _t={${bytes.join(',')}} local _s={} for _i=1,#_t do _s[_i]=string.char(bit.bxor(_t[_i],${key})) end return table.concat(_s) end)())`;
}

function processMorganzLogic(srcCode) {
  const key = Math.floor(Math.random() * 180) + 35;
  let processed = srcCode;

  // Enkripsi String ganda & tunggal
  processed = processed.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, p1) => createXorStringExpr(p1, key));
  processed = processed.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, p1) => createXorStringExpr(p1, key));

  // Protect Global SA-MP / MonetLoader APIs
  const globals = [
    "script_name", "script_author", "script_version", "script_description",
    "sampAddChatMessage", "sampRegisterChatCommand", "setPlayerNeverGetsTired",
    "isSampAvailable", "PLAYER_HANDLE", "showCursor", "isPauseMenuActive",
    "wait", "print", "tostring", "tonumber"
  ];

  globals.forEach(name => {
    const encExpr = createXorStringExpr(name, key);
    const regex = new RegExp(`\\b${name}\\b`, 'g');
    processed = processed.replace(regex, `_G[${encExpr}]`);
  });

  return processed;
}
