import { Request, Response } from 'express';
import { Router } from "express";
import { PlaygroundRepo, PlayRankRepo, PlayRecordRepo, UserRepo } from '@/entities';
import { And, Equal, FindOptionsWhere, In, LessThan, Not, Or } from 'typeorm';
import { error, json, render } from '@/utils/route';
import { Playground } from '@/entities/Playground';
import { PlayRecord } from '@/entities/PlayRecord';
import WJU from '@/lib/wju';
import { estimateDifficulty } from '@/lib/difficulty';
import { shortTime } from '@/utils';

const router = Router();

async function getPlaygrounds(userId: string, createTime: number = Date.now(), count: number = 20, draft: boolean = false) {
  const playgrounds = await PlaygroundRepo.find({
    // where createTime < createTime AND (isPublished = true OR userId = userId)
    where: draft ? [
      { createTime: LessThan(createTime), userId },
    ] : [
      { createTime: LessThan(createTime), isPublished: true },
      { createTime: LessThan(createTime), userId },
    ],
    order: { isPublished: "ASC", createTime: "DESC" },
    take: count,
  });
  const userIds = Array.from(new Set(playgrounds.map(p => p.userId)));
  const users = await UserRepo.find({ where: { id: In(userIds) } });
  return playgrounds.map(p => ({
    ...p,
    user: users.find(u => u.id === p.userId),
    target: undefined,
    seed: undefined,
  }));
}

router.get("/", async (req: Request, res: Response) => {
  const createTime = Number(req.query.createTime as string || Date.now());
  const count = req.query.count ? parseInt(req.query.count as string) : 20;
  render(res, "playground/index", req).title("WJU 游乐场").render({
    playgrounds: await getPlaygrounds(req.session.user?.id || '', createTime, count),
  });
});

router.get("/create", async (req: Request, res: Response) => {
  render(res, "playground/create", req).title("创建谜题").render();
});

router.get("/draft", async (req: Request, res: Response) => {
  const createTime = Number(req.query.createTime as string || Date.now());
  const count = req.query.count ? parseInt(req.query.count as string) : 20;
  render(res, "playground/index", req).title("WJU 游乐场草稿").render({
    playgrounds: await getPlaygrounds(req.session.user?.id || '', createTime, count, true),
  });
});

router.get("/list", async (req: Request, res: Response) => {
  const createTime = Number(req.query.createTime as string || Date.now());
  const count = req.query.count ? parseInt(req.query.count as string) : 20;
  json(res, await getPlaygrounds(req.session.user?.id || '', createTime, count));
});

router.use("/game", (req: Request, res: Response, next) => {
    if (!req.session.user) {
      return error(res, "请先登录");
    }
    next();
});

router.post("/game", async (req: Request, res: Response) => {
  try {
    const defaultPlayground = new Playground();
    const keys = Object.keys(defaultPlayground).filter(k => k !== 'id' && defaultPlayground[k as keyof Playground] !== undefined);
    const playground = Object.assign(new Playground(), req.body);
    playground.userId = req.session.user?.id;
    playground.difficulty = estimateDifficulty(playground.target, 1.2);
    if (keys.some(key => playground[key as keyof Playground] === undefined)) {
      return error(res, "参数错误");
    }
    json(res, await PlaygroundRepo.save(PlaygroundRepo.create(playground)));
  } catch (err) {
    error(res, "创建失败: " + (err as Error).message);
  }
});

router.get("/game/gen", async (req: Request, res: Response) => {
  try {
    const source = req.query.source as string || '';
    const seed = Number(req.query.seed || Date.now());
    const game = new WJU().create(seed, source);
    json(res, {
      ...game
    });
  } catch (err) {
    error(res, "生成失败: " + (err as Error).message);
  }
});

router.use("/game/:id", async (req: Request, res: Response, next) => {
    const id = Number(req.params.id);
    const playground = await PlaygroundRepo.findOneBy({ id });
    if (!playground || (!playground.isPublished && playground.userId !== req.session.user?.id)) {
      return error(res, "游乐场不存在");
    }
    req.playground = playground;
    next();
});

