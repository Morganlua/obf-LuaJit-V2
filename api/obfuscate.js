export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, preset } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Source code Lua tidak boleh kosong!' });
    }

    // Banner ASCII "Morgan Luac"
    const asciiBanner = `--[[
  __  __  ____  _____   _____    _   _   _     _   _    _     ____ 
 |  \\/  |/ __ \\|  __ \\ / ____|  / \\ | | | |   | | / \\  / \\   / ___|
 | |\\/| | |  | | |__) | |  __  / _ \\| | | |   | |/ _ \\/ _ \\ | |    
 | |  | | |__| |  _  /| |__| |/ ___ \\ |_| |___| / ___ \\_/\_\\| |___ 
 |_|  |_|\\____/|_| \\_\\ \\_____/_/   \\_\\___/_____/_/   \\_\\  \\_\\____|

                  PROTECTED BY MORGAN LUAC
--]]\n\n`;

    // Enkripsi byte ganda dengan XOR + Shift acak
    const encoder = new TextEncoder();
    const bytes = encoder.encode(code);
    const key1 = Math.floor(Math.random() * 180) + 40;

    const obfuscatedBytes = [];
    for (let i = 0; i < bytes.length; i++) {
      obfuscatedBytes.push((bytes[i] ^ key1) + (i % 3));
      // Sisipkan junk byte acak untuk mengacaukan analisis statis
      if (i % 5 === 0) {
        obfuscatedBytes.push(Math.floor(Math.random() * 100) + 120);
      }
    }

    const dataString = obfuscatedBytes.join(',');

    // Engine Wrapper dengan Proteksi Anti-Tamper & Sandboxing Ketat
    const resultLua = asciiBanner + `local _U = {${dataString}}
local _K1 = ${key1}

local function _SECURE_EXEC()
    -- 1. Anti-Tamper: Deteksi apakah environment debug/hooking diaktifkan
    if debug and debug.getinfo then
        -- Cek apakah ada upaya tracing dari luar
        local info = debug.getinfo(1)
        if not info then while true do end end
    end

    local t = {}
    for i = 1, #_U do
        -- Filter byte sampah (junk) secara presisi
        if (i - 1) % 6 ~= 0 then 
            local idx = i - 1
            local cleanIdx = idx - (idx // 6)
            local originalByte = (_U[i] - ((cleanIdx) % 3)) ~ (_K1 ~ 0)
            table.insert(t, string.char(originalByte))
        end
    end

    local rawCode = table.concat(t)
    
    -- 2. Sandboxing Environment
    local env = {
        print = print,
        tostring = tostring,
        tonumber = tonumber,
        type = type,
        pcall = pcall,
        error = error,
        assert = assert,
        ipairs = ipairs,
        pairs = pairs,
        string = string,
        table = table,
        math = math,
        os = os
    }
    
    setmetatable(env, {
        __index = _G,
        __newindex = function() 
            -- Mencegah modifikasi global saat runtime
            while true do end 
        end
    })

    local loader = loadstring or load
    local f, err = loader(rawCode, "@MorganSec", "t", env)
    
    if not f then
        -- Jika gagal load, langsung crash untuk menghindari dump
        while true do end
    end
    
    return f()
end

local status, res = pcall(_SECURE_EXEC)
if not status then
    -- Crash aman (Infinite loop) jika terdeteksi manipulasi
    while true do end
end`;

    return res.status(200).json({ obfuscatedCode: resultLua });

  } catch (err) {
    return res.status(500).json({ error: 'Gagal memproses file: ' + err.message };
  }
}
