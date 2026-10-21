function applyXorTransformation(srcCode) {
    let key = Math.floor(Math.random() * 151) + 50; // Math.random(50, 200)

    // Enkripsi string kutipan ganda "..."
    let processed = srcCode.replace(/"(.*?)"/g, (match, str) => {
        if (str === "") return '""';
        if (str.includes("string.char")) return '"' + str + '"';
        let bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i) ^ key);
        }
        return '(function() local t={' + bytes.join(",") + '} local s="" for i=1,#t do s=s..string.char(bit.bxor(t[i],' + key + ')) end return s end)()';
    });

    // Enkripsi string kutipan tunggal '...'
    processed = processed.replace(/'(.*?)'/g, (match, str) => {
        if (str === "") return "''";
        if (str.includes("string.char")) return "'" + str + "'";
        let bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i) ^ key);
        }
        return "(function() local t={" + bytes.join(",") + "} local s=\"\" for i=1,#t do s=s..string.char(bit.bxor(t[i]," + key + ")) end return s end)()";
    });

    return processed;
}

module.exports = (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const { sourceCode } = req.body || {};
    if (!sourceCode || sourceCode.trim() === '') {
        return res.status(400).json({ success: false, error: 'Source code masih kosong!' });
    }

    try {
        let logProgress = "1/2 Xor (Mengenkripsi string teks)...
";
        const xorCode = applyXorTransformation(sourceCode);
        logProgress += "2/2 Xor *Selesai
";
        logProgress += "[SUKSES] Semua tahapan selesai! Hasil proteksi siap di-download.";

        return res.status(200).json({
            success: true,
            log: logProgress,
            protectedCode: `-- [Protected by Morganz Obfuscator Ultimate v6.2 Web]
` + xorCode
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
