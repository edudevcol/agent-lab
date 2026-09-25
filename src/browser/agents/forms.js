(() => {
    const { pick, sleep, typeInto, setValue } = window.__agentLab.helpers;

    window.__agentLab.registerAgent({
        id: 'forms',
        name: 'Formularios',
        short: 'FO',
        color: '#c2410c',
        face: '🧑🏼‍💼',
        async run(ag) {
            const fields = pick(
                'input[type=text], input[type=email], input[type=password], input[type=search], input[type=tel], input:not([type]), textarea',
                6
            );
            if (!fields.length) {
                await ag.inspectPage('ok', 'No hay campos de texto en esta página');
                return;
            }
            for (const field of fields) {
                await ag.goTo(field);
                const original = field.value;
                const sample = field.type === 'email' ? 'no-es-un-email' : field.type === 'password' ? 'Agente123!' : 'probando agente';
                ag.say('Escribiendo...');
                await typeInto(field, sample);

                if (field.type === 'email') {
                    if (field.checkValidity()) ag.record(field, 'warn', 'Acepta un email inválido');
                    else ag.record(field, 'ok', 'Rechaza un email inválido');
                } else if (field.maxLength > 0) {
                    ag.record(field, 'ok', `Acepta texto (máximo ${field.maxLength})`);
                } else {
                    ag.record(field, 'ok', 'Acepta entrada de texto');
                }
                await sleep(500);
                setValue(field, original);
                field.blur();
            }
            for (const btn of pick('button[type=submit], input[type=submit], form button:not([type])', 3)) {
                await ag.inspect(btn, 'ok', 'Botón de envío detectado (no se envía)');
            }
        },
    });
})();
