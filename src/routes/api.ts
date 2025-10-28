import { Router } from "express";
import GameRouter from "./game";

const router = Router();

router.use("/game", GameRouter);

export default router;