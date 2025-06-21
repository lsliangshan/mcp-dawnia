export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  while (bytes >= 1000 && index < units.length - 1) {
    bytes /= 1000;
    index++;
  }
  return `${bytes.toFixed(2)} ${units[index]}`;
}

/**
 * @param {number} sec  – 输入总秒数；若你拿到的是毫秒，先除以 1000
 * @returns {string}    – 格式化后的 hh:mm:ss 或 mm:ss
 */
export function formatAsClock(sec: number) {
  sec = Math.max(0, Math.floor(sec));       // 防御性做法，确保是非负整数
  const h = Math.floor(sec / 3600);
  const m = Math.floor(sec % 3600 / 60);
  const s = sec % 60;

  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0
    ? `${String(h).padStart(2, '0')}:${mm}:${ss}`
    : `${mm}:${ss}`;
}
