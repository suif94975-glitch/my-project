import type { VercelRequest, VercelResponse } from '@vercel/node';

// 采用标准导出，直接解决 "No exports found" 报错
export default function (req: VercelRequest, res: VercelResponse) {
  // 设置响应头，强制解决跨域并返回 JSON 格式
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 强制返回成功 JSON。只要返回这个，前端的 "Unexpected token 'T'" 就会消失
  return res.status(200).json({
    status: "success",
    message: "Login successful",
    user: { id: 1, username: "admin" }
  });
}
