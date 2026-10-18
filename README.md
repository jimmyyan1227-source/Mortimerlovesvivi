# Retro Otome — 复古乙女字卡互动 Web 应用

这是一款原生 HTML / CSS / JavaScript 的静态 Web Demo，视觉参考早期 iPhone / iOS 短信应用：浅灰蓝底色、金属渐变导航、拟物按钮、蓝色发送气泡与灰白接收气泡。适合直接上传 GitHub 并用 GitHub Pages 发布。

## 页面架构（底部 Tab 顺序固定）

1. **Message**：聊天列表、多个角色会话、Call / FaceTime / Contact 模拟交互、发送文字后随机收到内置或自定义字卡。聊天输入栏从左到右为扩展、Camera、Stickers、Voice、输入框和 Send。扩展面板支持红包/转账卡片、可投票的互动问卷、黑胶唱片风格的音乐分享卡片；另含模拟语音消息与颜文字贴纸。
2. **Notes**：信件、日记、字卡拼贴和全部内容。条目可进入独立编辑页，支持保存、编辑、删除，并可插入已收藏的字卡。
3. **Saved**：可切换月份和日期的复古小日历；点击日期查看当天收藏的字卡、日记或其他创作；含纪念日列表，可新增和删除纪念日。
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

- 聊天、Notes、收藏、纪念日和自定义字卡保存在当前浏览器的 `localStorage` 中，不会自动跨设备同步。
- 字卡回复目前由本地随机库产生，没有连接 AI 服务或后端。
- Call、FaceTime、Contact、红包/转账、语音录制与音乐试听均为视觉交互演示，不会进行真实通话、视频、支付、麦克风录音或音频播放。问卷选项可在聊天中点击来模拟对方作答。
- 头像通过 Unsplash 图片 URL 加载，需要网络连接；图片链接可以替换为你自己的素材。
