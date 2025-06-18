// import ffmpegPath from "@ffmpeg-installer/ffmpeg";
// import ffprobePath from "@ffprobe-installer/ffprobe";
// import ffmpeg from "fluent-ffmpeg";
import axios from "axios";
import { createWriteStream } from "fs";
import { finished } from "stream/promises";
import https from "node:https";
import puppeteer, { Page } from "puppeteer";

// ffmpeg.setFfmpegPath(ffmpegPath.path);
// ffmpeg.setFfprobePath(ffprobePath.path);

// ffmpeg()
//   .addInput(
//     "https://rr4---sn-uxax4vopj5qx-cxgz.googlevideo.com/videoplayback?expire=1750163061&ei=FQpRaL41uoay9A-AwbXAAQ&ip=176.6.140.46&id=o-ANhH7KgD_yw8AnuHdG725IQOYLJS8GiOnFngTTjLE5ih&itag=299&aitags=133%2C134%2C135%2C136%2C160%2C242%2C243%2C244%2C247%2C278%2C298%2C299%2C302%2C303%2C597%2C598&source=youtube&requiressl=yes&xpc=EgVo2aDSNQ%3D%3D&met=1750141461%2C&mh=SO&mm=31%2C29&mn=sn-uxax4vopj5qx-cxgz%2Csn-4g5ednsr&ms=au%2Crdu&mv=m&mvi=4&pl=17&rms=au%2Cau&initcwndbps=1066250&bui=AY1jyLOWnUHQp6I5u9Kq1AGoMGvK9cG8hr0SvWLsQPgsitp8EHYfxz36-r0WViSnoPizGgX4X5PgPAQo&spc=l3OVKeJQlpIliEiT8d0P1h9mynIbIr5MXhYswoZZlVN7Lz_V26ge&vprv=1&svpuc=1&mime=video%2Fmp4&ns=8jayOpq5h4um9xREF_sEndkQ&rqh=1&gir=yes&clen=438381571&dur=672.266&lmt=1749151546511331&mt=1750140326&fvip=5&keepalive=yes&fexp=51331020%2C51466698&c=MWEB&sefc=1&txp=5535534&n=UNuijtmH6BwQ6g&sparams=expire%2Cei%2Cip%2Cid%2Caitags%2Csource%2Crequiressl%2Cxpc%2Cbui%2Cspc%2Cvprv%2Csvpuc%2Cmime%2Cns%2Crqh%2Cgir%2Cclen%2Cdur%2Clmt&sig=AJfQdSswRgIhANdghdEXzi-am3iv9gzxuhKyv2fvmD8yOOMduERlUmXoAiEAkCg1fenPx_z2SPMkU-8fxGMn8nJlwGftNzZnZu1Ghy8%3D&lsparams=met%2Cmh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Crms%2Cinitcwndbps&lsig=APaTxxMwRQIhANOwsvCsbHRPq1hyu11twA-v7m1Reljuaay8D89c87lCAiBQ4ngB8cROKmovk4pv-BR2Rt1Yj-BfcfeTkbOGV2xOrw%3D%3D&pot=MnR1xP3MDYUMTHX4tPP6kyfleVN4h0oS8isiHodb2GNH3nm1myP0jxLXI4CcSNZW9zNoIX4X46ip0LlxN0PTDCFGKekcOVKtzfUKcJkH2n38Cy8LCQWfhNpcX11pQ5KZcuPfeHQeRR7_UyaaWWqX3ZEl80tNIw=="
//   )
//   .addInput(
//     "https://rr1---sn-i3belnll.googlevideo.com/videoplayback?expire=1750163061&ei=FQpRaL41uoay9A-AwbXAAQ&ip=176.6.140.46&id=o-ANhH7KgD_yw8AnuHdG725IQOYLJS8GiOnFngTTjLE5ih&itag=140&source=youtube&requiressl=yes&xpc=EgVo2aDSNQ%3D%3D&bui=AY1jyLOWnUHQp6I5u9Kq1AGoMGvK9cG8hr0SvWLsQPgsitp8EHYfxz36-r0WViSnoPizGgX4X5PgPAQo&spc=l3OVKeJQlpIliEiT8d0P1h9mynIbIr5MXhYswoZZlVN7Lz_V26ge&vprv=1&svpuc=1&mime=audio%2Fmp4&ns=8jayOpq5h4um9xREF_sEndkQ&rqh=1&gir=yes&clen=10882930&dur=672.403&lmt=1749132591517091&keepalive=yes&fexp=24350590,24350737,24350827,24350961,24351173,24351316,24351318,24351495,24351528,24351759,24351907,24352022,24352102,24352188,24352220,24352236,51331020,51466698&c=MWEB&sefc=1&txp=5532534&n=UNuijtmH6BwQ6g&sparams=expire%2Cei%2Cip%2Cid%2Citag%2Csource%2Crequiressl%2Cxpc%2Cbui%2Cspc%2Cvprv%2Csvpuc%2Cmime%2Cns%2Crqh%2Cgir%2Cclen%2Cdur%2Clmt&sig=AJfQdSswRgIhAIH0R9pzixvGeMz4571HTAfsOTLba_cvY3Pj8Sah76UTAiEA4QgMk7NbGnNw-UCgtgnShUXCVZgQYup_oKkUlCPD50Q%3D&pot=MnR1xP3MDYUMTHX4tPP6kyfleVN4h0oS8isiHodb2GNH3nm1myP0jxLXI4CcSNZW9zNoIX4X46ip0LlxN0PTDCFGKekcOVKtzfUKcJkH2n38Cy8LCQWfhNpcX11pQ5KZcuPfeHQeRR7_UyaaWWqX3ZEl80tNIw==&rm=sn-uxax4vopj5qx-cxgz7z,sn-4g5ede76&rrc=79,104&req_id=af526f9eed4fa3ee&rms=rdu,au&redirect_counter=2&cms_redirect=yes&cmsv=e&ipbypass=yes&met=1750141469,&mh=SO&mip=206.237.119.215&mm=29&mn=sn-i3belnll&ms=rdu&mt=1750141038&mv=m&mvi=1&pl=24&lsparams=ipbypass,met,mh,mip,mm,mn,ms,mv,mvi,pl,rms&lsig=APaTxxMwRQIhANu_PlXY8gkTniHkI19TV4_nSfXY5GP0K8aux3LIc675AiAAhr27mQqLEHmKp2ww3TeaD0BCHonMGTbQO5ZzBz6OjA%3D%3D"
//   )
//   .outputOptions([
//     "-map 0:v:0", // 只取第 0 路视频
//     "-map 1:a:0", // 只取第 1 路音频
//     // '-c:v copy',                     // 视频无损复制
//     // '-c:a aac',                      // MP4 容器常用 AAC
//     // '-shortest'                      // 谁短取谁，避免黑屏或静音尾巴
//   ])
//   .audioCodec("aac")
//   .videoCodec("copy")
//   .on("end", (err, stdout, stderr) => {
//     console.log("[end]: " + stdout);
//   })
//   .on("start", (err, stdout, stderr) => {
//     console.log("[start]: " + stdout);
//   })
//   .on("error", (err, stdout, stderr) => {
//     console.log("[error]: " + err.message);
//   })
//   .on("progress", ({ percent }) => {
//     console.log("[progress]: " + percent);
//   })
//   .save("/Users/liangshan/Downloads/out.mp4");

