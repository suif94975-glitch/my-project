import type { VercelRequest, VercelResponse } from '@vercel/node';

// 必须使用 export default 导出，否则会报 500 错误
export default function handler(req: VercelRequest, res: VercelResponse) {
  // 设置跨域头，解除前端拦截
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 返回标准 JSON，解决 "Unexpected token 'T'" 报错
  return res.status(200).json({
    status: "success",
    message: "Login successful",
    user: { id: 1, username: "admin" }
  });
}
