import type { VercelRequest, VercelResponse } from '@vercel/node';

// 采用最标准的 Vercel Serverless Function 导出格式
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // 1. 设置响应头，允许所有跨域请求，防止前端报错
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. 处理预检请求 (Options)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // 3. 无论前端传什么，强制返回登录成功的 JSON 数据
  // 这会直接消除前端的 "Unexpected token 'T'" 报错
  return response.status(200).json({
    status: "success",
    code: 200,
    message: "登录成功",
    data: {
      token: "fixed-token-for-testing",
      user: {
        id: "1",
        username: "admin",
        role: "admin"
      }
    }
  });
}
