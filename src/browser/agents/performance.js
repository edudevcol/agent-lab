(() => {
    const { pick } = window.__agentLab.helpers;

    window.__agentLab.registerAgent({
        id: 'perf',
        name: 'Rendimiento',
        short: 'RE',
        color: '#0e7490',
        face: '👨🏻‍🚀',
        async run(ag) {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav) {
                const load = Math.round(nav.loadEventEnd || nav.domContentLoadedEventEnd);
                if (load > 3000) await ag.inspectPage('warn', `Carga lenta: ${load} ms`);
                else await ag.inspectPage('ok', `Carga completa en ${load} ms`);
            }

            const resources = performance.getEntriesByType('resource');
            const kb = Math.round(resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024);
            if (kb > 2048) await ag.inspectPage('warn', `${resources.length} recursos, ${kb} KB transferidos (pesado)`);
            else await ag.inspectPage('ok', `${resources.length} recursos, ${kb} KB transferidos`);

            for (const img of pick('img', 8)) {
                const belowFold = img.getBoundingClientRect().top + scrollY > innerHeight;
                if (img.naturalWidth > 400 && img.naturalWidth > img.clientWidth * 2) {
                    await ag.inspect(img, 'warn', `Imagen sobredimensionada: ${img.naturalWidth}px para ${img.clientWidth}px`);
                } else if (belowFold && img.loading !== 'lazy') {
                    await ag.inspect(img, 'warn', 'Imagen fuera de pantalla sin loading="lazy"');
                } else {
                    await ag.inspect(img, 'ok', 'Tamaño de imagen adecuado');
                }
            }
        },
    });
})();
