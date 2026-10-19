import fengari from 'fengari';

const { lua, lauxlib, lualib } = fengari;

// Fungsi pembantu enkripsi XOR string otomatis
function createXorExpr(str, key) {
  if (!str || str.length === 0) return '""';
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) ^ key);
  }
  return `((function() local _t={${bytes.join(',')}} local _s={} for _i=1,#_t do _s[_i]=string.char(bit.bxor(_t[_i],${key})) end return table.concat(_s) end)())`;
}

// Otomatis samarkan semua string & variabel global sebelum dicompile ke biner
function obfuscateSource(srcCode) {
  const key = Math.floor(Math.random() * 180) + 35;
  let processed = srcCode;

  // 1. Enkripsi semua string di dalam tanda kutip "..." dan '...'
  processed = processed.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, p1) => createXorExpr(p1, key));
  processed = processed.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, p1) => createXorExpr(p1, key));

  // 2. Enkripsi fungsi-fungsi global SA-MP / MonetLoader agar nama fungsinya tidak terbaca
  const globals = [
    "script_name", "script_author", "script_version", "script_description",
    "sampAddChatMessage", "sampRegisterChatCommand", "setPlayerNeverGetsTired",
    "isSampAvailable", "PLAYER_HANDLE", "showCursor", "isPauseMenuActive",
    "wait", "print", "tostring", "tonumber"
  ];

  globals.forEach(name => {
    const encExpr = createXorExpr(name, key);
    const regex = new RegExp(`\\b${name}\\b`, 'g');
    processed = processed.replace(regex, `_G[${encExpr}]`);
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

    // TAHAP 1: Obfuscate String & Globals secara Otomatis
    const protectedLuaSource = obfuscateSource(code);

    // TAHAP 2: Kompilasi Hasil Obfuscate ke Biner LuaJIT (.luac)
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
    }, null, 1);

    lua.lua_close(L);

    const finalBuffer = Buffer.concat(binaryChunks);
    const base64Data = finalBuffer.toString('base64');
    
    const previewText = `[Morganz Full Protected Bytecode]\n-- Size: ${finalBuffer.length} bytes\n-- All Strings & Globals XOR Encrypted!\n\n` + protectedLuaSource.substring(0, 120) + "...";

    return res.status(200).json({
      success: true,
      result: previewText,
      base64Data: base64Data
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