router.put("/game/:id", async (req: Request, res: Response, next) => {
  try {
    if (!req.playground) {
      return next();
    }
    if (req.playground.userId !== req.session.user?.id) {
      return error(res, "无权限操作");
    }
    PlaygroundRepo.merge(req.playground, req.body);
    await PlaygroundRepo.update({ id: req.playground.id }, req.playground)
    json(res, req.playground);
  } catch (err) {
    error(res, "更新失败: " + (err as Error).message);
  }
});

router.delete("/game/:id", async (req: Request, res: Response, next) => {
  try {
    if (!req.playground) {
      return next();
    }
    if (req.playground.userId !== req.session.user?.id) {
      return error(res, "无权限操作");
    }
    json(res, await PlaygroundRepo.delete({ id: req.playground.id }));
  } catch (err) {
    error(res, "删除失败: " + (err as Error).message);
  }
});

router.post("/game/:id/publish", async (req: Request, res: Response, next) => {
  try {
    if (!req.playground) {
      return next();
    }
    if (req.playground.userId !== req.session.user?.id) {
      return error(res, "无权限操作");
    }
    req.playground.isPublished = true;
    await PlaygroundRepo.update({ id: req.playground.id }, req.playground)
    json(res, req.playground);
  } catch (err) {
    error(res, "发布失败: " + (err as Error).message);
  }
});

function getLastRecord(userId: string, playgroundId: number) {
  return PlayRecordRepo.createQueryBuilder('pr')
    .where('pr.userId = :userId', { userId })
    .andWhere('pr.playgroundId = :playgroundId', { playgroundId })
    .andWhere('pr.current <> pr.target')
    .orderBy('pr.createTime', 'DESC')
    .getOne();
}

function getBestRecord(userId: string, playground: Playground) {
  return userId ? PlayRecordRepo.createQueryBuilder('pr')
    .where('pr.userId = :userId', { userId })
    .andWhere('pr.playgroundId = :playgroundId', { playgroundId: playground.id })
    .andWhere('pr.current = pr.target')
    .andWhere(`pr.userId <> '${userId && playground.userId}'`)
    .orderBy('pr.steps', 'ASC')
    .getOne() : PlayRecordRepo.createQueryBuilder('pr')
    .andWhere('pr.playgroundId = :playgroundId', { playgroundId: playground.id })
    .andWhere('pr.current = pr.target')
    .orderBy('pr.steps', 'ASC')
    .getOne();
}

router.get("/game/:id/edit", async (req: Request, res: Response, next) => {
  try {
    if (!req.playground) {
      return next();
    }
    if (req.playground.userId !== req.session.user?.id) {
      return error(res, "无权限操作");
    }
    if (req.playground.isPublished) {
      return res.redirect(`/playground/game/${req.playground.id}`);
    }
    render(res, "playground/create", req).title(`游乐场 - 更新`).render({
      playground: req.playground,
    });
  } catch (err) {
    render(res, "playground/create", req).title(`游乐场`).render({
      error: "加载失败: " + (err as Error).message,
    });
  }
});

router.get("/game/:id", async (req: Request, res: Response, next) => {
  try {
    if (!req.playground) {
      return next();
    }
    if (!req.playground.isPublished) {
      return next();
    }
    let playRecord = await getLastRecord(req.session.user!.id, req.playground.id);
    let bestRecord = await getBestRecord(req.session.user!.id, req.playground);

    render(res, "playground/game", req).title(`游乐场 - ${req.playground.source}`).render({
      playground: {
        id: req.playground.id,
        source: req.playground.source,
        actions: [],
      },
      playRecord: playRecord ? {
        current: playRecord.current,
        history: playRecord.history,
        matchText: new WJU(playRecord).matchText,
      } : undefined,
      bestSteps: bestRecord ? bestRecord.steps : undefined,
      allBestSteps: req.playground.bestRecord || undefined,
    });
  } catch (err) {
    render(res, "playground/game", req).title(`游乐场`).render({
      error: "加载失败: " + (err as Error).message,
    });
  }
});

