import express from "express";
import http from "http";

const queues = new Map<string, ((data: unknown) => void)[]>();

const app = express();

app.get("/progress/:id", (req: any, res: any) => {
  const { id } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 向当前连接推送数据的 helper
  const push = (data: unknown) =>
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  // 把 push 句柄加入队列
  if (!queues.has(id)) queues.set(id, []);
  queues.get(id)!.push(push);

  // 发送握手
  push({ connected: true });

  // 心跳，避免代理超时
  const ping = setInterval(() => res.write(": ping\n\n"), 15000);

  req.on("close", () => {
    clearInterval(ping);
    // 把当前 push 句柄从队列移除
    const arr = queues.get(id);
    if (arr)
      queues.set(
        id,
        arr.filter((fn) => fn !== push)
      );
  });
});

// ⑤ 把 Express 和 MCP 服务跑在同一端口
export const httpServer = http.createServer(app);
