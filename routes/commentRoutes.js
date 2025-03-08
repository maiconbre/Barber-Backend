const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { protect, admin } = require('../middleware/authMiddleware');

// Rota para criar um novo comentário (pública)
router.post('/', async (req, res) => {
  try {
    const { name, comment } = req.body;

    if (!name || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Nome e comentário são obrigatórios'
      });
    }

    const newComment = await Comment.create({
      id: Date.now().toString(),
      name,
      comment,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: newComment
    });
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar comentário'
    });
  }
});

// Rota para listar todos os comentários (pública)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let whereClause = {};
    
    // Se não for especificado um status ou não for um admin, mostrar apenas aprovados
    if (!status) {
      whereClause.status = 'approved';
    } else if (status === 'pending' || status === 'rejected') {
      // Verificar se o usuário tem permissão para ver comentários pendentes/rejeitados
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Não autorizado a visualizar comentários pendentes ou rejeitados'
        });
      }
      whereClause.status = status;
    } else {
      whereClause.status = 'approved';
    }

    const comments = await Comment.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error('Erro ao listar comentários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar comentários'
    });
  }
});

// Rota para listar todos os comentários (incluindo pendentes) - apenas admin
router.get('/admin', protect, admin, async (req, res) => {
  try {
    const comments = await Comment.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error('Erro ao listar comentários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar comentários'
    });
  }
});

// Rota para atualizar o status de um comentário (apenas admin)
router.patch('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido'
      });
    }

    const comment = await Comment.findByPk(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentário não encontrado'
      });
    }

    await comment.update({ status });

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar comentário'
    });
  }
});

module.exports = router;