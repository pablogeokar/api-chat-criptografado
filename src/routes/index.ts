import { Router } from 'express';
import { userRoutes } from './user.routes';
import { messageRoutes } from './message.routes';
import { authMiddleware } from '../middlewares/authMiddleware';

const routes = Router();

routes.use('/users', userRoutes);
routes.use('/messages', authMiddleware, messageRoutes);

export { routes };