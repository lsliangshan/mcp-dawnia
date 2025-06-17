import { FastMCP } from "fastmcp";
import { z } from "zod";
import { servers } from "../config/index.js";
import { getVideo } from "../services/puppeteer.js";
import express from "express";
import axios from "axios";

const queues = new Map<string, Array<(msg: unknown) => void>>();

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
  }),
  execute: async (args: any) => {
    const id = args.id;

    const listeners: Array<(d: unknown) => void> = [];
    queues.set(id, listeners);

    try {
      const result: any = await getVideo({
        url: args.url,
        onProgress: (percent) => {
          console.log(`[3333progress]: ${percent}`);
          queues
            .get(id)
            ?.forEach((fn) => fn({ progress: Math.min(100, percent) }));
        },
        onEnd: (info) => {
          queues.delete(id);
          queues.get(id)?.forEach((fn) => fn({ progress: 100 }));

          axios.post(
            "https://wf.qyflows.com/webhook-test/omniplay/video-download",
            {
              code: 200,
              id,
              progress: 100,
              data: {
                ...info,
              },
            }
          );
        },
        onError: (error, info) => {
          queues.delete(id);
          console.log(`[3333error]: ${error}`);
          axios.post(
            "https://wf.qyflows.com/webhook-test/omniplay/video-download",
            {
              code: 1001,
              id,
              message: error.message,
              data: {
                ...info,
              },
            }
          );
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
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `${JSON.stringify({ error: e })}`,
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
  }),
  execute: async (args: any) => {
    return {
      content: [
        {
          type: "text",
          text: `${JSON.stringify({
            action: args.action,
            lm: args.lm || "none",
            date: args.date,
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

  const push = (data: unknown) => res.write(`data:${JSON.stringify(data)}\n\n`);
  queues.get(id)?.push(push); // 注册监听
  push({ connected: true });

  const ping = setInterval(() => res.write(":ping\n\n"), 15000);
  req.on("close", () => {
    clearInterval(ping);
    const arr = queues.get(id) ?? [];
    queues.set(
      id,
      arr.filter((fn) => fn !== push)
    );
  });
});

app.listen(29060, () => console.log("SSE 监听 http://localhost:29060"));
