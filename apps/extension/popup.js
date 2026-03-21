document.addEventListener('DOMContentLoaded', function() {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const btnAction = document.getElementById('btnAction');
  const btnDashboard = document.getElementById('btnDashboard');

  // Verifica se há um token salvo no storage da extensão
  chrome.storage.local.get(['kiwify_access_token'], function(result) {
    if (result.kiwify_access_token) {
      const token = result.kiwify_access_token;
      
      // Atualiza interface para estado Conectado
      statusDot.classList.add('active');
      statusText.textContent = 'Conectado';
      statusText.style.color = '#40E0D0';
      
      btnAction.disabled = false;
      btnAction.onclick = function() {
        navigator.clipboard.writeText(token).then(function() {
          const originalContent = btnAction.innerHTML;
          btnAction.innerHTML = '<span>Token Copiado!</span>';
          btnAction.style.background = '#34C759';
          
          setTimeout(() => {
            btnAction.innerHTML = originalContent;
            btnAction.style.background = '';
          }, 2000);
        }, function(err) {
          console.error('Erro ao copiar token: ', err);
        });
      };
    } else {
      // Estado Desconectado
      statusDot.classList.remove('active');
      statusText.textContent = 'Desconectado';
      statusText.style.color = '';
      btnAction.disabled = true;
    }
  });

  // Funcionalidade do botão para ir ao Dashboard
  btnDashboard.onclick = function() {
    chrome.tabs.create({ url: 'https://dashboard.kiwify.com/' });
  };
});
