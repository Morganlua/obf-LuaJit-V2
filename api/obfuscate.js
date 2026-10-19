import fengari from 'fengari';

function createXorStringExpr(str, key) {
    if (!str || str.length === 0) return '""';
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) ^ key);
    }
    return `((function() local _t={${bytes.join(',')}} local _s={} for _i=1,#_t do _s[_i]=string.char(bit.bxor(_t[_i],${key})) end return table.concat(_s) end)())`;
}

// Generator Junk mentah yang diselipkan via string concat agar tidak merusak syntax Lua
function generateInlineJunk() {
    const rawJunkPool = [
        '""..\x00\xFF"\x01@@jshs".."',
        '("")or"\x00\x00\xFFgamsjehash".."',
        '""..\x01\x01\x00"\x00".."',
        '("")and"\xFF\xFF@@".."'
    ];
    return rawJunkPool[Math.floor(Math.random() * rawJunkPool.length)];
}

function obfuscateSourceCode(srcCode) {
    const key = Math.floor(Math.random() * 180) + 35;
    let processed = srcCode;

    // 1. Enkripsi string biasa
    processed = processed.replace(/(["'])([^"\\]*(?:\\.[^"\\]*)*)\1/g, (match, quote, p1) => {
        return createXorStringExpr(p1, key);
    });

    // 2. Enkripsi global API
    const globalIdentities = [
        "script_name", "script_author", "script_version", "script_description",
        "sampAddChatMessage", "sampRegisterChatCommand", "isSampAvailable",
        "gg", "ffi", "ev", "requests", "wait", "clear_chat_box"
    ];
    
    for (const name of globalIdentities) {
        const encExpr = createXorStringExpr(name, key);
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        processed = processed.replace(regex, `_G[${encExpr}]`);
    }

    // Sisipkan junk mentah di sela-sela pemanggilan fungsi atau antar baris
    const lines = processed.split('\n');
    let finalCode = `--[[ Protected by Morgan Extreme Obfuscator ]]\nlocal bit = require('bit')\n`;

    for (let line of lines) {
        finalCode += line;
        // Peluang 50% menyisipkan junk mentah di ujung baris atau sela kode
        if (Math.random() < 0.50 && line.trim().length > 0 && !line.includes('--')) {
            finalCode += ` --[[ \x00\xFF\x01@@gamsjehash ]] `;
        }
        finalCode += '\n';
    }

    return finalCode;
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
            message: "Berhasil di-obfuscate dengan inline junk!"
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
