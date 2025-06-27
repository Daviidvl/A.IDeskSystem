const chatList = document.getElementById('chat-list');
const chatBox = document.getElementById('chat');
const form = document.getElementById('chatForm');
const input = document.getElementById('mensagem');

let chats = {}; // { clienteId: [mensagens] }
let clienteSelecionado = null;
let clientesComNotificacao = new Set();

// Gera avatares dinâmicos só com clienteId
function gerarAvatar(clienteId) {
  const numero = Math.floor(Math.random() * 70) + 1;
  return `https://i.pravatar.cc/150?img=${numero}`;
}

function renderChatList() {
  chatList.innerHTML = '';
  Object.keys(chats).forEach(clienteId => {
    const mensagens = chats[clienteId];
    const ultima = mensagens[mensagens.length - 1];
    const cliente = mensagens.find(m => m.autor === 'cliente');
    const nome = cliente?.nome || clienteId;
    const genero = cliente?.genero || 'masculino';
    const problema = cliente?.problema || '';

    const icone = genero === 'feminino' ? '👩' : '👨';

    const li = document.createElement('li');
    li.classList.add('chat-item');
    li.innerHTML = `
      <div class="icone-genero">${icone}</div>
      <div class="chat-info">
        <strong>${nome}</strong>
        <small>${problema}</small>
      </div>
      ${clientesComNotificacao.has(clienteId) && clienteSelecionado !== clienteId
        ? `<span class="notificacao"></span>` : ''
      }
    `;
    li.onclick = () => abrirChat(clienteId);
    chatList.appendChild(li);
  });
}


function abrirChat(clienteId) {
  clienteSelecionado = clienteId;
  clientesComNotificacao.delete(clienteId); // remove notificação
  renderizarMensagens();
  renderChatList();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!clienteSelecionado) return alert('Selecione um chat.');

  const mensagem = input.value;
  input.value = "";

  await fetch('/mensagem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensagem, autor: 'tecnico', clienteId: clienteSelecionado })
  });
});

async function atualizarMensagens() {
  const res = await fetch('/mensagens');
  const data = await res.json();

  const novosChats = {};
  data.forEach(m => {
    if (!novosChats[m.clienteId]) novosChats[m.clienteId] = [];
    novosChats[m.clienteId].push(m);
  });

  // Detecta novos chats ou mensagens
  for (const cid in novosChats) {
    const novasMsgs = novosChats[cid];
    const anteriores = chats[cid] || [];
    if (novasMsgs.length > anteriores.length && cid !== clienteSelecionado) {
      clientesComNotificacao.add(cid);
    }
  }

  chats = novosChats;
  renderizarMensagens();
  renderChatList();
}

function renderizarMensagens() {
  if (!clienteSelecionado) {
    chatBox.innerHTML = '<p style="text-align:center;">Selecione um chat</p>';
    return;
  }

  const mensagens = chats[clienteSelecionado] || [];
  chatBox.innerHTML = mensagens.map(m => `
    <div class="mensagem ${m.autor}">
      <strong>${m.autor === 'cliente' ? 'Cliente' : 'Técnico'}:</strong> ${m.texto}
    </div>
  `).join('');
  chatBox.scrollTop = chatBox.scrollHeight;
}

setInterval(atualizarMensagens, 1000);



