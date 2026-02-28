// sistema/menu.js - Sistema automático de menú con tu misma decoración
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Escanea automáticamente la carpeta de comandos
const scanCommands = () => {
    const commandsDir = path.join(__dirname, '../commands')
    const categories = {}
    
    try {
        if (!fs.existsSync(commandsDir)) return categories
        
        const files = fs.readdirSync(commandsDir, { recursive: true })
        
        for (const file of files) {
            if (file.endsWith('.js')) {
                const filePath = path.join(commandsDir, file)
                const content = fs.readFileSync(filePath, 'utf8')
                
                // Extraer comandos del archivo
                const commandMatches = [...content.matchAll(/case\s+['"](.+?)['"]\s*:/g)]
                const categoryMatch = content.match(/category\s*:\s*['"](.+?)['"]/i)
                
                if (commandMatches.length > 0) {
                    const category = categoryMatch ? categoryMatch[1].toLowerCase() : 'general'
                    
                    if (!categories[category]) {
                        categories[category] = []
                    }
                    
                    commandMatches.forEach(match => {
                        if (!categories[category].includes(match[1])) {
                            categories[category].push(match[1])
                        }
                    })
                }
            }
        }
    } catch (e) {}
    
    return categories
}

// Mapeo de categorías (igual que en tu versión)
const categoriasMap = {
    'info': 'info', 'infobot': 'info', 'informacion': 'info', 'information': 'info', 'info-bot': 'info',
    'descargas': 'descargas', 'downloads': 'descargas', 'descargar': 'descargas', 'download': 'descargas',
    'utilidades': 'utilidades', 'utilidad': 'utilidades', 'tools': 'utilidades', 'herramientas': 'utilidades',
    'grupos': 'grupos', 'grupo': 'grupos', 'group': 'grupos', 'groups': 'grupos', 'admin': 'grupos',
    'perfil': 'perfil', 'profile': 'perfil', 'user': 'perfil', 'usuario': 'perfil',
    'economia': 'economia', 'economía': 'economia', 'economy': 'economia', 'money': 'economia', 'dinero': 'economia',
    'nsfw': 'nsfw', 'horny': 'nsfw', '+18': 'nsfw', 'sexo': 'nsfw', 'adulto': 'nsfw',
    'anime': 'anime', 'react': 'anime', 'reacciones': 'anime', 'reaction': 'anime', 'anime-react': 'anime'
}

export const menuContent = (pushName, usedPrefix, botName, dev, isSubBot, body) => {
    const args = body.trim().split(' ');
    let categoria = args.length > 1 ? args[1].toLowerCase() : 'all';
    const readMore = '‎'.repeat(1000);
    
    // Escanear comandos automáticamente
    const allCommands = scanCommands();

    // Función para crear secciones (igual que en tu versión)
    const crearSeccion = (titulo, comandos) => {
        return `˚.⋆ֹ　 ꒰ \`${titulo}\` ꒱ㆍ₊⊹\n${comandos.join('\n')}\n\n`;
    };

    // Construir secciones automáticamente desde los comandos escaneados
    const secciones = {};
    
    // Mapeo de títulos de categorías
    const titulosCategorias = {
        'info': 'I N F O – B O T',
        'descargas': 'D O W N L O A D S',
        'utilidades': 'U T I L I T I E S',
        'grupos': 'G R U P O S',
        'perfil': 'P E R F I L',
        'economia': 'E C O N O M Y',
        'nsfw': 'N S F W',
        'anime': 'A N I M E',
        'general': 'G E N E R A L'
    };

    // Descripciones por categoría
    const descripciones = {
        'info': '> ✐ Consulta el estado, la velocidad y la información general del sistema del Bot.',
        'descargas': '> ✐ Herramientas para obtener contenido multimedia de diversas plataformas sociales.',
        'utilidades': '> ✐ Funciones útiles para mejorar la experiencia diaria y edición rápida.',
        'grupos': '> ✐ Comandos exclusivos para la administración, control y seguridad de grupos.',
        'perfil': '> ✐ Gestión de identidad del usuario y personalización de datos personales.',
        'economia': '> ✐ Sistema de economía virtual para recolectar recursos y subir de nivel.',
        'nsfw': '> ✐ Contenido explícito y acciones destinadas únicamente a mayores de 18 años.',
        'anime': '> ✐ Reacciones y acciones emocionales inspiradas en escenas de anime para interactuar con otros.',
        'general': '> ✐ Comandos generales y misceláneos.'
    };

    // Construir cada sección con los comandos escaneados
    for (const [cat, commands] of Object.entries(allCommands)) {
        const catMapeada = categoriasMap[cat] || cat;
        const titulo = titulosCategorias[catMapeada] || catMapeada.toUpperCase();
        
        if (commands.length > 0) {
            const comandosLista = [];
            
            // Agregar descripción de la categoría
            if (descripciones[catMapeada]) {
                comandosLista.push(descripciones[catMapeada]);
            }
            
            // Agregar los comandos de forma similar a tu estilo
            const sortedCommands = [...commands].sort();
            
            // Crear pares de comandos (simulando los "›" que tenías)
            for (let i = 0; i < sortedCommands.length; i += 2) {
                if (i + 1 < sortedCommands.length) {
                    comandosLista.push(`✿ *${usedPrefix}${sortedCommands[i]}* › *${usedPrefix}${sortedCommands[i+1]}*`);
                } else {
                    comandosLista.push(`✿ *${usedPrefix}${sortedCommands[i]}*`);
                }
            }
            
            secciones[catMapeada] = crearSeccion(titulo, comandosLista);
        }
    }

    // Tu mismo encabezado y pie
    const tituloMenu = `Hola *${pushName}*, Soy *${botName}*\n> ᴀǫᴜɪ ᴛɪᴇɴᴇs ʟᴀ ʟɪsᴛᴀ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏs\n\n`;
    const botTypeStr = isSubBot ? 'Sub-Bot' : 'Bot Owner';

    const encabezado = `ꕤ Type ⊹ \`${botTypeStr}\`
✰ Prefix ⊹ \`${usedPrefix}\`
ꕤ System ⊹ \`Active\`
✰ Owner ⊹ \`${dev}\`
ꕤ Modo ⊹ \`Premium\``;

    const separador = `\n\n> *Canal* \`https://whatsapp.com/channel/0029VbBj5it3LdQMIxu7zP1l\`\n${readMore}\n`;
    const pie = `> *Powered by:* \`${dev}\``;

    // Mapear categoría según tu sistema
    categoria = categoriasMap[categoria] || categoria;

    if (categoria === 'all') {
        const contenido = Object.values(secciones).join('');
        return { text: tituloMenu + encabezado + separador + contenido + pie, type: 'success' };
    } else if (secciones[categoria]) {
        return { text: tituloMenu + encabezado + separador + secciones[categoria] + pie, type: 'success' };
    } else {
        const categoriasDisponibles = Object.keys(secciones).map(c => `*${c}*`).join(', ');
        const errorMsg = `✿ La categoría *${categoria}* no existe, las categorías disponibles son: ${categoriasDisponibles}.\n\n> Para ver la lista completa escribe *${usedPrefix}menu*\n> Para ver los comandos de una categoría escribe *${usedPrefix}menu [categoría]*\n> Ejemplo: *${usedPrefix}menu economy*`;
        return { text: errorMsg, type: 'error' };
    }
};

// Función para obtener todos los comandos
export const getAllCommands = scanCommands;