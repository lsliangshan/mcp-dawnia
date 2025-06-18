import puppeteer from "puppeteer";
import { mergeVideo } from "./ffmpeg.js";
import os from "os";
import path from "path";
import { createCursor } from "ghost-cursor";
import { upload } from "./qiniu.js";
import { getRandomId } from "../utils/random.js";
import fs from "fs";
async function getBilibiliMediaInfo(page) {
    const name = await page.$eval("[data-testid='flowbite-card'] .font-medium", (el) => el.textContent);
    const poster = await page.$$eval("[data-testid='flowbite-card'] a", (elements) => (elements.find((el) => el.textContent?.trim() === "下载封面") || {}).href);
    const url = await page.$$eval("[data-testid='flowbite-card'] a", (elements) => (elements.find((el) => el.textContent?.trim() === "下载视频") || {}).href);
    return {
        name,
        poster,
        url: url,
    };
}
function downloadVideo(browser, url, fileName) {
    return new Promise(async (resolve, reject) => {
        const page = await browser.newPage();
        await page.goto(url);
        try {
            await page.setRequestInterception(true);
            page.on("response", async (res) => {
                const ct = res.headers()["content-type"] || "";
                if (ct.startsWith("video/") || res.url().endsWith(".mp4")) {
                    const buf = await res.buffer(); // Puppeteer >= 18
                    const file = path.join(os.tmpdir(), fileName);
                    fs.writeFileSync(file, buf);
                    console.log("保存成功 →", file);
                }
            });
            resolve(true);
        }
        catch (error) {
            reject(error);
        }
        finally {
            page.off("response");
            await page.close();
        }
    });
}
async function getYoutubeMediaInfo(params) {
    return new Promise(async (resolve, reject) => {
        try {
            const { page, browser, onProgress, onEnd, onError, onStart } = params;
            const name = await page.$eval("[data-testid='flowbite-card'] div.font-medium", (el) => el.textContent);
            const poster = await page.$$eval("[data-testid='flowbite-card'] a", (elements) => (elements.find((el) => el.textContent?.trim() === "下载封面") || {})
                .href);
            const audio = await page.$$eval("[data-testid='flowbite-card'] a", (elements) => (elements.find((el) => el.textContent?.trim() === "下载音频") || {})
                .href);
            const video = await page.$$eval("[data-testid='flowbite-card'] a", (elements) => (elements.find((el) => el.textContent?.trim().match(/\d{3,}P（mp4）/i)) || {}).href);
            onStart?.();
            if (video && audio) {
                await page.goto(video);
                // 下载音频、视频
                // 服务器端 ffmpeg直接处理音频、视频地址，报错 403
                // 所以需要先下载音频、视频，再进行合并
                // 下载音频、视频
                const tmpAudioFileName = `audio_${getRandomId()}.mp4`;
                const tmpVideoFileName = `video_${getRandomId()}.mp4`;
                const audioPath = path.resolve(os.tmpdir(), tmpAudioFileName);
                const videoPath = path.resolve(os.tmpdir(), tmpVideoFileName);
                console.log("音频地址:", audioPath);
                console.log("视频地址:", videoPath);
                await downloadVideo(browser, video, tmpVideoFileName);
                // await page.evaluate(
                //   async ({ u, tmpVideoFileName }) => {
                //     console.log("@@@@@@下载视频:", u);
                //     const a = document.createElement("a");
                //     a.style.cssText =
                //       "position: absolute; top: 0; left: 0; width: 100px; height: 100px; background-color: red;";
                //     a.href = u;
                //     a.download = "";
                //     a.innerText = "下载视频";
                //     document.body.append(a);
                //     a.click();
                //     // a.remove();
                //   },
                //   { u: video, tmpVideoFileName }
                // );
                // await Promise.all([
                //   page.evaluate(
                //     async ({ u, tmpAudioFileName }) => {
                //       console.log("下载音频:", u);
                //       const resp = await fetch(u);
                //       const blob = await resp.blob();
                //       const a = document.createElement("a");
                //       a.href = URL.createObjectURL(blob);
                //       a.download = tmpAudioFileName;
                //       document.body.append(a);
                //       a.click();
                //       a.remove();
                //     },
                //     { u: audio, tmpAudioFileName }
                //   ),
                //   page.evaluate(
                //     async ({ u, tmpVideoFileName }) => {
                //       const resp = await fetch(u);
                //       const blob = await resp.blob();
                //       const a = document.createElement("a");
                //       a.href = URL.createObjectURL(blob);
                //       a.download = tmpVideoFileName;
                //       document.body.append(a);
                //       a.click();
                //       a.remove();
                //     },
                //     { u: video, tmpVideoFileName }
                //   ),
                // ]);
                // const waitAll = (expect: number) =>
                //   new Promise<void>((res) => {
                //     const done = new Set<string>();
                //     console.log("下载进度2222:", done);
                //     client.on("Browser.downloadProgress", (e) => {
                //       console.log("下载进度:", e);
                //       if (e.state === "completed") done.add(e.guid);
                //       if (done.size === expect) res();
                //     });
                //   });
                // await waitAll(2);
                try {
                    console.log("开始合并视频");
                    await mergeVideo({
                        videoUrl: path.resolve(os.tmpdir(), tmpVideoFileName),
                        audioUrl: path.resolve(os.tmpdir(), tmpAudioFileName),
                        outputPath: path.resolve(os.tmpdir(), `${name}.mp4`),
                        onProgress: (percent) => {
                            onProgress?.(percent);
                        },
                        onError: (err) => {
                            onError?.(err, {
                                name: name ?? "",
                                poster: poster ?? "",
                                url: video ?? "",
                                error: err,
                            });
                            reject(err);
                        },
                        onEnd: async (outputPath) => {
                            // 上传文件
                            const res = await upload({
                                url: outputPath,
                                deleteAfterDays: 30,
                                deleteSource: true,
                            });
                            if (res.code === 200) {
                                // 上传成功
                                onEnd?.({
                                    name,
                                    poster,
                                    url: res.data?.url,
                                });
                                resolve({
                                    name,
                                    poster,
                                    url: res.data?.url,
                                });
                            }
                            else {
                                reject(new Error(res.message));
                            }
                        },
                    });
                    // return {
                    //   name,
                    //   poster,
                    //   url: outputPath,
                    // };
                }
                catch (err) {
                    reject(err);
                    // return {
                    //   name,
                    //   poster,
                    //   url: video,
                    // };
                }
            }
            return {
                name,
                poster,
                audio,
                video,
            };
        }
        catch (error) {
            console.log("下载失败:", error);
            reject(error);
        }
    });
}
export async function getVideo(params) {
    return new Promise(async (resolve, reject) => {
        const browser = await puppeteer.launch({
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        try {
            const { url, onProgress, onEnd, onError, onStart } = params;
            // Launch the browser and open a new blank page
            const page = await browser.newPage();
            const cursor = createCursor(page);
            // await page.setUserAgent(randomUA);
            await page.setExtraHTTPHeaders({ "Accept-Language": "zh" });
            await page.setExtraHTTPHeaders({ "cache-control": "no-cache" });
            await page.setExtraHTTPHeaders({ pragma: "no-cache" });
            await page.setExtraHTTPHeaders({
                "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
            });
            // Navigate the page to a URL.
            await page.goto("http://snapany.com/zh");
            // Set screen size.
            await page.setViewport({
                width: 1080 + Math.floor(Math.random() * 100),
                height: 1024 + Math.floor(Math.random() * 100),
            });
            // Type into search box using accessible input name.
            // await page.locator("input").focus();
            await cursor.move("input");
            await cursor.click();
            await page.keyboard.type(url, { delay: 100 });
            // Wait and click on first result.
            await page.locator("button.group.bg-blue-700").click();
            await page.waitForSelector("[data-testid='flowbite-card']");
            const pageUrl = await page.url();
            let mediaInfo = {};
            if (pageUrl.includes("/youtube")) {
                mediaInfo = await getYoutubeMediaInfo({
                    page,
                    browser,
                    onStart: () => {
                        onStart?.();
                        resolve({
                            name: "",
                            poster: "",
                            url: "",
                        });
                    },
                    onProgress,
                    onEnd,
                    onError: (error, info) => {
                        onError?.(error, info);
                        reject(error);
                    },
                });
            }
            else {
                mediaInfo = await getBilibiliMediaInfo(page);
            }
            // await browser.close();
            resolve({
                ...mediaInfo,
            });
        }
        catch (error) {
            // await browser.close();
            reject(error);
        }
    });
}
// getBilibiliVideo(
//   "https://www.bilibili.com/video/BV1aCe5ezEBh?buvid=15414f465971d5c3d5786c6e537881cd&from_spmid=search.search-result.0.0&is_story_h5=false&mid=pBCeoodosRh%2BIuykjnh5zQ%3D%3D&plat_id=116&share_from=ugc&share_medium=iphone&share_plat=ios&share_session_id=B0E5E1BB-799E-4D7A-900C-2F34B4D437E5&share_source=WEIXIN&share_tag=s_i&spmid=united.player-video-detail.0.0&timestamp=1750050141&unique_k=lMBr8as&up_id=3546740514884470&vd_source=51a9338cc5ad228e71316cbea9206188"
// );
// getBilibiliVideo("https://www.youtube.com/watch?v=vvqhzbp4J5A");
