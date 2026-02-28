case 'upload': case 'tourl': {
    const message = msg;
    const q = message.message?.extendedTextMessage?.contextInfo?.quotedMessage ? {
        message: message.message.extendedTextMessage.contextInfo.quotedMessage,
        key: {
            remoteJid: from,
            fromMe: message.message.extendedTextMessage.contextInfo.participant === conn.user.id,
            id: message.message.extendedTextMessage.contextInfo.stanzaId,
            participant: message.message.extendedTextMessage.contextInfo.participant
        },
        type: Object.keys(message.message.extendedTextMessage.contextInfo.quotedMessage)[0]
    } : message;
    const mime = (q.msg || q.message?.[Object.keys(q.message || {})[0]])?.mimetype || '';

    try {
        if (mime && mime.includes('image')) {
            const media = await downloadMediaMessage(q, 'buffer', {}, { logger: P({ level: 'silent' }) });
            const extension = mime.split('/')[1] || 'jpg';
            const filename = `file_${Date.now()}.${extension}`;

            const fd = new FormData();
            fd.append("file", new Blob([media]), filename);
            fd.append("expiry", "120");

            const r = await fetch("https://cdn.russellxz.click/upload.php", {
                method: "POST",
                body: fd,
            });

            if (!r.ok) throw new Error(`upload_http_${r.status}`);
            const j = await r.json();
            const finalUrl = String(j?.url || "");
            
            if (!finalUrl) throw new Error("upload_no_url");

            reply(`✎ *Enlace:* ${finalUrl}`);
        } else {
            return reply(`🪵 *Por favor, responde a una imagen.*`);
        }
    } catch (e) {
        reply(`Error: ${e.message}`);
    }
}
break;

case 'tourl': {
    const apikey = 'corvette';
    const apiUrl = 'https://api-sky.ultraplus.click/cdn/tourl';
    const message = msg; 
    const q = message.message?.extendedTextMessage?.contextInfo?.quotedMessage ? {
        message: message.message.extendedTextMessage.contextInfo.quotedMessage,
        key: {
            remoteJid: from,
            fromMe: message.message.extendedTextMessage.contextInfo.participant === conn.user.id,
            id: message.message.extendedTextMessage.contextInfo.stanzaId,
            participant: message.message.extendedTextMessage.contextInfo.participant
        },
        type: Object.keys(message.message.extendedTextMessage.contextInfo.quotedMessage)[0]
    } : message;
    const mime = (q.msg || q.message?.[Object.keys(q.message || {})[0]])?.mimetype || '';

    try {
        let finalUrl = '';
        if (args[0] && args[0].startsWith('http')) {
            const response = await axios.post(apiUrl, { url: args[0] }, {
                headers: { 'Content-Type': 'application/json', 'apikey': apikey }
            });
            finalUrl = response.data.result.url;
        } else if (mime && mime.includes('image')) {
            const media = await downloadMediaMessage(q, 'buffer', {}, { logger: P({ level: 'silent' }) });
            let extension = mime.split('/')[1] || 'jpg';
            if (extension === 'jpeg') extension = 'jpg';
            const filename = `file_${Date.now()}.${extension}`;
            const response = await axios.post(`${apiUrl}/raw?filename=${filename}`, media, {
                headers: { 
                    'apikey': apikey,
                    'Content-Type': 'application/octet-stream'
                }
            });
            if (!response.data.status) throw new Error(response.data.message);
            finalUrl = response.data.result.url;
        } else {
            return reply(`🪵 *Por favor, responde a una imagen o envía un enlace de imagen.*`);
        }
        reply(`> ✎ *Enlace:* ${finalUrl}`);
    } catch (e) {
        reply(`Error: ${e.message}`);
    }
}
break;