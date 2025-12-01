import { UserRepo } from "@/entities";
import { Bag } from "@/entities/Bag";
import BagCore from "@/lib/bag";
import GameCore from "@/lib/core";
import Item, { BagItemType, items } from "@/lib/item";
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
    return res.json({ code: 403, msg: '无效的API密钥' });
  }
  const user = await UserRepo.findOne({ where: { from: 'fishpi', id: data.userId } });
  if (!user) {
    return res.json({ code: 401, msg: '你尚未注册 WJU 游戏账号，请先前往网站使用摸鱼派登录账号！' });
  }
  req.user = user;
  next();
});

router.get('/fishpi/checkUser', async (req, res) => {
  json(res, null);
});

router.post('/fishpi/updateInventory', async (req, res) => {
  try {
    const bag = new BagCore(req.user!.id);
    const { productKey, count, memo } = req.body;
    const items = toFishpiData(await bag.addItem(productKey, count, memo));
    json(res, items);
  } catch (error) {
    res.json({ code: 500, msg: (error as Error).message });
  }
});

router.get('/fishpi/inventory', async (req, res) => {
  try {
    const bag = new BagCore(req.user!.id);
    const bagData = await bag.getBag();
    const productKey = req.query.productKey as string | undefined;
    if (productKey) {
      return json(res, [{
        itemKey: productKey,
        itemName: Item.getName(productKey as BagItemType),
        count: bagData[`${productKey}Count` as keyof Bag] || 0,
      }]);
    }
    json(res, toFishpiData(bagData));
  } catch (error) {
    res.json({ code: 500, msg: (error as Error).message });
  }
});

export default router;