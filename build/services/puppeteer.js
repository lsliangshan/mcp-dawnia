import puppeteer from "puppeteer";
import { mergeVideo } from "./ffmpeg.js";
import os from "os";
import path from "path";
import { createCursor } from "ghost-cursor";
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
async function getYoutubeMediaInfo(params) {
    return new Promise(async (resolve, reject) => {
        try {
            const { page, onProgress, onEnd, onError } = params;
            const name = await page.$eval("[data-testid='flowbite-card'] div.font-medium", (el) => el.textContent);
            const poster = await page.$$eval("[data-testid='flowbite-card'] a", (elements) => (elements.find((el) => el.textContent?.trim() === "下载封面") || {})
                .href);
            const audio = await page.$$eval("[data-testid='flowbite-card'] a", (elements) => (elements.find((el) => el.textContent?.trim() === "下载音频") || {})
                .href);
            const video = await page.$$eval("[data-testid='flowbite-card'] a", (elements) => (elements.find((el) => el.textContent?.trim().match(/\d{3,}P（mp4）/i)) || {}).href);
            if (video && audio) {
                try {
                    await mergeVideo({
                        videoUrl: video ?? "",
                        audioUrl: audio ?? "",
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
                        onEnd: (outputPath) => {
                            onEnd?.({
                                name,
                                poster,
                                url: outputPath,
                            });
                            resolve({
                                name,
                                poster,
                                url: outputPath,
                            });
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
            const { url, onProgress, onEnd, onError } = params;
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
            await page.goto("https://snapany.com/zh");
            // Set screen size.
            await page.setViewport({
                width: 1080 + Math.floor(Math.random() * 100),
                height: 1024 + Math.floor(Math.random() * 100),
            });
            // Type into search box using accessible input name.
            // await page.locator("input").focus();
            await cursor.move("input");
            await cursor.click();
            await page.keyboard.type(url);
            // Wait and click on first result.
            await page.locator("button.group.bg-blue-700").click();
            await page.waitForSelector("[data-testid='flowbite-card']");
            const pageUrl = await page.url();
            let mediaInfo = {};
            if (pageUrl.includes("/youtube")) {
                mediaInfo = await getYoutubeMediaInfo({
                    page,
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
            console.log(pageUrl);
            await browser.close();
            resolve({
                ...mediaInfo,
            });
        }
        catch (error) {
            await browser.close();
            reject(error);
        }
    });
}
// getBilibiliVideo(
//   "https://www.bilibili.com/video/BV1aCe5ezEBh?buvid=15414f465971d5c3d5786c6e537881cd&from_spmid=search.search-result.0.0&is_story_h5=false&mid=pBCeoodosRh%2BIuykjnh5zQ%3D%3D&plat_id=116&share_from=ugc&share_medium=iphone&share_plat=ios&share_session_id=B0E5E1BB-799E-4D7A-900C-2F34B4D437E5&share_source=WEIXIN&share_tag=s_i&spmid=united.player-video-detail.0.0&timestamp=1750050141&unique_k=lMBr8as&up_id=3546740514884470&vd_source=51a9338cc5ad228e71316cbea9206188"
// );
// getBilibiliVideo("https://www.youtube.com/watch?v=vvqhzbp4J5A");
