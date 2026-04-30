import * as chatbotService from '../services/chatbot.service.js';

export const askDocConcierge = async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, message: 'Message is required.' });
  }

  try {
    const response = await chatbotService.getChatResponse(message, history || []);
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('CHATBOT ERROR:', error?.message || error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Doc-Concierge encountered an error.'
    });
  }
};
