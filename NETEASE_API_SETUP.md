# Retro Otome · 网易云 API 接入说明（V26）

## 现在接好了什么

- 音乐面板左侧的 **Play** 快捷键打开「网易云音乐连接」面板。
- 可填入你自己部署的 API 根地址，先用 `/search` 测试服务是否可访问。
- 可选填账号 Cookie 和用户 ID；通过登录状态接口尝试识别账号，再读取 `/user/playlist` 并选择一个歌单导入。
- 网易云歌单曲目导入后，播放器会尝试请求标准音质播放地址 `/song/url/v1`，并通过 `/lyric` 获取时间轴歌词。
- API 地址保存在当前浏览器的 `localStorage`；Cookie 默认保存在当前标签页的 `sessionStorage`。如点击「保存 Cookie」，则会另外保存到当前浏览器的 `localStorage`，方便下次自动填入；Cookie 不写入应用状态或可下载备份。Cookie 通过 POST 请求体发送，不放在 URL 查询参数中。

## 部署 API

推荐先查看这个社区维护的 API 项目及其许可说明：

- https://github.com/neteasecloudmusicapienhanced/api-enhanced
- 项目在线文档：https://neteasecloudmusicapienhanced.js.org/

原始仓库 https://github.com/Binaryify/NeteaseCloudMusicApi 已于 2024 年被归档；本网页适配的是常见的 NeteaseCloudMusicApi 接口路径。社区维护版本或未来版本可能调整接口参数，因此部署后必须实际测试。

大致步骤：

1. 登录 GitHub，打开上面的社区 API 项目，阅读 README、调用须知和许可证。
2. Fork 到自己的 GitHub 账号。
3. 在 Vercel 新建项目，导入自己 Fork 的仓库，按项目说明部署。项目要求的 Node.js / 包管理器版本以仓库当前 README 为准。
4. 部署成功后复制 API 服务的根地址，例如 `https://your-project.vercel.app`。不要复制 GitHub 仓库 URL、文档地址、带 `/#/` 的页面地址或某个具体接口地址。
5. 在 Retro Otome 的 Notes → Music 页面点击左侧 **Play**，粘贴根地址，再点「测试并连接」。

部署平台的免费额度、可用性和账号要求可能变化；如果平台要求确认计费或开通付费方案，请先看清楚再操作。不要在 GitHub 代码、公开 Issue 或聊天消息中提交 Cookie。

## 账号 Cookie 注意事项

- 只连接你自己部署的 API；不要把 Cookie 交给陌生的公共 API 地址。
- Cookie 是登录凭证，不是普通密码字段。拥有它的人可能以你的登录态调用部分接口。
- Cookie 可仅留在当前标签页，也可通过「保存 Cookie」主动持久保存在当前浏览器的 `localStorage`。后者方便下次使用，但同一浏览器中的恶意脚本仍可能读取它；API 服务端也会收到 Cookie。部署平台、服务日志或第三方扩展的行为不由本网页控制。
- 当前版本没有为你部署的 API 自动增加访问口令、登录保护或专属后端会话层。不要将 API 地址当成私密服务；如果之后要长期使用账号连接，应再加一层后端访问令牌/会话保护，并检查服务端日志策略。
- 本版不会接收网易云账号密码，也不会自动登录；Cookie 失效时需要重新连接。

## 当前版本的已知限制

- 目前是前端接入准备版；没有在你的账号或部署环境上实测 API。必须先部署服务，才能确认 CORS、登录态、歌单、音源和歌词接口是否兼容。
- 登录状态接口如果没有返回用户 ID，可以在 Play 面板中填入自己的网易云用户 ID。
- 一次从账号连接流程导入一个歌单；要导入其他歌单，可再次点 Play 选择。
- 歌词只在 API 返回 LRC 时间轴时才能自动同步。部分曲目可能没有歌词。
- 播放地址可能因版权、地区、账号权限或歌曲资源状态而不可用；本项目不会通过修改方案来绕过付费或版权限制。
- 如果部署的 API 版本不接受将 Cookie 放在 POST 请求体中，连接验证会失败。该版本不会为了兼容而把 Cookie 自动降级到 URL 查询参数中。


## V30 Cookie 保存按钮
- 连接面板移除了冗长说明段落和「清除本次 Cookie」按钮。
- 「保存 Cookie」会将凭证留在当前浏览器，重新打开网页或连接面板时自动填入；凭证不进入下载备份。
