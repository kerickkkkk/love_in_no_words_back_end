import { Request, Response } from 'express';
import express from 'express'
const router = express.Router();
/* GET home page. */
router.get('/',  (req: Request, res: Response): void => {
  res.render('index', { title: '歡迎來到傲嬌甜點店' });
});

export default router;
