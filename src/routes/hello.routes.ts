import { Router } from 'express';
import { getHello } from '../controllers/hello.controller.js';

const router = Router();
router.get('/', getHello);

export default router;
