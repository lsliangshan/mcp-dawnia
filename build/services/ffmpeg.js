import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);
export function mergeVideo(params) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .addInput(params.videoUrl)
            .addInput(params.audioUrl)
            .outputOptions([
            "-map 0:v:0", // 只取第 0 路视频
            "-map 1:a:0", // 只取第 1 路音频
            // '-c:v copy',                     // 视频无损复制
            // '-c:a aac',                      // MP4 容器常用 AAC
            // '-shortest'                      // 谁短取谁，避免黑屏或静音尾巴
        ])
            .audioCodec("aac")
            .videoCodec("copy")
            .on("end", (stdout) => {
            params.onEnd?.(params.outputPath);
            resolve(params.outputPath);
        })
            .on("start", (stdout) => {
            params.onStart?.(stdout);
        })
            .on("error", (err, stdout, stderr) => {
            params.onError?.(err);
            reject(err);
        })
            .on("progress", ({ percent }) => {
            params.onProgress?.(percent ?? 0);
        })
            .save(params.outputPath);
    });
}
