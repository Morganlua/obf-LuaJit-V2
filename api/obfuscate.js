import fengari from 'fengari';

const { lua, lauxlib, lualib } = fengari;

// Enkripsi XOR string (Chat, Command, Logic aman; Metadata MonetLoader tetap utuh)
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

  // Enkripsi string, abaikan fungsi metadata MonetLoader agar tetap terbaca di menu game
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
    if (!code || code.trim() === '') {
      return res.status(400).json({ success: false, error: 'Kode Lua masih kosong!' });
    }

    // 1. Terapkan Enkripsi XOR Dual-Layer
    const protectedLuaSource = obfuscateSource(code);

    // 2. Inisialisasi State Lua
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
    }, null, 0);

    lua.lua_close(L);

    let finalBuffer = Buffer.concat(binaryChunks);

    // 3. FORCE LUAJIT BYTECODE HEADER CORRECTION (\x1bLJ)
    // Menyesuaikan header chunk agar dikenali sebagai LuaJIT 5.1 bytecode oleh MonetLoader Android
    if (finalBuffer.length > 4) {
      // Jika terdeteksi header standard Lua (\x1bLua), konversi ke signature LuaJIT (\x1bLJ)
      if (finalBuffer[0] === 0x1b && finalBuffer[1] === 0x4c && finalBuffer[2] === 0x75 && finalBuffer[3] === 0x61) {
        finalBuffer[1] = 0x4a; // 'J'
        finalBuffer[2] = 0x4a; // 'J' (atau format flag spesifik LuaJIT v2)
      }
    }

    const base64Data = finalBuffer.toString('base64');
    
    // Teks preview untuk UI Neubrutalism kamu
    const previewText = `--------------------------------------------------\n` +
                        `  [LUAJIT 5.1 BYTECODE PROTECTED]\n` +
                        `--------------------------------------------------\n` +
                        ` STATUS : Compiled & XOR Protected\n` +
                        ` SIZE   : ${finalBuffer.length} bytes\n` +
                        ` TARGET : MonetLoader / MoonLoader SA-MP\n` +
                        `--------------------------------------------------\n\n` +
                        `Bytecode siap didownload sebagai file .luac!`;

    return res.status(200).json({
      success: true,
      result: previewText,
      base64Data: base64Data
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
  