router.post("/game/:id/start", async (req: Request, res: Response, next) => {
  try {
    if (!req.playground) {
      return next();
    }
    
    let playRecord = await getLastRecord(req.session.user!.id, req.playground.id);
  
    if (!playRecord) {
      playRecord = new PlayRecord(req.playground);
      playRecord.userId = req.session.user!.id;
      playRecord.playgroundId = req.playground.id;
      playRecord = PlayRecordRepo.create(playRecord);
      await PlayRecordRepo.save(playRecord);
    }
    json(res, {
      current: playRecord.current,
      history: playRecord.history,
      matchText: new WJU(playRecord).matchText,
    });
  } catch (err) {
    error(res, "开始游戏失败: " + (err as Error).message);
  }
});

router.post("/game/:id/action/:action", async (req: Request, res: Response, next) => {
  try {
    if (!req.playground) {
      return next();
    }
    const action = req.params.action;
    const playRecord = await getLastRecord(req.session.user!.id, req.playground.id);

    if (!playRecord) {
      return error(res, "请先开始游戏");
    }

    const game = new WJU(playRecord);
    if (action === "revoke") {
      await game.doRevoke();
    } else if (action === 'restart') {
      game.options.current = playRecord.source;
      game.options.history = [];
    } else if (await game.doAction(action)) {
      playRecord.steps = playRecord.history.length;
      if (req.playground.userId !== req.session.user!.id && 
        (req.playground.bestRecord === 0 || playRecord.steps < req.playground.bestRecord)) {
        req.playground.bestRecord = playRecord.steps;
        await PlaygroundRepo.save(req.playground);
      }
    }
    playRecord.current = game.options.current;
    playRecord.history = game.options.history;
    playRecord.updatedTime = Date.now();
    await PlayRecordRepo.save(playRecord);

    json(res, {
      current: playRecord.current,
      history: playRecord.history,
      matchText: game.matchText,
      win: playRecord.current === playRecord.target,
    });
  } catch (err) {
    error(res, "游戏操作失败: " + (err as Error).message);
  }
});

router.get("/game/:id/records", async (req: Request, res: Response, next) => {
  try {
    if (!req.playground) {
      return next();
    }
    const playRecords = await PlayRecordRepo.find({ 
      where: {
        userId: req.session.user!.id,
        playgroundId: req.playground.id,
      },
      order: { steps: "ASC", createTime: "DESC" },
    });
    render(res, "playground/records", req).title("游玩记录").render({
      playground: req.playground,
      playRecords: playRecords.map(r => ({
        ...r,
        cost: shortTime(r.updatedTime - r.createTime),
      })),
    });
  } catch (err) {
    render(res, "playground/records", req).title("游玩记录").render({
      playground: req.playground,
      playRecords: [],
      error: "加载失败: " + (err as Error).message,
    });
  }
});

router.get("/game/:id/rank", async (req: Request, res: Response, next) => {
  try {
    if (!req.playground) {
      return next();
    }
    const ranks = await PlayRankRepo.find({ 
      where: {
        playgroundId: req.playground.id,
        userId: Not(req.playground.userId),
      },
      order: { steps: "ASC", cost: "ASC" },
    });
    const userIds = Array.from(new Set(ranks.map(p => p.userId)));
    const users = await UserRepo.find({ where: { id: In(userIds) } });
    render(res, "playground/rank", req).title("Playground 排行榜").render({
      playground: req.playground,
      ranks: ranks.map(r => ({
        ...r,
        cost: shortTime(Number(r.cost)),
        user: users.find(u => u.id === r.userId),
      })),
    });
  } catch (err) {
    render(res, "playground/rank", req).title("Playground 排行榜").render({
      playground: req.playground,
      ranks: [],
      error: "加载失败: " + (err as Error).message,
    });
  }
});

export default router;
