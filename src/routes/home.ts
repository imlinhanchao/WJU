import { Request, Response } from 'express';
import { Router } from "express";
import { ProfileRepo } from '../entities';
import { render } from '../utils/route';
import Game from "../lib/core";
import ApiRouter from "./api";
import LoginRouter from "./login";
import ProfileRouter from "./profile";

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
    order: { winRate: "DESC", avgSteps: "ASC" },
    take: 100,
  })
  return render(res, "rank", req).title(`排行榜`).render({ ranks })
});
router.get("/", (req: Request, res: Response) => new Game().run(req, res));

export default router;