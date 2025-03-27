import express from 'express';
import { sendMessage, getMessages } from '../controllers/chatController';

const router = express.Router();

// Route to send a message
router.post('/send', sendMessage);

// Route to get messages
router.get('/messages', getMessages);

export default router;