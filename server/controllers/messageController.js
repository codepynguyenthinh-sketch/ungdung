const { Message, User } = require('../models');

exports.sendMessage = async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung không được để trống' });
    }
    const message = await Message.create({ user_id: req.user.id, subject, body });
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.replyMessage = async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ success: false, message: 'Nội dung phản hồi không được để trống' });
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Không tìm thấy tin nhắn' });
    message.reply = reply;
    message.status = 'replied';
    await message.save();
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Không tìm thấy tin nhắn' });
    if (message.status === 'new') { message.status = 'read'; await message.save(); }
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};