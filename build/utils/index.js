export function formatBytes(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let index = 0;
    while (bytes >= 1000 && index < units.length - 1) {
        bytes /= 1000;
        index++;
    }
    return `${bytes.toFixed(2)} ${units[index]}`;
}
