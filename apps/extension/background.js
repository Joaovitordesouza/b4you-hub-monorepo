// background.js (Service Worker)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'tokenExtracted') {
        console.log("Access Token capturado (Background):", message.token.substring(0, 20) + '...');
        
        // Salva no storage local
        chrome.storage.local.set({ kiwify_access_token: message.token }, () => {
            console.log("Token salvo no storage local com sucesso.");
        });
    }
});
