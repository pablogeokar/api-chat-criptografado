import { Router } from 'express';
import { MessageController } from '../controllers/MessageController';

const messageRoutes = Router();
const messageController = new MessageController();

messageRoutes.post('/', messageController.send);
messageRoutes.get('/chat/:receiverId', messageController.getChat);

export { messageRoutes };