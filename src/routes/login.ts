import { Request, Response } from 'express';
import { Router } from "express";
import { render } from '../utils/route';
import { login as fishpiLogin } from '../lib/fishpi';
import { login as githubLogin } from '../lib/github';

const router = Router();

router.get("/", (req: Request, res: Response) => {
  return render(res, "login").title('用户登录').render();
});
router.get("/fishpi", fishpiLogin);
router.get("/github", githubLogin);

export default router;