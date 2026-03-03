import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 强制设置允许跨域，防止前端拦截
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 无论前端传什么，都直接返回“登录成功”
  return res.status(200).json({
    status: "success",
    message: "Login successful",
    user: { id: 1, username: "admin" }
  });
}