export async function downloadFile(fileUrl, outputPath) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    // Launch the browser and open a new blank page

    const page = await browser.newPage();

    // await page.setUserAgent(randomUA);
    await page.setExtraHTTPHeaders({ "Accept-Language": "zh" });
    await page.setExtraHTTPHeaders({ "cache-control": "no-cache" });
    await page.setExtraHTTPHeaders({ pragma: "no-cache" });
    await page.setExtraHTTPHeaders({
      "sec-ch-ua":
        '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
    });

    // Navigate the page to a URL.
    await page.goto(fileUrl);

    // Set screen size.
    await page.setViewport({
      width: 1080 + Math.floor(Math.random() * 100),
      height: 1024 + Math.floor(Math.random() * 100),
    });

    // await browser.close();
  } catch (error) {
    // await browser.close();
    console.log(error);
  }
  console.log("✅ 下载完成");
}

downloadFile(
  "https://rr1---sn-uxax4vopj5qx-q0n6.googlevideo.com/videoplayback?expire=1750232092&ei=vBdSaNnxI8fmxN8P2bTI8Q8&ip=176.1.133.35&id=o-AJEdBbARdfyEm_PaleyZKSxg4NqeaLJNxDwPKdZQmZjH&itag=135&aitags=133%2C134%2C135%2C136%2C160%2C242%2C243%2C244%2C247%2C278%2C298%2C299%2C302%2C303%2C598&source=youtube&requiressl=yes&xpc=EgVo2aDSNQ%3D%3D&met=1750210492%2C&mh=SO&mm=31%2C29&mn=sn-uxax4vopj5qx-q0n6%2Csn-4g5e6nzs&ms=au%2Crdu&mv=m&mvi=1&pl=17&rms=au%2Cau&initcwndbps=1942500&bui=AY1jyLOfQQCBNHQBXgfEDVdPHSPMNfLPmoePmrruzBAwfvonj9kLcz7Y0rlBvkzC8385g6IdMH8s9YrO&spc=l3OVKclZbB3KFeoU6jMGRBDVFLsKS_pcaJTD8GF0NQWG_PodHb03&vprv=1&svpuc=1&mime=video%2Fmp4&ns=5JoslXhWko8MaDt3P1GTNcIQ&rqh=1&gir=yes&clen=50861918&dur=672.266&lmt=1749146793910553&mt=1750210153&fvip=5&keepalive=yes&fexp=51331020%2C51466697&c=MWEB&sefc=1&txp=5535534&n=d8w8UFLfWiC3tg&sparams=expire%2Cei%2Cip%2Cid%2Caitags%2Csource%2Crequiressl%2Cxpc%2Cbui%2Cspc%2Cvprv%2Csvpuc%2Cmime%2Cns%2Crqh%2Cgir%2Cclen%2Cdur%2Clmt&sig=AJfQdSswRQIgHfQuE55NxedFivj8zLR2SkK7_dUd3xUU6JlHgonHzF8CIQCJq2piCmIwJEXTp5s15Gn1FfnCef-8rNhDNpvNXbSktA%3D%3D&lsparams=met%2Cmh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Crms%2Cinitcwndbps&lsig=APaTxxMwRQIgJu-_tAvcu5OgdzWFfQKe1i6jWvk_GwkhICioDbT8vrcCIQCKbnNZpcVj8pRwIF_TsYEdkDxmDD1dtcxBEhuahYxJhw%3D%3D&pot=MnQCzegRRSe8IwLxGI55pgjVORevgyo62vH2KPmPvzyUrjTaPk53Xp4V8KQ5HDKsr9L6gJ1SFEhIuwdj8STYA_a1U-6w6302gLLOW4l-xRr0vrApcKTkX4MODPtgziDQr6nCfNq1pcjQ-ixJtBybqvOsA2oVXg==",
  "/Users/liangshan/Downloads/test.mp4"
);
