import fengari from 'fengari';

function createXorStringExpr(str, key) {
    if (!str || str.length === 0) return '""';
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) ^ key);
    }
    return `((function() local _t={${bytes.join(',')}} local _s={} for _i=1,#_t do _s[_i]=string.char(bit.bxor(_t[_i],${key})) end return table.concat(_s) end)())`;
}

// Generator Junk & Simbol Acak yang disebar di sela-sela kode
function generateScatteredJunk() {
    const junkPool = [
        '--[[ �����@@���A@�@A�$�FAA�bA����A� ]]--',
        'local _junk_' + Math.floor(Math.random()*99999) + ' = "\xFF\x00\x00gamsjehash_v2\x01\x02"',
        '--[[\n  ⚠️ PROTECTED BY MORGAN WEB OBFUSCATOR ⚠️\n]]--',
        'local _dummy_' + Math.floor(Math.random()*99999) + ' = ""..string.char(103,97,95,106,97,115,104)'
    ];
    return junkPool[Math.floor(Math.random() * junkPool.length)];
}

function obfuscateSourceCode(srcCode) {
    const key = Math.floor(Math.random() * 150) + 40;
    let code = srcCode;

    // 1. Rename variabel buatan user agar tersamarkan (kecuali fungsi utama & main)
    const userFuncs = code.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (userFuncs) {
        userFuncs.forEach(fn => {
            const name = fn.replace('function ', '');
            if (name !== 'main' && !name.startsWith('SetPlayer')) {
                const randomAlias = '_0x' + Math.random().toString(36).substring(2, 8);
                const regex = new RegExp(`\\b${name}\\b`, 'g');
                code = code.replace(regex, randomAlias);
            }
        });
    }

    // 2. Enkripsi semua string literal dengan XOR
    code = code.replace(/(["'])([^"\\]*(?:\\.[^"\\]*)*)\1/g, (match, quote, p1) => {
        return createXorStringExpr(p1, key);
    });

    // 3. Enkripsi global API MonetLoader/SAMP
    const globalIdentities = [
        "script_name", "script_author", "script_version", "script_description",
        "sampAddChatMessage", "sampRegisterChatCommand", "isSampAvailable",
        "gg", "ffi", "ev", "requests", "wait", "clear_chat_box"
    ];
    
    for (const name of globalIdentities) {
        const encExpr = createXorStringExpr(name, key);
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        code = code.replace(regex, `_G[${encExpr}]`);
    }

    // 4. Pecah baris dan selipkan junk simbol acak di sela-selanya
    const lines = code.split('\n');
    let finalOutput = `--[[ PROTECTED BY MORGAN WEB OBFUSCATOR ]]\\nlocal bit = require('bit')\n`;

    for (let line of lines) {
        finalOutput += line + '\n';
        // Peluang 45% diselipin junk simbol acak di sela-sela baris
        if (Math.random() < 0.45 && line.trim().length > 0 && !line.includes('--')) {
            finalOutput += generateScatteredJunk() + '\n';
        }
    }

    return finalOutput;
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

        const protectedLuaSource = obfuscateSourceCode(code);

        return res.status(200).json({
            success: true,
            code: protectedLuaSource,
            message: "Berhasil di-obfuscate via GitHub Actions/Vercel!"
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
            }
