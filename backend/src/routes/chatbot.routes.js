import express from 'express';
import * as chatbotController from '../controllers/chatbot.controller.js';

const router = express.Router();

router.post('/ask', chatbotController.askDocConcierge);

export default router;
