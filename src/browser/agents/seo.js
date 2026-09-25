(() => {
    const { pick } = window.__agentLab.helpers;

    window.__agentLab.registerAgent({
        id: 'seo',
        name: 'SEO y contenido',
        short: 'SC',
        color: '#7e22ce',
        face: '🧑🏽‍🎨',
        async run(ag) {
            const title = document.title.trim();
            if (!title) await ag.inspectPage('error', 'La página no tiene <title>');
            else if (title.length < 10 || title.length > 65) await ag.inspectPage('warn', `Título de ${title.length} caracteres (ideal entre 10 y 65)`);
            else await ag.inspectPage('ok', `Título: "${title}"`);

            const desc = document.querySelector('meta[name="description"]')?.content?.trim();
            if (!desc) await ag.inspectPage('warn', 'Falta la meta description');
            else await ag.inspectPage('ok', `Meta description de ${desc.length} caracteres`);

            if (!document.querySelector('meta[name="viewport"]')) await ag.inspectPage('warn', 'Falta meta viewport (vista en móvil)');
            if (!document.querySelector('meta[property="og:title"]')) await ag.inspectPage('warn', 'Sin etiquetas Open Graph para compartir en redes');

            let previous = 0;
            for (const h of pick('h1, h2, h3, h4, h5, h6', 10)) {
                const level = Number(h.tagName[1]);
                const text = h.textContent.trim().slice(0, 35);
                if (previous && level > previous + 1) await ag.inspect(h, 'warn', `Salto de encabezado: h${previous} a h${level}`);
                else if (!text) await ag.inspect(h, 'warn', `Encabezado ${h.tagName} vacío`);
                else await ag.inspect(h, 'ok', `${h.tagName}: "${text}"`);
                previous = level;
            }
        },
    });
})();
