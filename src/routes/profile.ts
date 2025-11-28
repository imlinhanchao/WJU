import { ProfileRepo, UserRepo } from '../entities';
import { render } from '../utils/route';
import { shortTime } from '../utils/';
import { Request, Response } from 'express';
import { Router } from "express";
import BagCore from '@/lib/bag';
import { items } from '@/lib/item';
import { Bag } from '@/entities/Bag';

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
  const bag = req.session.user?.id === user.id || req.session.user?.isAdmin ? await new BagCore(user.id).getBag() : undefined;

  return render(res, "profile", req).title(`@${user.username}`).error(error).render({
    profile: {
      ...user,
      total: 0,
      matched: 0,
      winRate: 0,
      avgSteps: 0,
      avgTimeCost: 0,
      avgEarnedPoint: 0,
      ...profile,
    },
    bags: items.map((item) => ({
      key: item.itemKey,
      name: item.itemName,
      description: item.description,
      count: Number(bag?.[`${item.itemKey}Count` as keyof Bag] || 0),
    })).filter(bag => bag.count > 0),
    avgTimeCost: profile ? shortTime(profile.avgTimeCost * 1000) : 0,
  });
});

export default router;