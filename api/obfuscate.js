import fengari from 'fengari';

const { lua, lauxlib, lualib } = fengari;

// Enkripsi XOR untuk String/Chat/Command
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
  return srcCode.replace(/(?<!script_name\s*\(\s*|script_author\s*\(\s*|script_version\s*\(\s*|script_description\s*\(\s*)(["'])([^"\\]*(?:\\.[^"\\]*)*)\1/g, (match, quote, p1) => {
    return createXorExpr(p1, key);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan metode POST' });

  try {
    const { code } = req.body;
    if (!code || code.trim() === '') {
      return res.status(400).json({ success: false, error: 'Kode Lua kosong!' });
    }

    // 1. Enkripsi XOR String
    const protectedLuaSource = obfuscateSource(code);

    // 2. Load ke Lua Engine untuk Kompilasi
    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);

    const status = lauxlib.luaL_loadstring(L, fengari.to_luastring(protectedLuaSource));
    if (status !== lua.LUA_OK) {
      const err = lua.lua_tostring(L, -1);
      lua.lua_close(L);
      return res.status(400).json({ success: false, error: "Syntax Error: " + fengari.to_jsstring(err) });
    }

    // 3. Dump Bytecode MURNI (Strip Debug Info = 0)
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
    }, null, 0);

    lua.lua_close(L);

    const finalBuffer = Buffer.concat(binaryChunks);

    // 4. Pastikan Header Wajib LuaJIT (\x1bLJ)
    if (finalBuffer.length > 3) {
      finalBuffer[0] = 0x1b; // \x1b
      finalBuffer[1] = 0x4c; // L
      finalBuffer[2] = 0x4a; // J
    }

    const base64Data = finalBuffer.toString('base64');
    
    // Kirim string biner murni ke frontend
    return res.status(200).json({
      success: true,
      result: finalBuffer.toString('binary'), // Murni biner bytecode
      base64Data: base64Data
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
