// content.js (Loader)
// Roda no contexto isolado da extensão, mas injeta o interceptor no contexto da página

function injectScript(file_path) {
    var s = document.createElement('script');
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', chrome.runtime.getURL(file_path));
    s.onload = function() {
        s.remove();
    };
    (document.head || document.documentElement).appendChild(s);
    console.log('[B4you Conect] Script interceptor injetado.');
}

injectScript('injector.js');

// Ouve mensagens do script injetado e retransmite para o background
window.addEventListener('message', function(event) {
    // Segurança: Verifica origem e tipo
    if (event.source === window && event.data.type === 'FROM_PAGE_SCRIPT') {
        if (event.data.action === 'tokenExtracted') {
            console.log('[B4you Conect] Content Script recebeu token, enviando para background...');
            chrome.runtime.sendMessage(event.data);
        }
    }
});
