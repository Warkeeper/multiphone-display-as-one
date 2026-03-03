const statusEl = document.getElementById('status');
const readyBtn = document.getElementById('readyBtn');
const canvas = document.getElementById('playerCanvas');
const ctx = canvas.getContext('2d');

let roomConfig = null;
let animationId = null;
let textWidth = 0;
let countdownTimer = null;
let waitingTimer = null;

function getViewportMetrics() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;
    return {
        rotated: isPortrait,
        width: isPortrait ? height : width,
        height: isPortrait ? width : height
    };
}

async function tryLockLandscapeOrientation() {
    if (!screen.orientation || typeof screen.orientation.lock !== 'function') {
        return;
    }

    try {
        await screen.orientation.lock('landscape');
    } catch (_) {
        // 移动端浏览器通常要求全屏+手势触发，这里静默降级。
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawFrame() {
    if (!roomConfig) return;

    const viewport = getViewportMetrics();

    const elapsed = Date.now() - roomConfig.startTimestamp;
    const offsetX = (roomConfig.deviceIndex - 1) * viewport.width;
    const textGap = Math.max(roomConfig.fontSize * 0.8, 24);
    const repeatDistance = textWidth + textGap;
    const loopProgress = ((roomConfig.speed * elapsed) / 1000) % repeatDistance;
    const globalX = -loopProgress;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (viewport.rotated) {
        ctx.translate(canvas.width, 0);
        ctx.rotate(Math.PI / 2);
    }

    ctx.beginPath();
    ctx.rect(0, 0, viewport.width, viewport.height);
    ctx.clip();

    ctx.font = `${roomConfig.fontSize}px sans-serif`;
    ctx.fillStyle = roomConfig.color;
    ctx.textBaseline = 'middle';

    const localX = globalX - offsetX;
    const visibleStart = -repeatDistance;
    const visibleEnd = viewport.width + repeatDistance;

    let drawX = localX;
    while (drawX > visibleStart) {
        drawX -= repeatDistance;
    }

    while (drawX < visibleEnd) {
        ctx.fillText(roomConfig.text, drawX, viewport.height / 2);
        drawX += repeatDistance;
    }
    ctx.restore();

    animationId = requestAnimationFrame(drawFrame);
}

async function fetchRoomStatus(roomId) {
    const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/status`);
    if (!response.ok) {
        throw new Error('获取房间状态失败');
    }
    return response.json();
}

async function waitUntilAllJoined(roomId) {
    while (true) {
        const status = await fetchRoomStatus(roomId);
        if (status.startTimestamp > 0) {
            roomConfig.startTimestamp = status.startTimestamp;
            return;
        }

        if (status.joinedCount >= status.deviceCount) {
            statusEl.textContent = '所有设备已加入，请点击开始按钮并等待其他设备准备';
            return;
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

function showReadyButton() {
    readyBtn.hidden = false;
    readyBtn.disabled = false;
    readyBtn.textContent = `开始（设备 #${roomConfig.deviceIndex}）`;
}

async function reportReady(roomId) {
    const viewport = getViewportMetrics();
    const body = {
        deviceIndex: roomConfig.deviceIndex,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        devicePixelRatioTimes100: Math.round(window.devicePixelRatio * 100)
    };

    const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error('上报设备准备信息失败');
    }

    return response.json();
}

async function waitForStartTimestamp(roomId) {
    while (true) {
        const status = await fetchRoomStatus(roomId);
        if (status.startTimestamp > 0) {
            roomConfig.startTimestamp = status.startTimestamp;
            return;
        }

        statusEl.textContent = `等待其他设备点击开始并上报信息（${status.reportedReadyCount}/${status.deviceCount}）`;
        await new Promise((resolve) => {
            waitingTimer = setTimeout(resolve, 300);
        });
    }
}

async function init() {
    tryLockLandscapeOrientation();
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

    if (roomConfig.startTimestamp > 0) {
        startPlayback();
        return;
    }

    try {
        await waitUntilAllJoined(roomId);
    } catch (error) {
        statusEl.textContent = error.message;
        return;
    }

    if (roomConfig.startTimestamp > 0) {
        startPlayback();
        return;
    }

    showReadyButton();
    readyBtn.addEventListener('click', async () => {
        await tryLockLandscapeOrientation();
        readyBtn.disabled = true;
        statusEl.textContent = '已点击开始，正在上报设备信息...';

        try {
            const readyResult = await reportReady(roomId);
            if (readyResult.startTimestamp > 0) {
                roomConfig.startTimestamp = readyResult.startTimestamp;
                readyBtn.hidden = true;
                startPlayback();
                return;
            }

            statusEl.textContent = `上报成功，等待其余设备（${readyResult.reportedReadyCount}/${readyResult.deviceCount}）`;
            await waitForStartTimestamp(roomId);
            readyBtn.hidden = true;
            startPlayback();
        } catch (error) {
            readyBtn.disabled = false;
            statusEl.textContent = error.message;
        }
    }, { once: true });
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
    if (countdownTimer) clearInterval(countdownTimer);
    if (waitingTimer) clearTimeout(waitingTimer);
});

init();
