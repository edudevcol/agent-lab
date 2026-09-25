(() => {
    const { pick, accessibleName } = window.__agentLab.helpers;

    window.__agentLab.registerAgent({
        id: 'a11y',
        name: 'Accesibilidad',
        short: 'AC',
        color: '#2563eb',
        face: '👩🏻‍💻',
        async run(ag) {
            const lang = document.documentElement.getAttribute('lang');
            if (lang) await ag.inspectPage('ok', `Idioma declarado: ${lang}`);
            else await ag.inspectPage('warn', 'La página no declara idioma (<html lang>)');

            for (const img of pick('img', 8)) {
                if (!img.hasAttribute('alt')) await ag.inspect(img, 'error', 'Imagen sin texto alternativo (alt)');
                else await ag.inspect(img, 'ok', img.alt ? `alt: "${img.alt.slice(0, 40)}"` : 'Imagen decorativa (alt vacío)');
            }

            const fields = pick('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea', 8);
            for (const field of fields) {
                const name = accessibleName(field);
                if (name) await ag.inspect(field, 'ok', `Campo con etiqueta: "${name.slice(0, 40)}"`);
                else if (field.placeholder) await ag.inspect(field, 'warn', `Campo sin etiqueta, solo placeholder "${field.placeholder}"`);
                else await ag.inspect(field, 'error', 'Campo de formulario sin etiqueta accesible');
            }

            for (const btn of pick('button, [role=button], input[type=submit], input[type=button]', 6)) {
                const name = accessibleName(btn);
                if (name) await ag.inspect(btn, 'ok', `Botón con nombre: "${name.slice(0, 40)}"`);
                else await ag.inspect(btn, 'error', 'Botón sin nombre accesible');
            }

            const h1 = document.querySelectorAll('h1').length;
            if (h1 === 0) await ag.inspectPage('warn', 'No hay encabezado principal <h1>');
            else if (h1 > 1) await ag.inspectPage('warn', `Hay ${h1} encabezados <h1>; lo usual es uno`);
            else await ag.inspectPage('ok', 'Un solo encabezado <h1>');
        },
    });
})();
