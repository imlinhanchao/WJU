import { ProfileRepo, UserRepo } from '../entities';
import { render } from '../utils/route';
import { shortTime } from '../utils/';
import { Request, Response } from 'express';
import { Router } from "express";

const router = Router();

router.get("/:from/:username", async (req: Request, res: Response, next) => {
  const error = req.session.error || '';
  req.session.error = '';
  const { from, username } = req.params;
  const user = await UserRepo.findOne({ where: { from, username } });
  if (!user) {
    return next();
  }
  const profile = await ProfileRepo.findOne({ where: { user: user.id } });
  return render(res, "profile").title(`@${user.username}`).error(error).render({
    profile,
    avgTimeCost: profile ? shortTime(profile.avgTimeCost * 1000) : 0,
  });
});

export default router;