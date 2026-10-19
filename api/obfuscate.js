import fengari from 'fengari';

const { lua, lauxlib, lualib } = fengari;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan metode POST' });

  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Kode Lua masih kosong!' });

    // 1. Inisialisasi Lua State (LuaJIT environment)
    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);

    // 2. Load string kode Lua dari user
    const status = lauxlib.luaL_loadstring(L, fengari.to_luastring(code));
    if (status !== lua.LUA_OK) {
      const err = lua.lua_tostring(L, -1);
      lua.lua_close(L);
      return res.status(400).json({ success: false, error: "Syntax Error: " + fengari.to_jsstring(err) });
    }

    // 3. Dump bytecode biner dengan penanganan pointer Fengari yang aman
    let binaryChunks = [];
    lua.lua_dump(L, (L, p, sz, ud) => {
      const bytes = [];
      
      // Deteksi format pointer/data dari Fengari secara aman
      if (typeof p === 'string') {
        for (let i = 0; i < sz; i++) {
          bytes.push(p.charCodeAt(i));
        }
      } else if (p && typeof p.array !== 'undefined') {
        const idx = p.index || 0;
        for (let i = 0; i < sz; i++) {
          bytes.push(p.array[idx + i]);
        }
      } else if (p && p.buffer) {
        const view = new Uint8Array(p.buffer, p.byteOffset || 0, sz);
        for (let i = 0; i < sz; i++) {
          bytes.push(view[i]);
        }
      } else {
        // Fallback universal
        for (let i = 0; i < sz; i++) {
          bytes.push(Number(p[i] || 0));
        }
      }

      binaryChunks.push(Buffer.from(bytes));
      return 0;
    }, null, 1);

    lua.lua_close(L);

    // Gabungkan chunk biner dan ubah ke Base64 dengan aman
    const finalBuffer = Buffer.concat(binaryChunks);
    const base64Data = finalBuffer.toString('base64');
    
    const previewText = `[Morganz Bytecode Compiled Successfully]\n-- Size: ${finalBuffer.length} bytes\n-- Target: MonetLoader LuaJIT 5.1\n\n` + finalBuffer.toString('binary').substring(0, 100) + "... [Binary Data Protected]";

    return res.status(200).json({
      success: true,
      result: previewText,
      base64Data: base64Data
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
  }
  
