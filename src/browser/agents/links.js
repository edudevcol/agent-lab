(() => {
    const { pick, sleep } = window.__agentLab.helpers;

    window.__agentLab.registerAgent({
        id: 'links',
        name: 'Enlaces',
        short: 'EN',
        color: '#047857',
        face: '🧭',
        async run(ag) {
            const anchors = pick('a[href]', 12);
            if (!anchors.length) {
                await ag.inspectPage('warn', 'No hay enlaces visibles para revisar');
                return;
            }
            for (const a of anchors) {
                const raw = a.getAttribute('href').trim();
                if (!raw || raw === '#' || raw.toLowerCase().startsWith('javascript:')) {
                    await ag.inspect(a, 'warn', 'Enlace sin destino real');
                    continue;
                }
                if (/^(mailto|tel):/i.test(raw)) {
                    await ag.inspect(a, 'ok', 'Enlace de contacto');
                    continue;
                }
                await ag.goTo(a);
                ag.say('Comprobando...');
                const { status, error } = await window.agentCheckLink(a.href);
                if (status >= 400) ag.record(a, 'error', `Enlace roto (HTTP ${status})`);
                else if (status === 0) ag.record(a, 'warn', `Sin respuesta (${error})`);
                else ag.record(a, 'ok', `Responde HTTP ${status}`);
                await sleep(status >= 400 || status === 0 ? 1100 : 450);
            }
        },
    });
})();
