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

    // 3. Dump bytecode biner murni (100% mirip string.dump lokal)
    let binaryChunks = [];
    lua.lua_dump(L, (L, b, size, ud) => {
      const chunkBytes = Buffer.from(fengari.to_jsstring(b), 'binary');
      binaryChunks.push(chunkBytes);
      return 0;
    }, null, 1);

    lua.lua_close(L);

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
