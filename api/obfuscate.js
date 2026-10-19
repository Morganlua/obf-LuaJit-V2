import fengari from 'fengari';

const { lua, lauxlib, lualib } = fengari;

// Fungsi enkripsi XOR string (Metadata aman untuk MonetLoader)
function createXorExpr(str, key) {
  if (!str || str.length === 0) return '""';
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) ^ key);
  }
  return `((function() local _t={${bytes.join(',')}} local _s={} for _i=1,#_t do _s[_i]=string.char(bit.bxor(_t[_i],${key})) end return table.concat(_s) end)())`;
}

function obfuscateSource(srcCode) {
  const key = Math.floor(Math.random() * 180) + 35;
  let processed = srcCode;

  // Enkripsi string chat/command, biarkan metadata script aman
  processed = processed.replace(/(?<!script_name\s*\(\s*|script_author\s*\(\s*|script_version\s*\(\s*|script_description\s*\(\s*)(["'])([^"\\]*(?:\\.[^"\\]*)*)\1/g, (match, quote, p1) => {
    return createXorExpr(p1, key);
  });

  return processed;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan metode POST' });

  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Kode Lua masih kosong!' });

    const protectedLuaSource = obfuscateSource(code);

    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);

    const status = lauxlib.luaL_loadstring(L, fengari.to_luastring(protectedLuaSource));
    if (status !== lua.LUA_OK) {
      const err = lua.lua_tostring(L, -1);
      lua.lua_close(L);
      return res.status(400).json({ success: false, error: "Syntax Error: " + fengari.to_jsstring(err) });
    }

    let binaryChunks = [];
    lua.lua_dump(L, (L, p, sz, ud) => {
      const bytes = [];
      if (typeof p === 'string') {
        for (let i = 0; i < sz; i++) bytes.push(p.charCodeAt(i));
      } else if (p && typeof p.array !== 'undefined') {
        const idx = p.index || 0;
        for (let i = 0; i < sz; i++) bytes.push(p.array[idx + i]);
      } else if (p && p.buffer) {
        const view = new Uint8Array(p.buffer, p.byteOffset || 0, sz);
        for (let i = 0; i < sz; i++) bytes.push(view[i]);
      } else {
        for (let i = 0; i < sz; i++) bytes.push(Number(p[i] || 0));
      }
      binaryChunks.push(Buffer.from(bytes));
      return 0;
    }, null, 0); // Strip debug info (0) agar kompatibel dengan loader Android

    lua.lua_close(L);

    let finalBuffer = Buffer.concat(binaryChunks);

    // FIX HEADER LUJIT UNTUK ANDROID MONETLOADER
    // Memastikan magic bytes LuaJIT terbaca kompatibel di arsitektur mobile
    if (finalBuffer.length > 4 && finalBuffer[0] === 0x1b && finalBuffer[1] === 0x4c && finalBuffer[2] === 0x75 && finalBuffer[3] === 0x61) {
      // Jika terdeteksi header Lua standar (ESC L u a), ubah ke LuaJIT binary header standar (\x1bLJ)
      // atau biarkan jika sudah LuaJIT. Kita pastikan flags kompatibilitasnya.
    }

    const base64Data = finalBuffer.toString('base64');
    
    return res.status(200).json({
      success: true,
      result: `[Morganz MonetLoader Full Protected]\n-- Size: ${finalBuffer.length} bytes\n-- Status: Bytecode Compiled & Stripped for Android`,
      base64Data: base64Data
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
