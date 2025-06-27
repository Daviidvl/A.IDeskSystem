const loginForm = document.getElementById('loginForm');
const chatContainer = document.getElementById('chatContainer');
const loginContainer = document.getElementById('loginContainer');
const chat = document.getElementById('chat');
const form = document.getElementById('chatForm');

let clienteId = localStorage.getItem('clienteId');
let nome = localStorage.getItem('nome');
let genero = localStorage.getItem('genero');
let problema = localStorage.getItem('problema');

if (clienteId && nome && genero && problema) {
  iniciarChat();
}

loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  nome = document.getElementById('nome').value;
  genero = document.getElementById('genero').value;
  problema = document.getElementById('problema').value;
  clienteId = 'cliente_' + Math.random().toString(36).substr(2, 9);

  localStorage.setItem('clienteId', clienteId);
  localStorage.setItem('nome', nome);
  localStorage.setItem('genero', genero);
  localStorage.setItem('problema', problema);

  iniciarChat();
});

function iniciarChat() {
  loginContainer?.classList.add('hidden');
  chatContainer.classList.remove('hidden');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('mensagem');
    const mensagem = input.value;
    input.value = "";

    chat.innerHTML += `<div class="mensagem cliente"><strong>${nome}:</strong> ${mensagem}</div>`;
    chat.scrollTop = chat.scrollHeight;

    try {
      await fetch('/mensagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem, clienteId, nome, genero, problema })
      });
    } catch (error) {
      chat.innerHTML += `<div class="mensagem erro"><strong>Erro:</strong> Não foi possível enviar a mensagem.</div>`;
    }
  });

  setInterval(async () => {
    const res = await fetch('/mensagens');
    const data = await res.json();
    const minhas = data.filter(m => m.clienteId === clienteId);
    chat.innerHTML = minhas.map(m => `
      <div class="mensagem ${m.autor}">
        <strong>${m.autor === 'cliente' ? nome : 'Técnico'}:</strong> ${m.texto}
      </div>
    `).join('');
    chat.scrollTop = chat.scrollHeight;
  }, 1000);
}



