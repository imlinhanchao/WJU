import { Request, Response } from 'express';
import { Router } from "express";
import { GameRepo, ProfileRepo } from '../entities';
import { render } from '../utils/route';
import Game from "../lib/core";
import ApiRouter from "./api";
import LoginRouter from "./login";
import ProfileRouter from "./profile";
import PlayRouter from "./playground";
import { Not } from 'typeorm';

const router = Router();

router.use("/api", ApiRouter);
router.use("/login", LoginRouter);
router.use("/logout", (req: Request, res: Response) => {
  req.session.user = undefined;
  res.redirect("/");
});
router.use("/u", ProfileRouter);
router.get("/rank", async (req: Request, res: Response) => {
  const ranks = await ProfileRepo.find({
    order: { avgScore: "DESC", winRate: "DESC", matched: "DESC", avgSteps: "ASC" },
    take: 100,
  })
  return render(res, "rank", req).title(`排行榜`).render({ ranks })
});
router.get("/records", async (req: Request, res: Response) => {
  const userId = req.session.user?.id;
  if (!userId) {
    return res.redirect("/login?redirect=/records");
  }
  const records = await GameRepo.find({
    where: { userId },
    order: { createTime: "DESC" },
    take: 100,
  });
  return render(res, "records", req).title(`游戏记录`).render({ records: records.map(r => ({
    ...r,
    createDate: new Date(Number(r.createTime)).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  })) });
});
router.use("/playground", PlayRouter);
router.get("/", (req: Request, res: Response) => new Game().run(req, res));
router.get("/difficult", (req: Request, res: Response) => new Game().run(req, res));

export default router;