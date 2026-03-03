# 多手机拼接屏幕播放系统（最简化版）

这是一个基于 **Spring Boot + 原生前端（HTML/CSS/JS + Canvas）** 的最小示例项目。

- 初始化阶段通过公网 API 完成：房间创建、设备编号分配、参数同步。
- 播放阶段不依赖公网/实时通信：每台设备仅依据本地时间和初始化参数进行渲染。

## 技术栈

- Java 17
- Spring Boot（仅 REST API）
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

1. 打开浏览器访问：`http://localhost:8080/index.html`
2. 填写参数并创建房间：
   - `deviceCount`：设备总数
   - `text`：播放文字
   - `speed`：滚动速度（px/s）
   - `fontSize`：字体大小
   - `color`：字体颜色
3. 页面会返回：
   - 房间号 `roomId`
   - 统一开始时间 `startTimestamp`
   - 设备加入链接，例如：`/player.html?roomId=xxxx`

## 如何加入

每台手机访问：

```text
http://<服务器地址>:8080/player.html?roomId=<roomId>
```

页面会调用：

```text
GET /api/join?roomId=<roomId>
```

返回示例：

```json
{
  "deviceIndex": 1,
  "deviceCount": 3,
  "text": "HELLO MULTI SCREEN",
  "speed": 80,
  "fontSize": 64,
  "color": "#00ff88",
  "startTimestamp": 1730000000000
}
```

## 局域网测试方式

1. 电脑和手机连接同一个 Wi-Fi。
2. 电脑运行服务后，查询电脑局域网 IP（例如 `192.168.1.100`）。
3. 手机上打开：`http://192.168.1.100:8080/index.html` 创建房间。
4. 将 `player.html?roomId=...` 链接分别在多台手机中打开。
5. 到达 `startTimestamp` 后，各设备按 `deviceIndex` 仅渲染自己的拼接区域。

## REST API 概览

### 创建房间

- `POST /api/rooms`
- 请求体：

```json
{
  "deviceCount": 3,
  "text": "HELLO MULTI SCREEN",
  "speed": 80,
  "fontSize": 64,
  "color": "#00ff88"
}
```

- 响应：

```json
{
  "roomId": "a1b2c3d4",
  "startTimestamp": 1730000000000
}
```

### 设备加入

- `GET /api/join?roomId=a1b2c3d4`
- 响应含设备编号与播放参数（见上）。

