import { Request, Response } from 'express';
import { Router } from "express";
import { render } from '../utils/route';
import { login as fishpiLogin } from '../lib/fishpi';
import { login as githubLogin } from '../lib/github';
import { login as steamLogin } from '../lib/steam';

const router = Router();

router.get("/", (req: Request, res: Response) => {
  const error = req.session.error || '';
  req.session.error = '';
  return render(res, "login").title('用户登录').error(error).render();
});
router.get("/fishpi", fishpiLogin);
router.get("/github", githubLogin);
router.get("/steam", steamLogin);

export default router;