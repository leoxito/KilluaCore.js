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
        
        // Opción 1: Si enviaron un enlace directamente
        if (args[0] && args[0].startsWith('http')) {
            const response = await axios.post(apiUrl, { url: args[0] }, {
                headers: { 'Content-Type': 'application/json', 'apikey': apikey }
            });
            finalUrl = response.data.result.url;
        } 
        // Opción 2: Si respondieron a una imagen
        else if (mime && (mime.includes('image') || mime.includes('video'))) {
            const media = await downloadMediaMessage(q, 'buffer', {}, { logger: P({ level: 'silent' }) });
            let extension = mime.split('/')[1] || (mime.includes('image') ? 'jpg' : 'mp4');
            if (extension === 'jpeg') extension = 'jpg';
            if (extension.includes(';')) extension = extension.split(';')[0];
            
            const filename = `file_${Date.now()}.${extension}`;
            
            const response = await axios.post(`${apiUrl}/raw?filename=${filename}`, media, {
                headers: { 
                    'apikey': apikey,
                    'Content-Type': 'application/octet-stream'
                }
            });
            
            if (!response.data.status) throw new Error(response.data.message || 'Error al subir');
            finalUrl = response.data.result.url;
        } 
        else {
                        return reply(`🪵 *Por favor, responde a una imagen o envía un enlace de imagen.*`);

        reply(`> ✎ *Enlace:* ${finalUrl}`);
    } catch (e) {
        reply(`Error: ${e.message}`);
    }
}
break;