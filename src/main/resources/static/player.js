const statusEl = document.getElementById('status');
const readyBtn = document.getElementById('readyBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

function isIosSafari() {
    const ua = window.navigator.userAgent;
    const isIOS = /iP(ad|hone|od)/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isWebKit = /WebKit/i.test(ua);
    const isCriOS = /CriOS/i.test(ua);
    const isFxiOS = /FxiOS/i.test(ua);

    return isIOS && isWebKit && !isCriOS && !isFxiOS;
}

function canUseFullscreen() {
    return !!document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function';
}

function canLockLandscape() {
    return !!screen.orientation && typeof screen.orientation.lock === 'function';
}

function isLandscape() {
    return window.innerWidth >= window.innerHeight;
}

async function tryEnterFullscreen() {
    if (document.fullscreenElement) {
        return true;
    }

    if (!canUseFullscreen()) {
        return false;
    }

    try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        return true;
    } catch (error) {
        return false;
    }
}

async function tryLockLandscape() {
    if (!canLockLandscape()) {
        return false;
    }

    try {
        await screen.orientation.lock('landscape');
        return true;
    } catch (error) {
        return false;
    }
}

function updateFullscreenPrompt() {
    const needsLandscape = !isLandscape();
    const needsFullscreen = canUseFullscreen() && !document.fullscreenElement;

    fullscreenBtn.hidden = !(needsLandscape || needsFullscreen);
}

async function ensureImmersiveMode({ fromGesture = false } = {}) {
    let enteredFullscreen = false;
    let lockedLandscape = false;

    if (fromGesture) {
        enteredFullscreen = await tryEnterFullscreen();
        lockedLandscape = await tryLockLandscape();
    } else if (document.fullscreenElement) {
        lockedLandscape = await tryLockLandscape();
    }

    updateFullscreenPrompt();

    if (
        fromGesture &&
        !isLandscape() &&
        isIosSafari() &&
        !enteredFullscreen &&
        !lockedLandscape
    ) {
        statusEl.textContent = 'iOS Safari 不允许网页强制横屏/全屏，请手动旋转手机；可在 Safari 菜单中隐藏工具栏以获得更大显示区域。';
    }
}

const canvas = document.getElementById('playerCanvas');
const ctx = canvas.getContext('2d');

let roomConfig = null;
let animationId = null;
let textWidth = 0;
let countdownTimer = null;
let waitingTimer = null;

function getViewportWidths() {
    const serverWidths = Array.isArray(roomConfig.viewportWidths) ? roomConfig.viewportWidths : [];
    return Array.from({ length: roomConfig.deviceCount }, (_, index) => {
        const width = Number(serverWidths[index]);
        return Number.isFinite(width) && width > 0 ? width : window.innerWidth;
    });
}

function getTotalWidthAndOffset() {
    const viewportWidths = getViewportWidths();
    const totalWidth = viewportWidths.reduce((sum, width) => sum + width, 0);
    const offsetX = viewportWidths
        .slice(0, Math.max(0, roomConfig.deviceIndex - 1))
        .reduce((sum, width) => sum + width, 0);

    return { totalWidth, offsetX };
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawFrame() {
    if (!roomConfig) return;

    const elapsed = Date.now() - roomConfig.startTimestamp;
    const { totalWidth, offsetX } = getTotalWidthAndOffset();
    const textGap = Math.max(roomConfig.fontSize * 0.8, 24);
    const repeatDistance = Math.max(textWidth + textGap, totalWidth);
    const loopProgress = ((roomConfig.speed * elapsed) / 1000) % repeatDistance;
    const globalX = -loopProgress;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.clip();

    ctx.font = `${roomConfig.fontSize}px sans-serif`;
    ctx.fillStyle = roomConfig.color;
    ctx.textBaseline = 'middle';

    const localX = globalX - offsetX;
    const visibleStart = -repeatDistance;
    const visibleEnd = canvas.width + repeatDistance;

    let drawX = localX;
    while (drawX > visibleStart) {
        drawX -= repeatDistance;
    }

    while (drawX < visibleEnd) {
        ctx.fillText(roomConfig.text, drawX, canvas.height / 2);
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
        if (Array.isArray(status.viewportWidths)) {
            roomConfig.viewportWidths = status.viewportWidths;
        }

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
    const body = {
        deviceIndex: roomConfig.deviceIndex,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
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
        if (Array.isArray(status.viewportWidths)) {
            roomConfig.viewportWidths = status.viewportWidths;
        }

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
    await ensureImmersiveMode();

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
        readyBtn.disabled = true;
        statusEl.textContent = '已点击开始，正在上报设备信息...';

        try {
            const readyResult = await reportReady(roomId);
            if (Array.isArray(readyResult.viewportWidths)) {
                roomConfig.viewportWidths = readyResult.viewportWidths;
            }

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

window.addEventListener('resize', () => {
    resizeCanvas();
    updateFullscreenPrompt();
});
window.addEventListener('orientationchange', updateFullscreenPrompt);
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        tryLockLandscape();
    }
    updateFullscreenPrompt();
});
fullscreenBtn.addEventListener('click', async () => {
    await ensureImmersiveMode({ fromGesture: true });
});
window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
    if (countdownTimer) clearInterval(countdownTimer);
    if (waitingTimer) clearTimeout(waitingTimer);
});

init();
