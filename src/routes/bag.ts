import { UserRepo } from "@/entities";
import { Bag } from "@/entities/Bag";
import BagCore from "@/lib/bag";
import GameCore from "@/lib/core";
import { items } from "@/lib/item";
import utils from "@/utils";
import { error, json } from "@/utils/route";
import { Router } from "express";

const router = Router();

router.post('/useItem', async (req, res) => {
  new GameCore().useItem(req, res);
});

router.get('/list', async (req, res) => {
  let userId = req.query.userId as string;
  if (req.session.user?.isAdmin && req.query.userId) {
    userId = req.query.userId as string;
  }
  json(res, await new BagCore(userId).getBag());
});

router.post('/addItem', async (req, res, next) => {
  if (!req.session.user?.isAdmin) {
    return next();
  }
  const { type, count, remark, user } = req.body;
  const bag = new BagCore(user);
  json(res, await bag.addItem(type, count, remark));
});

function toFishpiData(bag: Bag) {
  return items.map((item) => ({
    itemKey: item.itemKey,
    itemName: item.itemName,
    count: bag[`${item.itemKey}Count` as keyof Bag] || 0,
  }));
}

router.use('/fishpi', async (req, res, next) => {
  const data = req.method === 'POST' ? req.body : req.query;
  if (data.apiKey !== utils.config.secret.marketKey) {
    return error(res, '无效的API密钥');
  }
  const user = await UserRepo.findOne({ where: { from: 'fishpi', username: data.userId } });
  if (!user) {
    return error(res, '用户不存在');
  }
  req.user = user;
  next();
});

router.post('/fishpi/updateInventory', async (req, res) => {
  const bag = new BagCore(req.user!.id);
  const { productKey, count, memo } = req.body;
  const items = toFishpiData(await bag.addItem(productKey, count, memo));
  json(res, items);
});

router.get('/fishpi/getInventory', async (req, res) => {
  const bag = new BagCore(req.user!.id);
  json(res, toFishpiData(await bag.getBag()));
});

export default router;