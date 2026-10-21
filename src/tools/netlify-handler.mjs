import { handleVercelRequest } from '../api/index.mjs';

// Netlify Functions 入口：复用 Vercel 的请求处理（请求体上限、安全响应头、错误兜底）。
export default (request) => handleVercelRequest(request);

export const config = { path: '/*' };
