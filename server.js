const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./models/database');
const Barber = require('./models/Barber');
const Appointment = require('./models/Appointment');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();

// Configuração CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Middleware para headers de segurança
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
// Debug middleware for token
app.use((req, res, next) => {
  console.log('Rota acessada:', req.path);
  console.log('Headers:', req.headers);
  console.log('Auth Header:', req.header('Authorization'));
  next();
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const mockUsers = [
      {
        id: '1',
        username: 'admin',
        password: '123456',
        role: 'admin',
        name: 'Admin'
      },
      {
        id: '2',
        username: 'maicon',
        password: '123456',
        role: 'barber',
        name: 'Maicon'
      },
      {
        id: '3',
        username: 'brendon',
        password: '123456',
        role: 'barber',
        name: 'Brendon'
      }
    ];

    const user = mockUsers.find(u => u.username === username && u.password === password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário ou senha inválidos'
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    // Debug middleware
    app.use((req, res, next) => {
      console.log('=== Debug Token ===');
      console.log('Path:', req.path);
      console.log('Authorization Header:', req.headers.authorization);
      console.log('=================');
      next();
    });
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para verificar token
app.get('/api/auth/verify', async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token não fornecido'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      success: true,
      data: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        name: decoded.name
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
});
// Rota para criar barbeiros
app.post('/api/barbers', async (req, res) => {
  try {
    const barber = await Barber.createBarber(req.body);
    res.status(201).json({
      success: true,
      data: barber
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
// Nova rota para listar barbeiros
app.get('/api/barbers', async (req, res) => {
  try {
    const barbers = await Barber.findAll();
    res.json({
      success: true,
      data: barbers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Rota para criar agendamentos
app.post('/api/appointments', async (req, res) => {
  try {
    const appointment = await Appointment.create({
      id: Date.now().toString(),
      ...req.body
    });
    
    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
app.patch('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const appointment = await Appointment.findByPk(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    }

    await appointment.update({ status });
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByPk(id);
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
    }

    await appointment.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// Rota para listar agendamentos
app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.findAll();
    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// Inicialização do banco de dados
const initDatabase = async () => {
  try {
    await sequelize.sync();
    
    // Verificar se já existem barbeiros
    const barbersCount = await Barber.count();
    if (barbersCount === 0) {
      // Adicionar os barbeiros iniciais
      await Barber.bulkCreate([
        {
          id: '01',
          name: 'Maicon',
          whatsapp: '21997764645',
          pix: '21997761646'
        },
        {
          id: '02',
          name: 'Brendon',
          whatsapp: '2199774658',
          pix: '21554875965'
        }
      ]);
      console.log('Barbeiros iniciais adicionados com sucesso!');
    }

    const PORT = process.env.PORT || 3000;

    // Verificar se a porta está em uso
    const server = app.listen(PORT)
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`A porta ${PORT} está em uso. Tentando encerrar o processo...`);
          require('child_process').exec(`npx kill-port ${PORT}`, (error) => {
            if (error) {
              console.error('Erro ao tentar liberar a porta:', error);
              process.exit(1);
            }
            console.log(`Porta ${PORT} liberada. Reiniciando o servidor...`);
            server.listen(PORT, () => {
              console.log(`Servidor rodando na porta ${PORT}`);
            });
          });
        } else {
          console.error('Erro ao iniciar o servidor:', err);
          process.exit(1);
        }
      })
      .on('listening', () => {
        console.log(`Servidor rodando na porta ${PORT}`);
      });

  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
  }
};

// Rota para obter slots reservados
app.get('/api/appointments', async (req, res) => {
  try {
    const bookedSlots = await AvailableSlots.findAll({
      where: {
        is_booked: true
      }
    });
    res.json({
      success: true,
      data: bookedSlots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

initDatabase();
