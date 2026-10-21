function applyXorTransformation(srcCode) {
    let key = Math.floor(Math.random() * 151) + 50;

    let processed = srcCode.replace(/"(.*?)"/g, (match, str) => {
        if (str === "") return '""';
        if (str.includes("string.char")) return '"' + str + '"';
        let bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i) ^ key);
        }
        return '(function() local t={' + bytes.join(",") + '} local s="" for i=1,#t do s=s..string.char(bit.bxor(t[i],' + key + ')) end return s end)()';
    });

    processed = processed.replace(/'(.*?)'/g, (match, str) => {
        if (str === "") return "''";
        if (str.includes("string.char")) return "'" + str + "'";
        let bytes = [];
        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i) ^ key);
        }
        return "(function() local t={" + bytes.join(",") + "} local s="" for i=1,#t do s=s..string.char(bit.bxor(t[i]," + key + ")) end return s end)()";
    });

    return processed;
}

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        res.setHeader('Content-Type', 'application/json');
        return res.status(405).end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        try {
            const parsed = JSON.parse(body || '{}');
            const sourceCode = parsed.sourceCode;

            if (!sourceCode || sourceCode.trim() === '') {
                return res.end(JSON.stringify({ success: false, error: 'Source code masih kosong!' }));
            }

            let logProgress = "1/2 Xor (Mengenkripsi string teks)...\n";
            const xorCode = applyXorTransformation(sourceCode);
            logProgress += "2/2 Xor *Selesai\n";
            logProgress += "[SUKSES] Semua tahapan selesai! Hasil proteksi siap di-download.";

            return res.end(JSON.stringify({
                success: true,
                log: logProgress,
                protectedCode: `-- [Protected by Morganz Obfuscator Ultimate v6.2 Web]\n` + xorCode
            }));
        } catch (err) {
            return res.end(JSON.stringify({ success: false, error: 'Invalid JSON body: ' + err.message }));
        }
    });
};
