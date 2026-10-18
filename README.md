# Retro Otome — 复古乙女字卡互动 Web 应用

这是一款原生 HTML / CSS / JavaScript 的静态 Web Demo，视觉参考早期 iPhone / iOS 短信应用：浅灰蓝底色、金属渐变导航、拟物按钮、蓝色发送气泡与灰白接收气泡。适合直接上传 GitHub 并用 GitHub Pages 发布。

## 页面架构（底部 Tab 顺序固定）

1. **Message**：聊天列表、多个角色会话、Call / FaceTime / Contact 模拟交互、发送文字后只会从 Me 中已启用的自定义字卡随机回复；字卡库为空或全部禁用时不会使用默认短句。聊天输入栏从左到右为扩展、Camera、Stickers、Voice、输入框和 Send。扩展面板支持红包/转账卡片、可投票的互动问卷、黑胶唱片风格的音乐分享卡片；另含模拟语音消息与颜文字贴纸。
2. **Notes**：信件、日记、字卡拼贴和全部内容。条目可进入独立编辑页，支持保存、编辑、删除，并可插入已收藏的字卡。
3. **Saved**：可切换月份和日期的复古小日历；仅展示聊天中手动收藏的单条消息或多选合并的聊天记录，并可按收藏日期筛选；含纪念日列表，可新增和删除纪念日。
4. **Me**：编辑显示名与签名、添加和删除自定义字卡、导出 JSON 数据、重置本地 Demo 数据。

首页名片下方的四个按键文案为 **Memories / often / violently / intrude**。

## 本地预览

无需安装 Node.js 或依赖包。可直接打开 `index.html`。如需稳定预览，推荐在项目目录运行：

```bash
python -m http.server 8000
```

然后打开 `http://localhost:8000`。

## 发布到 GitHub Pages

1. 在 GitHub 创建一个新仓库，例如 `retro-otome`。
2. 解压本 ZIP，把 `index.html`、`style.css`、`app.js`、`README.md` 上传到仓库根目录。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment** 中选择 **Deploy from a branch**。
5. 选择 `main` 分支、`/(root)` 目录并保存。
6. 等待 GitHub Pages 部署后，在 Pages 设置页打开生成的网址。

## 项目结构

```text
retro-otome/
├── index.html
├── style.css
├── app.js
└── README.md
```

## 数据和能力边界

- 聊天、Notes、手动收藏、纪念日、自定义字卡及联系人置顶/隐藏状态保存在当前浏览器的 `localStorage` 中，不会自动跨设备同步。
- 聊天列表支持向左滑动联系人行显示 Pin / Hide / Delete。被隐藏的会话可以通过列表顶部的 Hidden 按钮恢复显示；删除会话会移除本地聊天历史，但已保存到 Saved 的收藏副本会保留。
- 在聊天消息上长按（桌面端也支持右键）可打开操作菜单：收藏单条消息、删除消息或进入多选模式。多选可同时勾选自己和对方的消息，再批量删除或合并收藏为一组聊天记录。
- Saved 只展示用户手动收藏的消息；收到字卡、普通聊天以及保存 Notes 内容均不会再自动写入 Saved。日历按手动收藏日期筛选，组收藏会以合并聊天记录形式显示。
- 升级后会自动忽略旧版 Saved 中自动生成的聊天/Notes 记录；旧的 Notes、自定义字卡和纪念日仍保留。
- 字卡回复目前由本地随机库产生，没有连接 AI 服务或后端。
- Call、FaceTime、Contact、红包/转账、语音录制与音乐试听均为视觉交互演示，不会进行真实通话、视频、支付、麦克风录音或音频播放。问卷选项可在聊天中点击来模拟对方作答。
- 头像通过 Unsplash 图片 URL 加载，需要网络连接；图片链接可以替换为你自己的素材。


## 自定义字卡库（Me）

- 新安装时字卡库为空，不含任何内置随机回复。
- 支持每行一句批量添加、`.txt` / `.csv` 文件导入，并自动跳过重复句子。
- 可以创建、重命名和删除分组；删除分组时其中的字卡保留并移动到“未分组”。
- 支持全局启用/禁用、分组启用/禁用和单条字卡开关。
- 聊天只会从“字卡已启用且所属分组已启用”的字卡中随机回复；如果没有可用字卡，会提示用户前往 Me 添加/启用字卡，不会使用默认短句兜底。
- 旧版本中用户自己添加的字卡会迁移为启用状态；旧版内置字卡不再参与抽取。


## 角色专属对话偏好（Message → 聊天详情 → Edit）

