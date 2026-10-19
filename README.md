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
- Sticker in Bubble 可控制是否以 20% 概率随机附加一个颜文字；颜文字只会放在整段开头、整段结尾或完整字卡后面，不会插入字卡/句子的中间。随机池包含自带颜文字和用户添加的颜文字。
- Thinking Time 支持设置最短与最长思考延迟，等待期间会显示复古打字提示。
- 可单独关闭已读不回机制；开启时，正常回复概率可设为 0%–100%，剩余概率模拟已读不回。
- 玩家发消息时，此前角色消息标为 Read，玩家新消息显示 Delivered；角色实际回复后，玩家消息变为 Read，角色新回复显示 Delivered。若触发已读不回，玩家消息会显示 Read，但不会出现角色回复。
- 设置保存在当前浏览器的 localStorage 中，不会跨设备同步。


## 免费翻译：MyMemory → MiniMax

网页默认使用 MyMemory 的公开翻译接口，无需填写翻译 API Key，也不需要部署后端代理，适合 GitHub Pages 静态网站。

- 在角色设置的「语音与 TTS 设置」中，选择语音语言（英语、日语、韩语或德语）。
- 开启「自动翻译字卡」后，语音文本会先通过 MyMemory 翻译，再交给 MiniMax 合成语音。
- 可以点击「测试 MyMemory 翻译」检查接口是否可用。
- MyMemory 是公开在线服务，需要网络连接，可能存在免费额度、频率限制或临时不可用；翻译质量也可能与 DeepL 不同。
- MiniMax 语音仍使用你自己填写的 MiniMax API Key。不要将密钥写入公开代码仓库。

该项目作为静态网站使用时，不需要启动 `server.js`。如果不再使用旧的 DeepL 代理，可以从仓库中删除 `server.js` 和仅用于代理的 `package.json`。


## 最新 UI 更新

- 首页名片右上角可添加联系人，支持本地图片头像与角色名称。
- 点击首页头像可从本地更换；头像压缩后保存在当前浏览器。
- 首页四个导航词统一为 Memories / Often / Violently / Intrude。
- 进入聊天详情后自动隐藏底部 Tab，返回列表或切换 Tab 后恢复。
- 已移除网页内部模拟状态栏，并在窄屏布局中使用 `viewport-fit=cover` 与 `env(safe-area-inset-top/bottom)` 适配 iPhone 安全区域。
- 手机布局依据实际可用视口自适应，适合 iPhone 17 Pro 尺寸；网页不能强制控制系统灵动岛的形状或让网页 UI 真正绘制到系统状态栏之下，显示效果仍取决于 Safari/PWA 模式。


## 最新 UI 修复（Header / 联系人头像 / Tab 图标）

- 添加联系人按钮位于顶部导航栏右侧；Message 列表页左侧显示 Edit，中间显示页签标题。
- 全局使用 `box-sizing: border-box` 并限制主要容器宽度，减少手机端横向溢出。
- 添加联系人头像选择器使用覆盖式透明文件输入框，适配移动端点击；选择的头像会压缩后以 Data URL 保存在本地联系人数据中。
- 底部四个 Tab 使用自定义 SVG 拟物图标（信封、笔记本、五角星、名片头像）。

## Me 字卡列表升级
- 字卡列表总标题支持折叠，状态保存在浏览器本地。
- 每个字卡分组（含未分组）支持独立展开/收起，并记忆状态。
- 每张字卡新增复古风格多选框；工具栏支持全选、批量移动到目标分组及批量删除，删除前会二次确认。
- Edit 顶部导航按钮缩小为精巧胶囊按钮。


## 通话拨号键盘（DTMF）

- 通话界面点击「拨号键盘」会从底部滑出白色复古 12 键键盘，包含 0–9、*、#；再次点击功能按钮或按「完成」可收起。
- 点击按键会把数字或符号显示在键盘上方，并通过浏览器 Web Audio API 合成对应的双音多频（DTMF）按键音。该功能仅在本地播放音效，不会向真实电话线路发送按键信号。

## Notes V4 update
- The feature-phone reader keeps its original **选项 / 回复 / 返回** softkey row; **返回** goes back to the letter list. A separate bottom row provides **编辑** (opens the current letter editor) and **退出** (returns to the Notes home screen). The reader uses a flex-column layout so both control rows stay visible.
- The personal letter editor now shows **这封信写给** with only **莫蒂** as the recipient. New user-authored letters are saved as written by 薇薇 and addressed to 莫蒂.
- The collected-card picker is hidden while writing letters or diary entries; it remains available for Card Collage only.


## Notes reader update — V6

- Letter and diary records stay in their dedicated collections; the Notes home list beneath `＋ New Note` only shows collage entries rather than duplicating letters/diaries. `All Fragments` remains the deliberate all-records view.
- Letters and diaries share the clean white classic feature-phone reader. The displayed prefix distinguishes a letter (`【薇薇】: ...`) from a diary (`【薇薇的日记】 ...`).
- The reader has a single bottom action bar: `选项` and `退出`; `回复` appears only for a letter authored by Mortimer. `选项` opens `编辑` / `删除`.

## Notes automatic letter reply — V7

- Saving a new letter authored by 薇薇 records an internal reply deadline once, between one minute and twelve hours later. The deadline is not rendered anywhere in the app and is not reset when the original letter is edited.
- When the deadline is reached while the page is open, a scheduled check adds one reply from 莫蒂 to the letter collection. If the page was closed, overdue replies are processed at the next page load or when the page returns to the foreground.
- Each reply uses a random 1–12 enabled cards from the Me custom card library, sampled without repeating a card within one reply and concatenated in their selected order. It does not call an AI service or invent extra text.
- Each original letter is marked internally after a reply is created, and the reply stores a link to its original letter, preventing duplicate replies on refresh.
- If there are no eligible enabled cards when the deadline arrives, the reply remains pending and is retried when the app checks again until cards are available.
- This is client-side scheduling in localStorage, so reply records are local to that browser/device. A browser can throttle timers in a background tab; returning to the page triggers an immediate catch-up check.

## Music Box framework — V9
- Replaced the empty Music Box placeholder with the supplied three-tier layout: full-width audio catalog; left shortcut dock beside Now Playing; lower two-column Korean-style message card and Lyrics Studio.
- Reworked the visual palette into coordinated frost blue, white, and pale periwinkle. The Now Playing and Lyrics Studio title bars are no longer black panels.
- Added four sample track rows, search/import controls, progress lines, volume slider styling, player controls, album-art frame, framed message card, and highlighted lyric line as UI scaffolding.
- This version focuses on the visual framework/layout. Audio import, actual playback/playlist actions, card sending, and lyric-time synchronization are not wired up yet; these are intended for the next functional pass.
