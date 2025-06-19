import { spawn } from "node:child_process";
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { upload } from "./qiniu.js";
var ProgressTitle;
(function (ProgressTitle) {
    ProgressTitle["Analyzing"] = "\u89C6\u9891\u89E3\u6790\u4E2D";
    ProgressTitle["Uploading"] = "\u89C6\u9891\u4E0A\u4F20\u4E2D";
    ProgressTitle["Completed"] = "\u89C6\u9891\u4E0B\u8F7D\u5B8C\u6210";
    ProgressTitle["Failed"] = "\u89C6\u9891\u4E0B\u8F7D\u5931\u8D25";
})(ProgressTitle || (ProgressTitle = {}));
export function getVideo(params) {
    const { url, onProgress, onEnd, onStart, onError } = params;
    const basePath = "/Users/liangshan/Downloads";
    let videoInfo = {
        // 视频标题
        name: "",
        // 视频封面
        poster: "",
        // 视频url
        url: "",
    };
    let videoJsonFile = "";
    /**
     * 根据官方默认格式提取百分比/速度/ETA
     * 示例行："[download]  42.5% of 4.96MiB at  3.10MiB/s ETA 00:01"
     */
    function handleLine(line) {
        if (line.includes("Writing video metadata as JSON to: ")) {
            videoJsonFile = line
                .split("Writing video metadata as JSON to: ")[1]
                .trim();
        }
        // process.stdout.write(line); // 直接回显到控制台（可删）
        const m = line.match(/\[download]\s+([\d.]+)%.*?at\s+([\d.]+\w+\/s)\s+ETA\s+([\d:]+)/);
        if (m) {
            if (!videoInfo.name && existsSync(videoJsonFile)) {
                // 视频元数据json
                const info = JSON.parse(readFileSync(videoJsonFile, "utf-8"));
                videoInfo.name = info.title;
                videoInfo.poster = info.thumbnail;
                videoInfo.url = `${basePath}/${info.title}.mp4`;
                unlinkSync(videoJsonFile);
            }
            // percent: 进度百分比，如 42.5，不包括%
            // speed: 速度，如 3.10MiB/s
            // eta: 剩余时间，如 00:01
            const [, percent, speed, eta] = m;
            // console.log(`当前进度：${percent}%  速度：${speed}  剩余：${eta}`);
            onProgress?.({
                status: "analyzing",
                statusText: ProgressTitle.Analyzing,
                percent: isNaN(Number(percent)) ? 0 : Number(percent),
                speed,
                eta,
                info: { ...videoInfo },
            });
        }
    }
    // 构造参数数组而不是整串命令，避免 Windows / Linux 转义差异
    const args = [
        "-f",
        "bv*[ext=mp4][vcodec~='avc']+ba[acodec~='mp4a']/best[ext=mp4]", // 选择最佳画质流
        "--merge-output-format",
        "mp4",
        "--newline", // 让进度条改成“逐行”输出，便于解析
        // "https://www.youtube.com/watch?v=6dhOUJ_vnIY",
        // "https://www.bilibili.com/video/BV1ckMBzmEpv/?spm_id_from=333.1007.tianma.1-1-1.click",
        url,
        "--write-info-json",
        "-o",
        `${basePath}/%(title)s.mp4`, // 输出文件名
    ];
    return new Promise((resolve, reject) => {
        const proc = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
        onStart?.();
        proc.stdout.setEncoding("utf8"); // 以字符串接收
        proc.stdout.on("data", handleLine); // 监听一行行输出
        proc.stderr.setEncoding("utf8");
        proc.stderr.on("data", (d) => console.error("[yt-dlp]", d.trim()));
        proc.on("close", async (code) => {
            // console.log(`yt-dlp 退出，退出码 ${code}`);
            if (code === 0) {
                // 上传到qiniu，并更新 url
                const res = await upload({
                    url: videoInfo.url,
                    deleteAfterDays: 30,
                    deleteSource: true,
                    onProgress: (info) => {
                        onProgress?.({
                            status: "uploading",
                            statusText: ProgressTitle.Uploading,
                            percent: info.percent,
                            speed: "",
                            eta: "",
                            info: { ...videoInfo },
                        });
                    },
                });
                if (res.code === 200) {
                    // 上传成功
                    onEnd?.({
                        status: "completed",
                        statusText: ProgressTitle.Completed,
                        percent: 100,
                        speed: "",
                        eta: "",
                        info: {
                            name: videoInfo.name,
                            poster: videoInfo.poster,
                            url: res.data?.url,
                        },
                    });
                    resolve({
                        status: "completed",
                        statusText: ProgressTitle.Completed,
                        percent: 100,
                        speed: "",
                        eta: "",
                        info: {
                            name: videoInfo.name,
                            poster: videoInfo.poster,
                            url: res.data?.url,
                        },
                    });
                }
                else {
                    onError?.({
                        status: "failed",
                        statusText: ProgressTitle.Failed,
                        percent: 0,
                        speed: "",
                        eta: "",
                        info: {
                            name: videoInfo.name,
                            poster: videoInfo.poster,
                            url: videoInfo.url,
                        },
                    });
                    reject(new Error(res.message));
                }
            }
            else {
                onError?.({
                    status: "failed",
                    statusText: ProgressTitle.Failed,
                    percent: 0,
                    speed: "",
                    eta: "",
                    info: {
                        name: videoInfo.name,
                        poster: videoInfo.poster,
                        url: videoInfo.url,
                    },
                });
            }
        });
    });
}
