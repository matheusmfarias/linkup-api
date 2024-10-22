const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile'); // Adicione a rota de perfil

dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Servir arquivos estáticos da pasta 'uploads'

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes); // Use a rota de perfil

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(3000, () => {
      console.log('Server running on port 3000');
    });
  })
  .catch(err => {
    console.error('Connection error', err.message);
  });
