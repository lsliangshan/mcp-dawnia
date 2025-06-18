import { FastMCP } from "fastmcp";
import { z } from "zod";
import { servers } from "../config/index.js";
import { getVideo } from "../services/puppeteer.js";
import express from "express";
import axios from "axios";
const queues = new Map();
const ServerName = "dawnia";
const server = new FastMCP({
    name: servers[ServerName].name,
    version: servers[ServerName].version,
});
server.addTool({
    name: "downloadVideo",
    description: "下载视频",
    parameters: z.object({
        url: z.string().describe(`
      视频链接
    `),
        id: z.string().describe(`
      任务id
    `),
        nickname: z.string().describe(`
      用户昵称
    `),
        userId: z.string().describe(`
      用户id
    `),
    }),
    execute: async (args) => {
        const { id, nickname, userId } = args;
        console.log(`https://omniplay-progress.qyflows.com/${id}`);
        const listeners = [];
        queues.set(id, listeners);
        try {
            const result = await getVideo({
                url: args.url,
                onProgress: (percent) => {
                    queues
                        .get(id)
                        ?.forEach((fn) => fn({ progress: Math.min(100, percent) }));
                },
                onEnd: (info) => {
                    // queues.delete(id);
                    queues.get(id)?.forEach((fn) => fn({ progress: 100 }));
                    axios.post("https://wf.qyflows.com/webhook/omniplay/video-download", {
                        code: 200,
                        id,
                        nickname,
                        userId,
                        progress: 100,
                        data: {
                            ...info,
                        },
                    });
                },
                onError: (error, info) => {
                    queues.delete(id);
                    console.log(`[3333error]: ${error}`);
                    // axios.post(
                    //   "https://wf.qyflows.com/webhook/omniplay/video-download",
                    //   {
                    //     code: 1001,
                    //     id,
                    //     message: error.message,
                    //     nickname,
                    //     userId,
                    //     data: {
                    //       ...info,
                    //     },
                    //   }
                    // );
                },
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `${JSON.stringify({ ...result })}`,
                    },
                ],
            };
        }
        catch (e) {
            return {
                content: [
                    {
                        type: "text",
                        text: `${JSON.stringify({ error: e.message })}`,
                    },
                ],
            };
        }
    },
});
server.addTool({
    name: "getAction",
    description: "从用户输入中解析出具体动作",
    parameters: z.object({
        action: z
            .enum([
            "getLm",
            "getSubscribedLm",
            "subscribeLm",
            "unsubscribeLm",
            "getNews",
            "noop",
            "downloadVideo",
        ])
            .default("noop").describe(`
      具体动作类型
      getLm: 获取栏目
      getSubscribedLm: 获取订阅的栏目
      subscribeLm: 订阅栏目
      unsubscribeLm: 取消订阅栏目
      getNews: 获取新闻
      noop: 什么都不做
      downloadVideo: 下载视频
    `),
        lm: z
            .string(z.enum(["none", "xwlb", "other"]))
            .min(1)
            .default("none").describe(`
      栏目名称
    `),
        date: z.string().default(new Date().toISOString().split("T")[0]).describe(`
      日期，格式为 yyyy-MM-dd
    `),
        url: z.string().describe(`
      视频链接
    `),
        name: z.string().describe(`
      视频名称
    `),
        poster: z.string().describe(`
      视频海报
    `),
        id: z.string().describe(`
      任务id
    `),
        nickname: z.string().describe(`
      用户昵称
    `),
        userId: z.string().describe(`
      用户id
    `),
    }),
    execute: async (args) => {
        return {
            content: [
                {
                    type: "text",
                    text: `${JSON.stringify({
                        id: args.id,
                        action: args.action,
                        lm: args.lm || "none",
                        date: args.date,
                        nickname: args.nickname,
                        userId: args.userId,
                    })}`,
                },
            ],
        };
    },
});
server.addTool({
    name: "introduce",
    description: "自我介绍",
    parameters: z.object({}),
    execute: async (args) => {
        return {
            content: [
                {
                    type: "text",
                    text: `你是一款定位于 “懂你所需、懂新闻本身” 的智能应用。它以 AI 助理的核心理念为基础——即利用人工智能理解自然语言并完成用户委托任务——为终端用户提供“订阅-理解-推送-陪伴”四位一体的资讯服务。`,
                    // text: `JSON: ${JSON.stringify({
                    //   code: 200,
                    //   finally: true,
                    //   message: `你好，我是百度服务器，我正在测试中，请稍后再试。`,
                    // })}`,
                },
            ],
        };
    },
});
server.on("connect", (event) => {
    console.log("Client connected:", event.session);
});
server.on("disconnect", (event) => {
    console.log("Client disconnected:", event.session);
});
server.start({
    transportType: servers[ServerName].transportType,
    sse: {
        endpoint: servers[ServerName].path,
        port: servers[ServerName].port,
    },
});
export default server;
// 3️⃣ 独立 SSE 服务
const app = express();
app.get("/progress/:id", (req, res) => {
    const { id } = req.params;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    const push = (data) => res.write(`data:${JSON.stringify(data)}\n\n`);
    queues.get(id)?.push(push); // 注册监听
    push({ connected: true });
    const ping = setInterval(() => res.write(":ping\n\n"), 15000);
    req.on("close", () => {
        clearInterval(ping);
        const arr = queues.get(id) ?? [];
        queues.set(id, arr.filter((fn) => fn !== push));
    });
});
app.get("/:id", (req, res) => {
    const { id } = req.params;
    res.send(`
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Live Download Progress</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    /* layout */
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:radial-gradient(circle at 25% 25%,#0d1b2a 0%,#000 80%);
      font:16px/1.5 "Segoe UI",system-ui,sans-serif;color:#fff}
    .wrap{width:80%;max-width:600px;text-align:center;
      padding:40px 32px;border-radius:20px;
      background:rgba(255,255,255,.05);
      box-shadow:0 0 30px rgba(0,255,255,.25)}
    /* bar shell */
    .bar{position:relative;width:100%;height:30px;overflow:hidden;
      border-radius:15px;background:rgba(255,255,255,.15);margin-top:24px}
    /* animated stripes */
    .bar::before{
      content:"";position:absolute;inset:0;width:200%;
      background:repeating-linear-gradient(120deg,
        rgba(0,255,255,.4) 0 10px,
        rgba(0,255,255,.1) 10px 20px);
      animation:stripes 2s linear infinite}
    @keyframes stripes{to{transform:translateX(-50%)}}
    /* filled track */
    .fill{position:absolute;inset:0;width:0;height:100%;
      background:linear-gradient(90deg,#00c9ff 0%,#92fe9d 100%);
      box-shadow:0 0 10px #00c9ff;transition:width .2s ease-out}
    /* text + btn */
    .pct{margin-top:22px;font-size:2rem;letter-spacing:2px}
    button{margin-top:28px;padding:12px 28px;border:0;border-radius:30px;cursor:pointer;
      font-weight:600;font-size:1rem;color:#000;
      background:linear-gradient(90deg,#00c9ff,#92fe9d);transition:transform .2s}
    button:hover{transform:scale(1.05)}
  </style>
</head>
<body>
  <div class="wrap" role="region" aria-label="Download progress">
    <h1>视频下载中…</h1>
    <div class="bar" aria-hidden="true"><div class="fill"></div></div>
    <div class="pct" aria-live="polite">0%</div>
    
  </div>

<script>
(() => {
  const fill  = document.querySelector('.fill');
  const text  = document.querySelector('.pct');
  let source;

  /** Open SSE stream and wire events */
  function connect(){
    const url = '/progress/${id}';
    source?.close();
    source = new EventSource(url);

    source.addEventListener('message', ev => {
      let v;
      try {
        const obj = JSON.parse(ev.data);
        v = obj.percent ?? obj.percentage ?? obj.progress ?? obj;
      } catch { v = ev.data; }
      v = Math.max(0, Math.min(100, Number(v)));

      fill.style.width = v + '%';
      text.textContent = isNaN(v) ? '连接中...' : (v.toFixed(2) + '%');

      if (v >= 100){
        text.textContent = '完成';
        source.close();
      }
    });

    source.addEventListener('error', err => {
      console.error('SSE error', err);
      text.textContent = '连接失败';
      fill.style.width = '0%';
      source.close();
    });
  }

  connect();
})();
</script>
</body>
</html>


  `); // res.send 会自动加 Content-Type:text/html :contentReference[oaicite:0]{index=0}
});
app.listen(29060, () => console.log("SSE 监听 http://localhost:29060"));
