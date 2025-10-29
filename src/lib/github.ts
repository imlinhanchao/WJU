import { Request, Response } from "express";
import utils from '../utils';
import { saveUser } from './login';
const clientId = utils.config?.login.githubClientId || '';

export async function login(req: Request, res: Response) {
  const domain = req.host;
  if (!clientId) return res.end('GitHub OAuth 未配置，请联系管理员');
  if (req.query['code']) {
    const accessToken = await verify(req);
    if (accessToken) {
      const userInfo = await getUserInfo(accessToken);
      req.session.user = {
        username: userInfo.login,
        nickname: userInfo.name || userInfo.login,
        id: userInfo.id,
        lastLogin: Date.now(),
        from: 'github',
        point: 500,
      };
      await saveUser(req.session.user);
      return res.redirect("/");
    } else {
      req.session.error = "登录验证失败，请重试";
      return res.redirect("/login");
    }
  }
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=https%3A%2F%2F${domain}%2Flogin%2Fgithub&scope=user:email`);
}

function verify(req: Request) {
  const verifyReq = {
    client_id: utils.config?.login.githubClientId,
    client_secret: utils.config?.login.githubClientSecret,
    code: req.query['code'],
    redirect_uri: `https://${req.host}/login/github`,
  }
  return fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(verifyReq)
  }).then(res => res.json()).then(data => {
    return data.access_token;
  })
}

function getUserInfo(access_token: string) {
  return fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Accept': 'application/vnd.github+json',
    }
  }).then(res => res.json()).then(data => {
    return data;
  });;
}