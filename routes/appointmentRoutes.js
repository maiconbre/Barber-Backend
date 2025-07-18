const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { limitRepeatedRequests } = require('../middleware/requestLimitMiddleware');

// Configuração do limitador de chamadas repetidas para agendamentos
const appointmentLimiter = limitRepeatedRequests({
  maxRepeatedRequests: 3, // Limita a 3 chamadas idênticas
  blockTimeMs: 300000, // Bloqueia por 5 minutos (300000ms)
  message: {
    success: false,
    message: 'Muitas requisições idênticas. Esta operação está temporariamente bloqueada.'
  }
});

// Rota para listar agendamentos com limitador
router.get('/', appointmentLimiter, async (req, res) => {
  try {
    const { barberId } = req.query;
    const appointments = await Appointment.findAll({
      where: barberId ? { barberId } : {},
      order: [['date', 'DESC'], ['time', 'ASC']]
    });

    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rota para criar agendamentos com limitador
router.post('/', appointmentLimiter, async (req, res) => {
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

// Atualizar status do agendamento com limitador
router.patch('/:id', appointmentLimiter, async (req, res) => {
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

// Excluir agendamento com limitador
router.delete('/:id', appointmentLimiter, async (req, res) => {
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

module.exports = router;