(() => {
    const { pick } = window.__agentLab.helpers;

    window.__agentLab.registerAgent({
        id: 'security',
        name: 'Seguridad',
        short: 'SE',
        color: '#b91c1c',
        face: '🕵🏽',
        async run(ag, ctx) {
            const https = location.protocol === 'https:';
            if (https) await ag.inspectPage('ok', 'La página usa HTTPS');
            else await ag.inspectPage('error', 'La página no usa HTTPS');

            const h = ctx.headers || {};
            const csp = h['content-security-policy'] || '';
            const checks = [
                [csp, 'Content-Security-Policy'],
                [h['strict-transport-security'], 'Strict-Transport-Security (HSTS)'],
                [h['x-content-type-options'], 'X-Content-Type-Options'],
                [h['x-frame-options'] || csp.includes('frame-ancestors'), 'protección contra clickjacking'],
            ];
            for (const [present, label] of checks) {
                if (present) await ag.inspectPage('ok', `Cabecera presente: ${label}`);
                else await ag.inspectPage('warn', `Falta cabecera: ${label}`);
            }

            if (https) {
                const mixed = pick('img[src^="http:"], script[src^="http:"], iframe[src^="http:"]', 5);
                for (const el of mixed) await ag.inspect(el, 'error', 'Recurso cargado por HTTP en página HTTPS');
            }

            for (const a of pick('a[target=_blank]', 6)) {
                const rel = (a.getAttribute('rel') || '').toLowerCase();
                if (rel.includes('noopener') || rel.includes('noreferrer')) await ag.inspect(a, 'ok', 'Nueva pestaña con rel="noopener"');
                else await ag.inspect(a, 'warn', 'Abre nueva pestaña sin rel="noopener"');
            }

            for (const form of pick('form', 4)) {
                const action = form.getAttribute('action') || '';
                const hasPassword = form.querySelector('input[type=password]');
                if (action.startsWith('http:')) await ag.inspect(form, 'error', 'El formulario envía datos por HTTP');
                else if (hasPassword && !https) await ag.inspect(form, 'error', 'Pide contraseña en una página sin HTTPS');
                else await ag.inspect(form, 'ok', 'Envío del formulario por canal seguro');
            }

            for (const pwd of pick('input[type=password]', 3)) {
                if (pwd.getAttribute('autocomplete')) await ag.inspect(pwd, 'ok', `Contraseña con autocomplete="${pwd.getAttribute('autocomplete')}"`);
                else await ag.inspect(pwd, 'warn', 'Contraseña sin atributo autocomplete');
            }

            const external = [...document.querySelectorAll('script[src]')].filter(
                (s) => new URL(s.src, location.href).host !== location.host && !s.integrity
            );
            if (external.length) await ag.inspectPage('warn', `${external.length} scripts de otros dominios sin integridad (SRI)`);
            else await ag.inspectPage('ok', 'Sin scripts externos sin verificar');
        },
    });
})();
