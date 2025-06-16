import { FastMCP } from "fastmcp";
import { z } from "zod";
import { servers } from "../config/index.js";
import { getBilibiliVideo } from "../services/puppeteer.js";
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
    }),
    execute: async (args) => {
        const videoResult = await getBilibiliVideo(args.url);
        return {
            content: [
                {
                    type: "text",
                    text: `${JSON.stringify({
                        ...videoResult,
                    })}`,
                },
            ],
        };
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
    }),
    execute: async (args) => {
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
