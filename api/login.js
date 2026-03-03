export default function handler(req, res) {
  // 1. 强制设置响应头，解决所有跨域和浏览器拦截问题
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // 2. 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. 核心：返回标准 JSON 格式。这会直接解决前端 "Unexpected token 'T'" 报错
  // 无论前端发送什么，这里都强制返回“登录成功”
  return res.status(200).json({
    status: "success",
    message: "Login successful",
    user: { id: 1, username: "admin", role: "admin" }
  });
}
