import { Request, Response } from 'express';
import { Router } from "express";
import Game from "../lib/core";
import ApiRouter from "./api";
import LoginRouter from "./login";

const router = Router();

router.use("/api", ApiRouter);
router.use("/login", LoginRouter);
router.get("/", (req: Request, res: Response) => new Game().run(req, res));

export default router;