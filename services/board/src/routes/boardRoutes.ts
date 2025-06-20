import { Router } from 'express';
import { createBoardHandler } from '../controllers/boardController';

const router = Router();

router.post('/boards', createBoardHandler);

export default router;