const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const mensagens = [];

app.post('/mensagem', (req, res) => {
  const {
    mensagem,
    autor = 'cliente',
    clienteId = '',
    nome = '',
    genero = '',
    problema = ''
  } = req.body;

  mensagens.push({
    texto: mensagem,
    autor,
    clienteId,
    nome,
    genero,
    problema,
    timestamp: Date.now()
  });

  res.sendStatus(200);
});


app.get('/mensagens', (req, res) => {
  res.json(mensagens);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando: http://localhost:${PORT}`));



