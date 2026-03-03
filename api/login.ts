import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 这一段是发给前端看的，只要它收到这个，登录框就不会报错
  return res.status(200).json({
    status: "success",
    message: "Login successful",
    user: { id: 1, username: "admin" }
  });
}