- 每个联系人单独保存对话设置。
- Multi-Cards Combo 可关闭或开启；开启后可设置每次回复 1–5 张字卡，并选择是否为每条字卡自动补充句号。可用字卡少于设定数量时，只抽取实际可用的启用字卡。
- Sticker in Bubble 可控制是否在角色回复气泡末尾随机附加颜文字。
- Thinking Time 支持设置最短与最长思考延迟，等待期间会显示复古打字提示。
- 可单独关闭已读不回机制；开启时，正常回复概率可设为 0%–100%，剩余概率模拟已读不回。
- 玩家发消息时，此前角色消息标为 Read，玩家新消息显示 Delivered；角色实际回复后，玩家消息变为 Read，角色新回复显示 Delivered。若触发已读不回，玩家消息会显示 Read，但不会出现角色回复。
- 设置保存在当前浏览器的 localStorage 中，不会跨设备同步。


## DeepL → MiniMax 双 API 联动（需要后端代理）

DeepL 官方明确不允许浏览器端 JavaScript 直接调用 DeepL API；浏览器请求会被 CORS 策略拦截。请不要在 `app.js` 中放置真实 API Key。项目现在改为通过 `server.js` 后端代理请求 DeepL，Key 只从服务端环境变量读取。

### 部署后端代理

项目使用 Node.js 18 或更高版本，代理没有额外 npm 依赖。可以将整个项目上传到支持 Node.js 的服务托管平台，或在本机测试。

需要在托管平台的环境变量（Environment Variables）中设置：

- `DEEPL_API_KEY`：你的 DeepL API Key（仅填在服务端，不要提交到 GitHub）。
- `DEEPL_API_TYPE`：`free` 或 `pro`，作为默认类型。
- `ALLOWED_ORIGIN`：允许访问代理的网页来源。填写完整 Origin，不要加结尾斜杠；例如 `https://你的用户名.github.io`。本机测试可设置为 `http://localhost:8000`。如果有多个来源，用英文逗号分隔。
- `PORT`：通常由托管平台自动设置，不需要手动填写。

启动命令：

```bash
npm start
```

部署成功后，先打开 `https://你的代理域名/health`。应返回 JSON，其中 `ok` 为 `true`，`keyConfigured` 为 `true` 表示服务端已读取到 Key。翻译接口地址是 `https://你的代理域名/api/translate`。

### 连接前端

1. 打开网页，进入聊天对象的 **Edit → 03 · 语音与 TTS 设置**。
2. 在「翻译代理 URL」中填入完整地址，例如 `https://你的代理域名/api/translate`。
3. 选择 DeepL Free 或 Pro 类型。该选择会发送给代理，代理据此选择 DeepL 对应接口；所填 Key 必须属于相应 API 类型。
4. 将「语音语言」设置为英语、日语、韩语或德语，再点击「测试 DeepL 翻译连接」。
5. 测试成功后，可以开启「自动翻译字卡」和「语音消息同时显示译文」。自动翻译成功时，译文会交给 MiniMax 合成语音；翻译失败时会回退到原文字卡。

### 本机测试

终端 1：在项目目录启动代理，并设置环境变量。Windows PowerShell 示例：

```powershell
$env:DEEPL_API_KEY="你的真实密钥"
$env:DEEPL_API_TYPE="free"
$env:ALLOWED_ORIGIN="http://localhost:8000"
npm start
```

终端 2：在同一项目目录启动静态网页服务：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`，不要直接双击 `index.html`（地址会显示为 `file:///...`）。在设置中填写 `http://localhost:8787/api/translate`。本机测试时代理服务和静态网页服务都必须保持运行。

### 错误诊断

- `Failed to fetch`：先检查代理 URL、代理服务是否运行，以及 `ALLOWED_ORIGIN` 是否与网页地址完全一致。
- `HTTP 401`：服务端环境变量中的 DeepL Key 无效或不匹配。
- `HTTP 403`：账户权限、API 类型或请求来源配置可能不正确。
- `HTTP 456`：可能是 DeepL 配额或使用限制。
- `HTTP 429`：代理的简单请求频率限制已触发，稍后重试。
- `keyConfigured: false`：托管平台没有正确设置 `DEEPL_API_KEY`。

代理有基础来源限制和每个 IP 的频率限制，但公开部署前仍应仅允许自己的网页来源，并监控请求用量。不要把 `.env`、真实密钥或包含密钥的截图提交到公开仓库。

### DeepL 翻译连接测试

「测试 DeepL 翻译连接」会单独翻译“你好，很高兴认识你。”，不会调用 MiniMax。失败时会显示代理请求地址、目标语言、HTTP 状态和后端返回的错误详情。前端不再接收或保存 DeepL Key。
