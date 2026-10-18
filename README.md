# Retro Otome — 复古乙女字卡网页

一个参考早期 iOS / iPhone 短信界面的纯前端 Demo。使用原生 HTML、CSS、JavaScript，不需要安装依赖，适合直接上传到 GitHub 并通过 GitHub Pages 发布。

## 预览功能

- 复古渐变导航栏、拟物按钮、蓝色发送气泡与灰色接收气泡
- 会话列表与多角色聊天界面
- 发送消息后随机收到一张字卡
- 字卡收藏、拼信、复制信件
- 模拟 Call / FaceTime / Contact 弹窗（不会发起真实通话）
- 本地保存聊天和收藏（`localStorage`）
- 导出当前数据为 JSON
- 手机端全屏布局，桌面端手机机身预览

## 本地运行

直接双击 `index.html` 通常即可打开。若浏览器限制部分功能，建议使用 VS Code 的 Live Server，或在项目目录运行：

```bash
python -m http.server 8000
```

然后打开 `http://localhost:8000`。

## 发布到 GitHub Pages

1. 在 GitHub 新建一个仓库，例如 `retro-otome`。
2. 解压本 ZIP，将 `index.html`、`style.css`、`app.js`、`README.md` 上传到仓库根目录。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment** 中选择 **Deploy from a branch**。
5. Branch 选择 `main`，目录选择 `/(root)`，点击 **Save**。
6. 等待 GitHub Pages 部署完成，页面地址会显示在 Pages 设置区域。

## 项目结构

```text
retro-otome/
├── index.html
├── style.css
├── app.js
└── README.md
```

## 数据与注意事项

- 聊天和字卡数据保存在当前浏览器的本地存储中；清除浏览器数据或更换设备后不会自动同步。
- 头像使用 Unsplash 图片链接，需要网络连接才能加载；可按自己的角色设定替换。
- 目前角色回复使用内置字卡随机抽取，不接入 AI 服务或后端。
- 电话、FaceTime、联系人操作为视觉演示，不会调用真实通话、视频或支付服务。
