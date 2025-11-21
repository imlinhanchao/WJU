import { Request, Response } from 'express';
import { Router } from "express";
import Game from "../lib/core";

const router = Router();

router.post("/action/:action", (req: Request, res: Response) => new Game().action(req, res));
router.post("/revoke", (req: Request, res: Response) => new Game().revoke(req, res));
router.post("/start", (req: Request, res: Response) => new Game().start(req, res));
router.post("/publish", (req: Request, res: Response, next) => new Game().publish(req, res, next));

export default router;