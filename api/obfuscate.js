import fengari from 'fengari';

const { lua, lauxlib, lualib } = fengari;

// Helper: Membuat ekspresi dekripsi XOR otomatis
function createXorExpr(str, key) {
  if (!str || str.length === 0) return '""';
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) ^ key);
  }
  return `((function() local _t={${bytes.join(',')}} local _s={} for _i=1,#_t do _s[_i]=string.char(bit.bxor(_t[_i],${key})) end return table.concat(_s) end)())`;
}

// Helper: Obfuscate string/chat/commands tanpa merusak metadata MonetLoader
function obfuscateSource(srcCode) {
  const key = Math.floor(Math.random() * 180) + 35;
  let processed = srcCode;

  // Enkripsi semua string ber-tanda kutip KECUALI yang ada di dalam fungsi metadata MonetLoader
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

    // 1. Enkripsi XOR untuk String/Chat/Command (Metadata Aman)
    const protectedLuaSource = obfuscateSource(code);

    // 2. Inisialisasi Environment LuaJIT (Fengari)
    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);

    // 3. Load Kode
    const status = lauxlib.luaL_loadstring(L, fengari.to_luastring(protectedLuaSource));
    if (status !== lua.LUA_OK) {
      const err = lua.lua_tostring(L, -1);
      lua.lua_close(L);
      return res.status(400).json({ success: false, error: "Syntax Error: " + fengari.to_jsstring(err) });
    }

    // 4. Dump Bytecode Biner dengan Strip Debug Info (0) agar Kompatibel di Android
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
    }, null, 0); // 0 = Strip Debug Info untuk kompatibilitas Android

    lua.lua_close(L);

    const finalBuffer = Buffer.concat(binaryChunks);
    const base64Data = finalBuffer.toString('base64');
    
    // Teks info bersih untuk UI Web (Mencegah tampilan karakter acak \x1bLJ)
    const previewText = `--------------------------------------------------\n` +
                        `  [MORGANZ MONETLOADER OBFUSCATOR SUCCESS]\n` +
                        `--------------------------------------------------\n` +
                        ` STATUS : XOR Encrypted & Bytecode Compiled\n` +
                        ` SIZE   : ${finalBuffer.length} bytes\n` +
                        ` TARGET : SA-MP MonetLoader (Android)\n` +
                        `--------------------------------------------------\n\n` +
                        `File .luac biner siap didownload!\n` +
                        `Klik tombol "DOWNLOAD .LUAC" di bawah untuk menyimpan file.`;

    return res.status(200).json({
      success: true,
      result: previewText,
      base64Data: base64Data
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
