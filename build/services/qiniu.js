import { unlinkSync } from "fs";
import qiniu from "qiniu";
import { getRandomId } from "../utils/random.js";
import { formatAsClock, formatBytes } from "../utils/index.js";
import dotenv from "dotenv";
qiniu.conf.ACCESS_KEY = "6aCSaA_wdWLuwjvqw7ozq33AsE69J4GWnZVSXZuF";
qiniu.conf.SECRET_KEY = "d0y5or3horeFQLZ_vS7XfqLplK6iNOWWQxs7G5j3";
const ACCESS_KEY = "6aCSaA_wdWLuwjvqw7ozq33AsE69J4GWnZVSXZuF";
const SECRET_KEY = "d0y5or3horeFQLZ_vS7XfqLplK6iNOWWQxs7G5j3";
dotenv.config();
const bucket = process.env.BUCKET_NAME;
export function upload(params) {
    return new Promise((resolve) => {
        const filename = params.filename || `${getRandomId()}.mp4`;
        let key = (params.path || "omniplay/") + filename || null;
        let mac = new qiniu.auth.digest.Mac(ACCESS_KEY, SECRET_KEY);
        let options = {
            scope: bucket + (key ? ":" + key : ""),
            deleteAfterDays: params.deleteAfterDays || 0,
        };
        let putPolicy = new qiniu.rs.PutPolicy(options);
        let uploadToken = putPolicy.uploadToken(mac);
        let config = new qiniu.conf.Config();
        let resumeUploader = new qiniu.resume_up.ResumeUploader(config);
        let putExtra = new qiniu.resume_up.PutExtra();
        putExtra.params = {
            "x:name": "liangqy",
            "x:age": "27",
        };
        putExtra.fname = filename;
        let start = Date.now(), last = start, lastBytes = 0;
        let total = '';
        // putExtra.resumeRecordFile = 'progress.log'
        putExtra.progressCallback = (uploadBytes, totalBytes) => {
            // console.log('progress: ', uploadBytes + ' / ' + totalBytes, parseFloat(uploadBytes * 100 / totalBytes).toFixed(2) + '%')
            const now = Date.now();
            const deltaT = (now - last) / 1000; // 秒
            const deltaB = uploadBytes - lastBytes; // 字节
            const instantSpeed = deltaB / deltaT; // B/s
            const avgSpeed = uploadBytes / ((now - start) / 1000);
            const remainBytes = totalBytes - uploadBytes;
            const eta = parseInt(`${remainBytes / avgSpeed}`); // 秒
            total = `${formatBytes(totalBytes)}`;
            // console.log(
            //   `已传 ${(uploadBytes / totalBytes * 100).toFixed(2)}% | ` +
            //   `瞬速 ${(instantSpeed/1024/1024).toFixed(2)} MB/s | ` +
            //   `剩余 ${eta.toFixed(1)} s`
            // );
            params.onProgress?.({
                percent: Math.min(100, Number(parseFloat(`${(uploadBytes * 100) / totalBytes}`).toFixed(2))),
                speed: `${(instantSpeed / 1024 / 1024).toFixed(2)} MB/s`,
                eta: `${formatAsClock(eta)}`,
                total,
            });
            last = now;
            lastBytes = uploadBytes;
        };
        let _url = params.url;
        // if (_url.match(/^https?:\/\//)) {
        //   _url = path.resolve(REMOTE_TMP_PATH, _url.split('?').pop() + '.vue')
        //   // _url = '/tmp/com.dei2.blue-bird/tmp/' + _url.split('?').pop() + '.vue'
        // }
        resumeUploader.putFile(uploadToken, key, _url, putExtra, (respErr, respBody, respInfo) => {
            if (respErr) {
                resolve({
                    code: 100,
                    message: respErr.message,
                    data: {
                        originalUrl: params.url,
                    },
                });
            }
            if (respInfo && respInfo.statusCode == 200) {
                if (params.deleteSource) {
                    unlinkSync(params.url);
                }
                params.onProgress?.({ percent: 100, speed: '', eta: '', total });
                resolve({
                    code: 200,
                    data: {
                        url: `https://img.${process.env.HOST_NAME}/${respBody.key}?${respBody.hash}`,
                        originalUrl: params.url,
                    },
                });
            }
            else {
                resolve({
                    code: respInfo ? respInfo.statusCode : 1001,
                    data: {
                        ...respBody,
                        originalUrl: params.url,
                    },
                });
            }
        });
    });
}
