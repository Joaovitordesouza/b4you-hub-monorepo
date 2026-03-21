// injector.js (Interceptor)
// Roda no contexto da página (MAIN world)
(function() {
    console.log('[B4you Conect] 💉 Injector V3 iniciado.');

    const TARGET_PART = 'handleAuth/getIdToken';

    function notify(token) {
        if (!token) return;
        console.log('[B4you Conect] 🎯 Token encontrado!');
        window.postMessage({
            type: 'FROM_PAGE_SCRIPT',
            action: 'tokenExtracted',
            token: token
        }, window.location.origin);
    }

    // --- Monkey Patch XMLHttpRequest ---
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
            if (this._url && this._url.includes(TARGET_PART)) {
                try {
                    const data = JSON.parse(this.responseText);
                    if (data && data.access_token) {
                        notify(data.access_token);
                    }
                } catch (e) {
                    console.error('[B4you Conect] Erro XHR:', e);
                }
            }
        });
        return originalSend.apply(this, arguments);
    };

    // --- Monkey Patch Fetch ---
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(async (response) => {
            // Verifica URL
            const url = args[0] instanceof Request ? args[0].url : args[0];
            
            if (url && typeof url === 'string' && url.includes(TARGET_PART)) {
                const clone = response.clone();
                try {
                    const data = await clone.json();
                    if (data && data.access_token) {
                        notify(data.access_token);
                    }
                } catch (e) {
                    console.error('[B4you Conect] Erro Fetch:', e);
                }
            }
            return response;
        });
    };
})();
