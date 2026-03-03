const statusEl = document.getElementById('status');
const canvas = document.getElementById('playerCanvas');
const ctx = canvas.getContext('2d');

let roomConfig = null;
let animationId = null;
let textWidth = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawFrame(now) {
    if (!roomConfig) return;

    const elapsed = now - roomConfig.startTimestamp;
    const totalWidth = window.innerWidth * roomConfig.deviceCount;
    const offsetX = (roomConfig.deviceIndex - 1) * window.innerWidth;
    const globalX = totalWidth - (roomConfig.speed * elapsed) / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // 只绘制当前设备所在拼接区域内可见的部分
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.clip();

    ctx.font = `${roomConfig.fontSize}px sans-serif`;
    ctx.fillStyle = roomConfig.color;
    ctx.textBaseline = 'middle';

    const localX = globalX - offsetX;
    const y = canvas.height / 2;
    ctx.fillText(roomConfig.text, localX, y);
    ctx.restore();

    const offscreenRight = localX > canvas.width;
    const offscreenLeft = localX + textWidth < 0;
    if (offscreenRight || offscreenLeft) {
        statusEl.textContent = '播放完成';
        return;
    }

    animationId = requestAnimationFrame(drawFrame);
}

function startPlayback() {
    const wait = roomConfig.startTimestamp - Date.now();
    if (wait > 0) {
        statusEl.textContent = `等待统一开始：${Math.ceil(wait / 1000)} 秒`;
        const countdown = setInterval(() => {
            const remaining = roomConfig.startTimestamp - Date.now();
            if (remaining <= 0) {
                clearInterval(countdown);
                statusEl.textContent = `播放中（设备 ${roomConfig.deviceIndex}/${roomConfig.deviceCount}）`;
                animationId = requestAnimationFrame(drawFrame);
            } else {
                statusEl.textContent = `等待统一开始：${Math.ceil(remaining / 1000)} 秒`;
            }
        }, 200);
    } else {
        statusEl.textContent = `播放中（设备 ${roomConfig.deviceIndex}/${roomConfig.deviceCount}）`;
        animationId = requestAnimationFrame(drawFrame);
    }
}

async function init() {
    resizeCanvas();

    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('roomId');
    if (!roomId) {
        statusEl.textContent = '缺少 roomId 参数';
        return;
    }

    const response = await fetch(`/api/join?roomId=${encodeURIComponent(roomId)}`);
    if (!response.ok) {
        statusEl.textContent = '加入失败：房间不存在或已满';
        return;
    }

    roomConfig = await response.json();
    ctx.font = `${roomConfig.fontSize}px sans-serif`;
    textWidth = ctx.measureText(roomConfig.text).width;
    startPlayback();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
});

init();
