# 多手机拼接屏幕播放系统（最简化版）

这是一个基于 **Spring Boot + 原生前端（HTML/CSS/JS + Canvas）** 的最小示例项目。

- 初始化阶段通过公网 REST API 完成：房间创建、设备编号分配、参数同步。
- **加入设备数达到 `deviceCount` 后，进入“手动开始+设备信息上报”阶段；全部上报完成后触发统一倒计时（默认 5 秒）**。
- 播放阶段不依赖公网/实时通信：每台设备仅依据本地时间和初始化参数进行渲染。

## 技术栈

- Java 17
- Spring Boot（仅 REST API，无 WebSocket）
- 内存存储（`ConcurrentHashMap`）
- 设备编号分配（`AtomicInteger`）
- 前端：HTML + CSS + 原生 JavaScript + Canvas

## 如何启动

### 1) 环境要求

- JDK 17+
- Maven 3.9+

### 2) 启动服务

```bash
mvn spring-boot:run
```

默认监听：`http://localhost:8080`

## 如何创建房间

1. 打开：`http://localhost:8080/index.html`
2. 填写参数并创建房间：
   - `deviceCount`：设备总数
   - `text`：播放文字
   - `speed`：滚动速度（px/s）
   - `fontSize`：字体大小
   - `color`：字体颜色
3. 创建后会得到：
   - 房间号 `roomId`
   - 加入链接：`/player.html?roomId=xxxx`

> 说明：房间创建时 `startTimestamp=0`，表示尚未开始倒计时。

## 如何加入

每台手机打开：

```text
http://<服务器地址>:8080/player.html?roomId=<roomId>
```

播放器流程：

1. 调用 `GET /api/join?roomId=...` 获取自己的 `deviceIndex` 和播放参数。
2. 若尚未满员（`startTimestamp=0`），页面会轮询 `GET /api/rooms/{roomId}/status`。
3. 当房间满员后，每台设备显示带有加入顺序的“开始”按钮。
4. 用户在每台设备点击“开始”后，客户端上报设备尺寸与像素比等信息。
5. 服务端收齐全部设备上报后，统一设置 `startTimestamp = now + 5s`。
6. 所有设备看到相同开始时间并统一倒计时后播放。

## 局域网测试方式

1. 电脑和手机连接同一个 Wi-Fi。
2. 电脑运行服务，查询电脑局域网 IP（例如 `192.168.1.100`）。
3. 手机访问：`http://192.168.1.100:8080/index.html` 创建房间。
4. 将 `player.html?roomId=...` 链接分别在多台手机打开。
5. 当加入设备数达到 `deviceCount` 后，在每台设备点击“开始”并上报信息。
6. 服务端收齐信息后统一 5 秒倒计时播放。

## REST API 概览

### 创建房间

- `POST /api/rooms`

请求体：

```json
{
  "deviceCount": 3,
  "text": "HELLO MULTI SCREEN",
  "speed": 80,
  "fontSize": 64,
  "color": "#00ff88"
}
```

响应：

```json
{
  "roomId": "a1b2c3d4",
  "startTimestamp": 0
}
```

### 设备加入

- `GET /api/join?roomId=a1b2c3d4`

响应示例（未满员）：

```json
{
  "deviceIndex": 1,
  "deviceCount": 3,
  "text": "HELLO MULTI SCREEN",
  "speed": 80,
  "fontSize": 64,
  "color": "#00ff88",
  "startTimestamp": 0
}
```

响应示例（全部设备点击开始并上报后）：

```json
{
  "deviceIndex": 3,
  "deviceCount": 3,
  "text": "HELLO MULTI SCREEN",
  "speed": 80,
  "fontSize": 64,
  "color": "#00ff88",
  "startTimestamp": 1730000000000
}
```

### 房间状态（用于初始化轮询）

- `GET /api/rooms/{roomId}/status`

```json
{
  "roomId": "a1b2c3d4",
  "joinedCount": 2,
  "reportedReadyCount": 1,
  "deviceCount": 3,
  "startTimestamp": 0,
  "ready": false
}
```


### 设备点击开始并上报信息

- `POST /api/rooms/{roomId}/ready`

请求体：

```json
{
  "deviceIndex": 1,
  "viewportWidth": 390,
  "viewportHeight": 844,
  "devicePixelRatioTimes100": 300
}
```

响应示例（尚未收齐）：

```json
{
  "reportedReadyCount": 2,
  "deviceCount": 3,
  "startTimestamp": 0
}
```

响应示例（全部收齐后）：

```json
{
  "reportedReadyCount": 3,
  "deviceCount": 3,
  "startTimestamp": 1730000000000
}
```
