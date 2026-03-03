const statusEl = document.getElementById('status');
const canvas = document.getElementById('playerCanvas');
const ctx = canvas.getContext('2d');

let roomConfig = null;
let animationId = null;
let textWidth = 0;
let countdownTimer = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawFrame() {
    if (!roomConfig) return;

    const elapsed = Date.now() - roomConfig.startTimestamp;
    const totalWidth = window.innerWidth * roomConfig.deviceCount;
    const offsetX = (roomConfig.deviceIndex - 1) * window.innerWidth;
    const globalX = totalWidth - (roomConfig.speed * elapsed) / 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.clip();

    ctx.font = `${roomConfig.fontSize}px sans-serif`;
    ctx.fillStyle = roomConfig.color;
    ctx.textBaseline = 'middle';

    const localX = globalX - offsetX;
    ctx.fillText(roomConfig.text, localX, canvas.height / 2);
    ctx.restore();

    // 文字完全滚出当前设备屏幕后结束动画。
    if (localX + textWidth < 0) {
        statusEl.textContent = '播放完成';
        return;
    }

    animationId = requestAnimationFrame(drawFrame);
}

async function waitForStartTimestamp(roomId) {
    while (true) {
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/status`);
        if (!response.ok) {
            statusEl.textContent = '获取房间状态失败';
            return 0;
        }

        const status = await response.json();
        if (status.startTimestamp > 0) {
            statusEl.textContent = '所有设备已加入，准备倒计时';
            return status.startTimestamp;
        }

        statusEl.textContent = `等待其他设备加入（${status.joinedCount}/${status.deviceCount}）`;
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
}

function startPlayback() {
    const renderCountdown = () => {
        const remaining = roomConfig.startTimestamp - Date.now();
        if (remaining <= 0) {
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }
            statusEl.textContent = `播放中（设备 ${roomConfig.deviceIndex}/${roomConfig.deviceCount}）`;
            animationId = requestAnimationFrame(drawFrame);
            return;
        }

        statusEl.textContent = `等待统一开始：${Math.ceil(remaining / 1000)} 秒`;
    };

    renderCountdown();
    countdownTimer = setInterval(renderCountdown, 200);
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

    if (roomConfig.startTimestamp <= 0) {
        roomConfig.startTimestamp = await waitForStartTimestamp(roomId);
        if (roomConfig.startTimestamp <= 0) {
            return;
        }
    }

    ctx.font = `${roomConfig.fontSize}px sans-serif`;
    textWidth = ctx.measureText(roomConfig.text).width;
    startPlayback();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
    if (countdownTimer) clearInterval(countdownTimer);
});

init();
