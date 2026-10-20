# 薇薇 × 莫蒂默的共同小鸡｜八模块养成规则（前端实现稿）

版本：规则设计 V1.2  
模式：真实时间流逝 / 轻度经营 / 慢成长多阶段  
运行方式：纯前端、本地 `localStorage`；不依赖实时 AI 或服务器。

## 设计总原则

1. **时间真实流逝**：数值使用真实时间戳计算。网页关闭时不跑后台程序；重新打开或触发动作时补算离线期间的变化。
2. **轻度经营**：状态变差只会影响心情、互动和收藏，不会死亡、不退化、不永久错过收藏。
3. **慢慢成长**：阶段由固定时间戳计算，频繁打开网页不会加速年龄；错过几天也只补算一次状态，不补刷大量事件。
4. **互动有意义但不逼人**：常用动作有冷却；状态正常时不需要反复点击。提示使用温柔文案，不用惩罚性红字。
5. **莫蒂默是本地模拟规则**：没有实时 AI，也没有网页关闭时的后台进程；达到条件后在下次打开宠物页时补记一次照料。
6. **状态与表现分离**：逻辑状态是唯一真值；UI、动画、收藏记录都由状态渲染，不能反过来决定孵化或成长。

---

## 模块 1｜孵化与阶段成长

### 孵化规则

- 默认阶段：`egg`。
- 自然孵化时间：自 `hatchStartedAt` 起 **24 小时**。
- 保暖互动：冷却 **6 小时**；每次增加 **15 个孵化百分点**，最多累计 **45 个百分点**。
- 孵化进度：`min(100, elapsedMs / 24h * 100 + min(45, hatchCare * 15))`。
- 为避免一连串操作瞬间孵化，保留 6 小时冷却；按正常时间戳计算，积极保暖也要经过真实时间，不能仅靠连续点击立即破壳。
- 达到 100% 时只触发一次 `hatch` 事件：设置 `stage='chick'`、记录 `hatchedAt=now`、将心情设为 `happy`、隐藏蛋、显示小鸡、解锁“初次见面纪念羽毛”，并生成一条共同纪念记录。
- 孵化完成后 `warm` 立即失效；不要再把进度设回蛋状态，也不要重新显示蛋。

### 成长阶段（从 `hatchedAt` 计算）

| 阶段 ID | 孵化后的真实时间 | 显示名称 | 规则 |
|---|---:|---|---|
| `egg` | 尚未孵化 | 蛋阶段 | 只允许保暖；显示蛋与进度条 |
| `chick` | 0–72 小时 | 幼雏期 | 小鸡较小，动画以眨眼、张望、短距离走动为主 |
| `growing` | 72–168 小时 | 成长期 | 解锁成长纪念；活动频率略高，外观尺寸只做轻微增长 |
| `grown` | 168 小时及以后 | 成熟期 | 不再自动变老或退化；进入稳定陪伴状态 |

- `ageHours = floor((now - hatchedAt) / 3600000)`。
- 阶段必须从 `hatchedAt` 推导，不要依赖反复 `day += 1`，否则用户频繁打开网页可能导致天数累计异常。
- 展示日龄：`day = floor((now - eggStartedAt) / 86400000) + 1`；它只用于显示，不作为阶段计算依据。
- 孵化后蛋元素应始终 `hidden=true` 或从场景中移除；蛋和小鸡不能同时显示。

## 模块 2｜状态、心情与真实时间

状态范围统一为 `0–100`，所有数值保存为整数并在写入前 clamp。

| 状态 | 初始值 | 自然变化 | 阈值/含义 |
|---|---:|---|---|
| 饱腹度 `hunger` | 72 | 每真实小时 -2 | 80–100 饱足；40–79 正常；20–39 饿了；0–19 很饿 |
| 精力 `energy` | 82 | 每真实小时 -1 | 70–100 精神；31–69 普通；1–30 困倦；0 精疲力尽 |
| 小窝整洁 `cleanliness` | 90 | 每真实 2 小时 -1 | 71–100 整洁；31–70 有些凌乱；0–30 需要整理 |
| 心情 `mood` | `curious` | 依据状态与最近互动重算 | `happy`、`curious`、`sleepy`、`sad` |
| 共同亲密度 `bond` | 0 | 由互动/事件增加 | 0–100；不自然衰减 |
| 薇薇亲密度 `viviBond` | 0 | 薇薇互动增加 | 0–100；不自然衰减 |
| 莫蒂默亲密度 `mortimerBond` | 0 | 莫蒂默主动照料增加 | 0–100；不自然衰减 |

### 时间补算

- 使用三个独立时间戳：`lastHungerAt`、`lastEnergyAt`、`lastCleanlinessAt`。不要让三种状态共用一个 `lastDecayAt`，否则每小时打开网页会把不足两小时的清洁度衰减余数丢掉。
- 每次进入宠物页、点击照料动作或页面恢复可见时调用 `syncTamagotchi(now)`。
- 饱腹度：每完整经过 1 小时减少 2；将 `lastHungerAt` 推进到已结算的完整小时边界。
- 精力：每完整经过 1 小时减少 1；使用自己的时间戳。
- 清洁度：每完整经过 2 小时减少 1；使用自己的时间戳，保留不足两小时的余数。
- 状态最低为 0，最高为 100；离线再久也不产生负数。
- 网页关闭时不模拟定时器、不逐小时写入事件；下次打开时按时间戳一次性补算。不能为离线的每个小时生成照料记录。

### 心情优先级

每次同步状态后按优先级计算，不靠散落在各按钮里的赋值互相覆盖：

1. `restUntil > now` → `sleepy`。
2. `energy <= 15` 或 `hunger <= 15` → `sad`。
3. `foodMoodUntil > now` 且状态未触底 → 根据 `foodMoodSource` 保留食物偏好带来的短暂愉快反应；最喜欢食物 60 分钟、普通喜欢食物 30 分钟。
4. 最近一次正向互动发生在 30 分钟内，且状态未触底 → 保留短暂 `happy`，到期后重新计算。
5. `energy <= 30` 或 `hunger <= 30` 或 `cleanliness <= 30` → `sleepy` / `sad`（优先精力低则 `sleepy`，否则 `sad`）。
6. 其他情况 → `curious`。

没有死亡机制；数值处于 0 时只展示需要照顾的状态提示，及时照料即可恢复。

## 模块 3｜喂食

- 动作 ID：`feed`；仅孵化后可用。
- 冷却：**4 小时**。
- 条件：不在休息；`hunger < 90`；冷却结束。
- 成功变化：`hunger = min(100, hunger + 30)`，记录 `lastActions.feed=now`，播放低头啄食 2–3 帧、出现小食物/闪光，结束后回到待机循环。
- 普通喂食的关系奖励：每个本地自然日最多 **3 次有效亲密度奖励**。每次获得奖励时共同亲密度 `bond +1`、薇薇亲密度 `viviBond +1`；达到当日次数上限后仍可喂食、增加饱腹度、播放动画并出现食物反应，但不再获得这项关系奖励。
- “每日 3 次”限制的是亲密度奖励，不是喂食次数。喂食本身仍受 4 小时冷却与 `hunger < 90` 条件限制。
- 只有真正发放普通喂食亲密度奖励时，才增加 `dailyAffinityFeedingCount`；如果因每日关系总上限而未发放奖励，不消耗这 3 次名额。动画重播、重复渲染和重复调用收藏检查都不能重复发奖。
- 首次成功喂食仍解锁“第一顿小饭”，不受当日亲密度奖励额度影响。
- 阻止时提示：饱腹度 ≥90% 时显示“小肚子已经很满足啦”；冷却中显示剩余时间；休息中显示“等小鸡醒来再吃吧”。

### 固定食物偏好（仅一只小鸡）

本项目只有薇薇和莫蒂默共同养育的这一只小鸡。食物偏好写成单只小鸡的固定配置，不建立 `chicks[]` 多宠物数组，不提供新增/切换小鸡功能，也不需要按个体保存偏好。

| 偏好类别 | 固定食物 | 表现规则 |
|---|---|---|
| 最喜欢（1 种） | 小米 | 最明显的开心表情、积极啄食动作、特殊喜欢台词；心情加成持续 60 分钟 |
| 普通喜欢（2 种） | 玉米粒、燕麦碎 | 愉快表情、普通积极台词；心情加成持续 30 分钟 |
| 不太喜欢（1 种） | 绿叶菜 | 犹豫、歪头或轻轻推开食物的动画与台词；不扣健康、不降低亲密度 |
| 其他食物 | 未列入以上偏好的食物 | 正常进食、使用基础动画和普通台词，不额外加成 |

- 偏好只影响 `mood` 的短暂表现、进食动作和台词，不影响健康，不设计营养配比，也不额外提供额外关系奖励。心情持续时间通过 `foodMoodUntil` 与 `foodMoodSource` 保存；结束后由统一的 `resolveMood(now)` 重新计算，不允许动画结束回调直接覆盖状态。
- 食物偏好表现不能绕过普通喂食每日最多 3 次的亲密度奖励上限；即使最喜欢的食物触发特殊动画，也只结算一次喂食动作。
- 建议前端固定配置为 `CHICK_FOOD_PREFERENCES` 常量，而不是可编辑的多宠物数据：`favorite: "millet"`、`liked: ["corn", "oats"]`、`disliked: "greens"`。

## 模块 4｜照料、清洁、休息与陪玩

### 摸摸 `pet`

- 冷却：**2 小时**。
- 条件：已孵化、不在休息、冷却结束。
- 变化：共同亲密度 +1；`viviBond +1`；心情短暂 `happy`。
- 动画：眨眼/微微低头，出现小爱心。不能只因触摸动画帧而加亲密度，必须由一次有效动作统一处理。

### 陪玩 `play`

- 冷却：**6 小时**。
- 条件：已孵化、不在休息、`energy > 30`、冷却结束。
- 变化：`energy -18`、`hunger -5`、共同亲密度 +2、`viviBond +2`；心情短暂 `happy`。
- 动画：小鸡短距离往返、轻跳或出现音符；结束后回归自然待机。
- 低精力时禁用陪玩，提示“先休息一会儿，等有精神再玩”。

### 整理小窝 `clean`

- 条件：已孵化、不在休息、`cleanliness <= 30`。
- 冷却：**无固定冷却**，但整洁度高于 30 时不允许重复整理。
- 变化：`cleanliness = 100`，心情回到 `curious`；首次成功整理解锁“整洁小窝”。
- 动画：扫帚/闪光反馈。整洁度由时间慢慢下降，不按每次页面刷新下降。

### 休息 `rest`

- 条件：已孵化、`energy <= 30`、当前没有正在进行的休息。
- 时长：**30 分钟**。
- 休息期间：禁用喂食、摸摸、陪玩、清洁；允许关闭页面，不要求一直在线。
- 到期变化：`energy = min(100, energy + 35)`，清空 `restUntil`，心情重新计算，记录一次“休息结束”。
- 首次完成休息解锁“暖炉边的小憩”。不能在开始休息的瞬间就解锁，必须等到休息计时结束。

## 模块 5｜亲密度机制

共同亲密度代表薇薇、莫蒂默与小鸡共同生活的情感积累；`viviBond` 和 `mortimerBond` 分开记账。亲密度不会随时间衰减，不会因为离线、低饱腹度或忘记清洁而倒扣。

| 有效事件 | 共同亲密度 | 薇薇亲密度 | 莫蒂默亲密度 |
|---|---:|---:|---:|
| 薇薇给蛋窝保暖 | +1 | +1 | 0 |
| 普通喂食（每日最多 3 次有效奖励） | +1 | +1 | 0 |
| 薇薇摸摸 | +1 | +1 | 0 |
| 薇薇陪玩 | +2 | +2 | 0 |
| 莫蒂默完成一次主动照料 | +1 | 0 | +1 |
| 孵化、阶段成长等首次纪念事件 | 按事件表发放一次性 +2～+5 | 0 | 0 |

- 所有值 `min(100, current + gain)`，不超过 100。
- 只有动作通过 `canAct` 校验并真正执行后才能加亲密度；按钮渲染、动画播放、重新打开弹窗都不得加分。
- 普通喂食每日亲密度奖励次数单独限制为 **3 次**，通过 `feedingAffinityDate` 与 `dailyAffinityFeedingCount` 记录；日期按设备本地自然日计算，跨日后次数归零，但不改变累计亲密度。
- 建议设置软性日上限：一般互动对共同亲密度最多贡献 **8 点/自然日**，薇薇亲密度最多 **5 点/自然日**；超过上限动作仍可执行、记录仍生成，只是不再加关系分。只有实际发放普通喂食亲密度时，才消耗喂食奖励次数。莫蒂默的主动照料单独计分，不受薇薇上限影响。
- 成长奖励与收藏解锁只发一次，用 `seenEvents` 或唯一收藏 ID 去重。
- 亲密度阶段：0–19 初识；20–39 熟悉；40–59 依恋；60–79 默契；80–100 家人。阶段只解锁表现、台词或装扮，不提高状态消耗，不制造新压力。

## 模块 6｜莫蒂默的本地模拟照料（V1.2）

### 总体原则

- 莫蒂默是薇薇和小鸡的共同饲养者，不是自动执行所有任务的机器人。
- 所有行为由本地规则、当前状态判断和预设字卡随机决定，不使用实时 AI，也不声称由实时 AI 生成。
- 正式照料必须有实际数值效果或明确的照料目的；日常小动作只营造生活感，不计作正式照料，也不增加亲密度。
- 每条文案必须与小鸡的真实状态、实际执行动作一致。小鸡正在休息时不能陪玩；喂食冷却未结束或饱腹度达到上限时，不能显示“已经喂好”或直接改高饱腹度。
- 莫蒂默不得绕过现有的喂食冷却、休息机制、状态上下限或亲密度规则，也不能替薇薇完成所有养成操作。
- 莫蒂默的表达细心、克制、自然；不反复告白、夸张赞美或用机械式关心刷屏。

### 正式照料时间规则

- 普通正式照料间隔为随机 **2.5–5 小时**。正式照料完成后生成并保存 `nextMortimerCareAt`；一旦生成，不能因为刷新、重开面板或重复渲染而重新抽取。
- 若饱腹度 `hunger <= 35`、精力 `energy <= 25` 或整洁度 `cleanliness <= 35`，可以提前安排紧急照料，计划时间为 `lastMortimerCareAt` 后随机 **1.5–2.5 小时**，但两次正式照料的绝对最短间隔必须为 **90 分钟**。
- 紧急条件首次满足时才重新评估并保存更早的计划时间；若已有更早计划，不要重抽。使用 `urgentCareScheduled` 防止每次同步重复重排。正式照料完成后重置该标记，让下一轮可以重新评估紧急状态。
- 若正式照料时间已到，但小鸡正在睡觉、处于 `restUntil > now` 的休息状态或其他不适合互动的状态，不执行正式照料；改为执行不打扰它的观察类氛围事件，或将正式照料推迟 **30–60 分钟**并保存新的 `nextMortimerCareAt`。不能让每次打开页面都重复触发或不断重抽延迟。
- 孵化前只允许执行原有的蛋窝保暖互动；禁止执行喂食、陪玩、清洁小鸡、摸摸或成长阶段照料。
- 网页关闭期间没有后台任务。只在进入/恢复宠物页面或状态同步时检查；每次状态同步最多执行一次正式照料。离线数日也不能补刷多次过期事件。
- 若 `nextMortimerCareAt` 缺失，只在存档迁移时生成并保存一次计划时间。若已有 `lastMortimerCareAt`，用该时间为基准安排随机间隔；若从未正式照料，则在孵化后安排首次随机等待时间，不要在蛋阶段执行。

### 正式照料优先级与实际效果

一次正式照料只选择一个事件，按以下顺序匹配；执行前必须再次检查冷却、休息状态和数值上限。

1. **饥饿优先**：若 `hunger <= 60` 且普通喂食冷却已结束，莫蒂默可以添粮，`hunger = min(100, hunger + 25)`。若喂食冷却尚未结束，不得绕过冷却加数值；改为检查食盆、准备下一餐或安静陪伴，这些只属于氛围事件，不增加亲密度。
2. **小窝整洁**：若 `cleanliness <= 50`，莫蒂默可以整理小窝，`cleanliness = min(100, cleanliness + 30)`。如果小鸡正在睡觉或休息，不得打扰它；应改为整理窝边、不触碰小鸡的氛围动作，或推迟正式照料。
3. **精力与休息**：若 `energy <= 40` 且没有正在休息，可进行安静陪伴。只有 `31 <= energy <= 40` 时，正式照料才可令 `energy = min(100, energy + 20)`。若 `energy <= 30`，必须遵守原有休息机制，不得直接加精力绕过 `rest`；莫蒂默可以在旁边守着，或在状态允许时安排原有的休息流程，但不能强行结束睡眠。
4. **普通陪伴**：以上需求均不满足时，莫蒂默可以进行一次普通陪伴，令心情短暂变为 `happy`，不改变饱腹度、精力和整洁度。

如果优先级命中的动作因冷却或状态限制不能执行，不得宣称该动作已完成；可以改为符合当前状态的无数值氛围事件，或将正式照料延后。正式照料只有在实际执行了规则允许的状态变化/照料效果后才算完成并计入次数；纯观察、准备或轻微整理摆件不算正式照料。

### 正式照料亲密度与记录

- 每次成功完成正式照料后，共同亲密度 `bond +1`，莫蒂默亲密度 `mortimerBond +1`；都使用 `min(100, value + 1)`。
- 正式照料不增加薇薇亲密度 `viviBond`，不另叠加新的每日亲密度上限；沿用当前正式照料规则。普通喂食自身的每日最多 3 次亲密度奖励限制只约束普通喂食，不约束莫蒂默正式照料。
- 氛围事件不增加任何亲密度，不修改饱腹度、精力或整洁度。
- 每次正式照料必须生成一条记录，至少包含 `id`、`at`、`actor: "莫蒂默"`、`actionId`、`title`、`reaction`、`detail`。`detail` 必须如实描述数值变化或说明实际结果。
- 同一个事件 ID 不能重复写入记录、重复增加亲密度或重复推进收藏计数。正式照料成功后更新 `lastMortimerCareAt = now`、增加持久化字段 `mortimerCareCount`，安排下一次随机时间，并保存状态。
- 如果正式照料没有产生有效的规则内照料结果，就不能增加亲密度或 `mortimerCareCount`，也不能推进“莫蒂默的蓝丝带”收藏进度。

### 日常小动作（氛围事件）

- 日常小动作与正式照料独立计时。两次氛围事件之间至少间隔 **30 分钟**；在宠物页面打开、场景合适且满足间隔时，每次场景检查可按 **25%–35%** 的概率触发。
- 触发后保存 `lastAmbientActionAt`，仅更新当前短句或播放轻微场景动画；不改变饱腹度、精力、整洁度、任何亲密度，也不计入正式照料次数与收藏进度。
- 氛围事件不必写入正式照料记录，可使用单独的短暂提示。不得因页面重渲染重复播放同一事件；页面隐藏、关闭或切换模块时停止动画循环。
- 小鸡正在睡觉/休息时，只能使用安静观察、不触碰小鸡、不打扰它的氛围事件。

#### 日常小动作字卡分类

**观察类**

- 莫蒂默在小鸡旁边停留了一会儿
- 莫蒂默发现小鸡今天格外喜欢待在窝边
- 莫蒂默安静地看着小鸡四处张望
- 莫蒂默注意到小鸡走路比昨天稳当了一些
- 莫蒂默发现小鸡对窗外的雪很感兴趣

**整理类**

- 莫蒂默把歪掉的小垫子摆回了原位
- 莫蒂默把散落的稻草轻轻收拢
- 莫蒂默将小鸡的玩具放回了原处
- 莫蒂默把窝边的小物件整理得整整齐齐
- 莫蒂默确认暖炉旁的小窝仍然暖和

**陪伴类**

- 小鸡在附近踱步，莫蒂默便放慢了脚步
- 莫蒂默陪小鸡看了一会儿窗外的雪
- 小鸡对着自己的影子看了好一会儿
- 莫蒂默没有打扰小鸡，只是安静地陪在旁边
- 小鸡绕了一圈，又回到了熟悉的位置

**观察到需求类**

- 莫蒂默发现食盆快空了，便记下了下一次添粮的时间
- 莫蒂默注意到小鸡开始犯困，便没有再拿玩具逗它
- 莫蒂默发现窝边有些凌乱，打算等小鸡醒来后再整理
- 莫蒂默注意到小鸡今天安静了许多
- 莫蒂默把小鸡最近喜欢的玩具放在了容易找到的位置

这些字卡只描述观察、打算或无数值的小动作。若文案声称“已经喂食”“已经恢复精力”“已经清理小窝”，必须确认对应正式动作确实成功执行。

### 收藏联动

- 保留收藏 `mortimer-care`（莫蒂默的蓝丝带）。莫蒂默累计完成 **3 次正式照料**时解锁；日常小动作不计数。
- 收藏通过现有 `unlockOnce(id)` 解锁，只能发放一次。解锁进度使用持久化的 `mortimerCareCount`，不能通过遍历最多只保留 120 条的照料记录来反推次数；旧日志被清理后收藏状态仍需保留。
- 收藏不能依赖限时随机事件，也不能因薇薇离线而永久错过。若三次正式照料都已完成但收藏尚未解锁，应在下一次状态同步时补做一次幂等检查。

### 莫蒂默的性格表现规则

- 温柔主要通过行动体现，不是每次都用语言表达。
- 细心、有耐心、有条理，但不会过度紧张，也不会把小鸡当成时时需要监控的对象。
- 不因小鸡调皮、弄乱小窝或不愿互动而生气或责备它。
- 不每次出现都重复同一动作或相同句式；随机选择必须服从状态与场景条件，而不是为了制造随机性让角色做出不合适的事。
- 小鸡可以不积极回应：继续玩、困倦、观察周围，或安静待着都合理。
- 尊重小鸡当前状态。小鸡困倦时不强行陪玩，不愿靠近时不强行抱起。
- 偶尔允许轻微生活小意外，例如刚收好的稻草又被小鸡扒乱；仅作为氛围字卡，不改变核心数值。

## 模块 7｜小鸡收藏柜与解锁条件

收藏采用永久解锁、一次触发、不会错过的机制。存储唯一 ID，而不是只存显示名称，方便以后更名或翻译。

| ID | 展示名称 | 解锁条件 | 发放时机 |
|---|---|---|---|
| `first-feather` | 初次见面纪念羽毛 | 蛋第一次孵化成功 | `hatch` 事件 |
| `first-meal` | 第一顿小饭 | 第一次成功喂食 | `feed` 成功后 |
| `snow-footprints` | 窗边的小脚印 | 孵化后第一次完成自动散步 | 行走循环首次正常结束 |
| `tidy-nest` | 整洁小窝 | 第一次成功整理小窝 | `clean` 成功后 |
| `fireplace-nap` | 暖炉边的小憩 | 第一次完整结束 30 分钟休息 | `rest` 到期后 |
| `mortimer-care` | 莫蒂默的蓝丝带 | 莫蒂默累计完成 3 次主动照料 | 第 3 次 `mortimerCare` 事件 |
| `growing-portrait` | 长大一点点 | 首次从幼雏期进入成长期 | 阶段转变事件 |
| `grown-feather` | 成长纪念羽毛 | 首次进入成熟期 | 阶段转变事件 |
| `shared-heart` | 我们的雪花玻璃球 | 共同亲密度首次达到 60 | 分数跨过 60 时 |
| `winter-family` | 冬日一家三口 | 已成熟且共同亲密度 ≥80 | 条件首次满足时 |

- 收藏解锁统一使用 `unlockOnce(id)`：未解锁才写入收藏并产生一次事件；已解锁则什么都不做。
- 收藏的触发检查要在状态同步、动作成功、成长阶段变化后各执行一次；重复调用不得重复奖励。
- 尚未解锁的收藏可以显示灰色剪影与条件文字，不要显示为已拥有。
- 不设随机限时收藏、不因错过某一天而永久失去内容。

## 模块 8｜照顾记录与装扮

### 照顾记录

- 每条记录字段：`id`、`at`（毫秒时间戳）、`actor`、`actionId`、`title`、`reaction`、`detail`。
- 至少记录：保暖、孵化、喂食、摸摸、陪玩、清洁、休息开始、休息结束、莫蒂默主动照料、成长阶段转变、收藏解锁。
- 最新记录放最前面；最多保存最近 **120 条**。收藏解锁状态不依赖记录条数，清理旧日志不会回锁收藏。
- 不把页面打开、面板渲染、动画每一帧写入记录，避免记录噪声。

### 装扮

- 默认外观：`classic-yellow`（经典黄绒）。
- `dress` 模块只显示已解锁外观；没有实际解锁时不能让装扮按钮假装已拥有。
- 建议后续装扮解锁：`blue-ribbon`（莫蒂默的蓝丝带，解锁 `mortimer-care` 后）；`snowflake-pin`（雪花胸针，共同亲密度 ≥40）；`winter-scarf`（冬日围巾，进入成熟期且共同亲密度 ≥60）。
- 装扮只改外观，不改变状态消耗、孵化时间或照料强度。

---

## 前端数据结构建议

```js
const defaultTamaState = {
  schemaVersion: 3,
  stage: "egg",
  eggStartedAt: Date.now(),
  hatchedAt: null,
  hatchCare: 0,
  hatchProgress: 0,
  day: 1,
  hunger: 72,
  energy: 82,
  cleanliness: 90,
  mood: "curious",
  foodMoodUntil: 0,
  foodMoodSource: "",
  bond: 0,
  viviBond: 0,
  mortimerBond: 0,
  lastHungerAt: Date.now(),
  lastEnergyAt: Date.now(),
  lastCleanlinessAt: Date.now(),
  lastMortimerCareAt: 0,
  nextMortimerCareAt: null,
  mortimerCareCount: 0,
  urgentCareScheduled: false,
  lastAmbientActionAt: 0,
  lastActions: {},
  restUntil: 0,
  dailyBond: { dateKey: "", shared: 0, vivi: 0 },
  feedingAffinityDate: "",
  dailyAffinityFeedingCount: 0,
  records: [],
  unlocked: [],
  seenEvents: [],
  outfitId: "classic-yellow"
};
```

旧数据迁移：读取旧字段 `hatchStartedAt` 作为 `eggStartedAt` 的后备值；若 `stage !== 'egg'` 且缺少 `hatchedAt`，用可迁移的 `hatchedAt`，没有时退回到 `lastOpenedAt` 或当前时间，并只迁移一次。已有 `bond`、状态值、记录和 `unlocked` 必须保留。

- 旧版 `lastMortimerCareAt` 保留；首次迁移时，若没有 `nextMortimerCareAt`，根据 `lastMortimerCareAt` 安排一个随机的 2.5–5 小时到期时间，不能继续硬性沿用 8 小时固定间隔。若从未发生过莫蒂默照料，则孵化后首次安排随机等待时间。将旧存档中可确认的正式照料数量迁移到 `mortimerCareCount`；若无法可靠统计，不得因为日志裁剪而臆造次数，应以已有持久化计数或已解锁收藏状态作为迁移依据。
- 迁移每日喂食奖励字段时，将 `feedingAffinityDate` 初始化为空字符串、`dailyAffinityFeedingCount` 初始化为 0；若旧数据中不存在食物偏好配置，直接使用固定常量，不创建多小鸡偏好数组。

## 可交给前端实现的伪代码

```js
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

function syncTamagotchi(now = Date.now()) {
  const s = tamaState;
  applyHourlyDecay("hunger", "lastHungerAt", 2, HOUR, now);
  applyHourlyDecay("energy", "lastEnergyAt", 1, HOUR, now);
  applyHourlyDecay("cleanliness", "lastCleanlinessAt", 1, 2 * HOUR, now);

  if (s.stage === "egg") {
    const elapsed = Math.max(0, now - s.eggStartedAt);
    s.hatchProgress = clamp(elapsed / DAY * 100 + Math.min(45, s.hatchCare * 15));
    if (s.hatchProgress >= 100) hatchOnce(now);
  } else {
    const age = Math.max(0, now - s.hatchedAt);
    const nextStage = age < 3 * DAY ? "chick" : age < 7 * DAY ? "growing" : "grown";
    if (nextStage !== s.stage) changeStageOnce(nextStage, now);
  }

  if (s.restUntil && now >= s.restUntil) finishRestOnce(now);
  if (s.stage !== "egg") {
    ensureMortimerSchedule(now); // 只在没有已保存的计划时生成普通随机时间
    maybeRescheduleUrgentCare(now); // 状态紧急时提前计划，计划一旦生成就持久化
    if (Number(s.nextMortimerCareAt) > 0 && now >= s.nextMortimerCareAt && now - s.lastMortimerCareAt >= 90 * 60 * 1000) {
      if (isChickAsleepOrResting(now)) {
        // 不打扰小鸡：只允许安静观察氛围事件，或推迟 30–60 分钟并立即保存新计划。
        s.nextMortimerCareAt = now + randomBetween(30 * 60 * 1000, 60 * 60 * 1000);
        saveTamaState();
        maybePlayAmbientAction(now, { quietOnly: true });
      } else {
        mortimerCareOnce(now); // 只有实际完成正式照料时才加亲密度/计数；函数内保存下一次时间
        maybePlayAmbientAction(now); // 正式照料与氛围事件分别检查，不共享奖励
      }
    } else {
      maybePlayAmbientAction(now); // 仅是轻微动作，不改状态、不加亲密度
    }
  }
  resolveMood(now);
  checkCollectionUnlocks(now);
  s.day = Math.floor((now - s.eggStartedAt) / DAY) + 1;
  saveTamaState();
  renderTamaScene();
}

function canAct(action, now = Date.now()) {
  syncTimestampsWithoutRecursion(now); // 更新状态，但不再次触发动作
  if (tamaState.stage === "egg") return action === "warm" && cooldownReady("warm", 6 * HOUR, now);
  if (tamaState.restUntil > now) return false;
  if (action === "feed") return cooldownReady("feed", 4 * HOUR, now) && tamaState.hunger < 90;
  if (action === "pet") return cooldownReady("pet", 2 * HOUR, now);
  if (action === "play") return cooldownReady("play", 6 * HOUR, now) && tamaState.energy > 30;
  if (action === "rest") return tamaState.energy <= 30;
  if (action === "clean") return tamaState.cleanliness <= 30;
  return false;
}

function settleFeedAffinity(now = Date.now()) {
  const s = tamaState;
  const dateKey = localDateKey(now); // 使用设备本地自然日，例如 YYYY-MM-DD
  if (s.feedingAffinityDate !== dateKey) {
    s.feedingAffinityDate = dateKey;
    s.dailyAffinityFeedingCount = 0;
  }

  // 偏好反应始终可播放，但不直接增加亲密度。
  // 只有动作成功且总亲密度日上限允许时，才发放喂食关系奖励。
  if (s.dailyAffinityFeedingCount >= 3) return false;
  if (!canGrantDailyBond("shared", 1, now) || !canGrantDailyBond("vivi", 1, now)) return false;

  addBond("shared", 1, now);
  addBond("vivi", 1, now);
  s.dailyAffinityFeedingCount += 1;
  return true;
}

function ensureMortimerSchedule(now = Date.now()) {
  if (Number(tamaState.nextMortimerCareAt) > 0) return;
  const base = Number(tamaState.lastMortimerCareAt) || now;
  const delay = randomBetween(2.5 * HOUR, 5 * HOUR);
  // 如果旧版存档已经逾期，保留其“到期”状态；同步时仍只执行一次。
  tamaState.nextMortimerCareAt = base + delay;
  tamaState.urgentCareScheduled = false;
}

function isMortimerCareUrgent() {
  const s = tamaState;
  return s.hunger <= 35 || s.energy <= 25 || s.cleanliness <= 35;
}

function maybeRescheduleUrgentCare(now = Date.now()) {
  const s = tamaState;
  if (!isMortimerCareUrgent() || s.urgentCareScheduled) return;
  const last = Number(s.lastMortimerCareAt) || now;
  const minDue = last + 90 * 60 * 1000;
  const urgentDue = last + randomBetween(1.5 * HOUR, 2.5 * HOUR);
  const candidate = Math.max(minDue, urgentDue);
  const current = Number(s.nextMortimerCareAt) || Infinity;
  // 紧急状态首次发现时只抽一次。即使候选时间没有比原计划更早，也要锁定本次判断，避免刷新后反复重抽。
  if (candidate < current) s.nextMortimerCareAt = candidate;
  s.urgentCareScheduled = true;
  saveTamaState();
}

function scheduleNextMortimerCare(now = Date.now()) {
  // 每次正式照料完成后先生成普通计划；之后若持续处于紧急状态，下一次同步可将计划提前一次。
  tamaState.lastMortimerCareAt = now;
  tamaState.nextMortimerCareAt = now + randomBetween(2.5 * HOUR, 5 * HOUR);
  tamaState.urgentCareScheduled = false;
  saveTamaState();
}

function isChickAsleepOrResting(now = Date.now()) {
  // 若项目有独立的 sleeping 状态，应一并检查；restUntil 是现有的确定性休息状态。
  return Number(tamaState.restUntil) > now || tamaState.activityState === "sleeping";
}

function mortimerCareOnce(now = Date.now()) {
  // 该函数内部按状态优先级选取一个有效动作，执行前复核冷却与状态约束。
  // 若无实际效果，只播放氛围动作，不调用本函数的成功结算路径。
  const result = chooseAndApplyOneValidMortimerCare(now);
  if (!result?.performed) {
    // 没有可合法执行的正式动作：不加亲密度、不计次数、不解锁收藏；保存延后时间，避免每次同步立即重试。
    tamaState.nextMortimerCareAt = now + randomBetween(30 * 60 * 1000, 60 * 60 * 1000);
    saveTamaState();
    return false;
  }
  const eventId = `mortimer-care:${now}:${result.actionId}`;
  if (tamaState.seenEvents.includes(eventId)) return false;
  tamaState.seenEvents.push(eventId);
  tamaState.bond = clamp(tamaState.bond + 1);
  tamaState.mortimerBond = clamp(tamaState.mortimerBond + 1);
  tamaState.mortimerCareCount = Number(tamaState.mortimerCareCount || 0) + 1;
  // 正式记录使用规范字段，不以动画帧或页面渲染作为事件。
  tamaState.records.unshift({
    id: eventId, at: now, actor: "莫蒂默", actionId: result.actionId,
    title: result.title, reaction: result.reaction, detail: result.detail
  });
  tamaState.records = tamaState.records.slice(0, 120);
  tamaState.lastMortimerCareAt = now;
  scheduleNextMortimerCare(now);
  if (tamaState.mortimerCareCount >= 3) unlockOnce("mortimer-care");
  saveTamaState();
  return true;
}

function unlockOnce(id) {
  if (tamaState.unlocked.includes(id)) return false;
  tamaState.unlocked.push(id);
  tamaState.seenEvents.push(`unlock:${id}`);
  recordEvent({ actor: "系统", actionId: "collection-unlock", detail: id });
  return true;
}
```

`applyHourlyDecay` 需要按各状态的独立时间戳结算完整周期，并将时间戳推进 `floor((now - lastAt) / interval) * interval`；不要简单地将时间戳改为 `now`，否则零头时间会丢失。`randomBetween(min, max)` 必须返回指定区间内的毫秒数；随机生成的 `nextMortimerCareAt` 一经保存，页面刷新时不得重新生成。`CHICK_FOOD_PREFERENCES` 是单只小鸡的固定常量，不是从状态数组里按鸡 ID 查找。

## 必须遵守的实现顺序

1. 动作触发 → 先 `syncTamagotchi(now)`。
2. `canAct(action)` 二次校验；无效动作不改状态、不加亲密度、不生成成功记录。
3. 应用状态变化与冷却时间戳。
4. 发放亲密度（含每日上限）。
5. 检查阶段与收藏的一次性事件。
6. 生成一条动作记录并持久化。
7. 更新场景、按钮可用状态、进度条与动画。

## 前端验收清单

- [ ] 连续点喂食不能绕过 4 小时冷却；饱腹度达到 90% 时禁用喂食。
- [ ] 每小时重新打开网页，清洁度仍会按真实的每 2 小时规则正确下降。
- [ ] 关闭网页 2 天后再开，只补算状态，不产生 48 条自动照料记录。
- [ ] 蛋在孵化成功后立即隐藏，关闭并重开仍只显示小鸡。
- [ ] 成长阶段依据 `hatchedAt`，频繁刷新不会加速成长。
- [ ] 休息 30 分钟后只恢复一次 +35 精力，不重复发放记录或收藏。
- [ ] 莫蒂默普通正式照料间隔为随机 2.5–5 小时；状态紧急时可提前至距离上次照料 1.5–2.5 小时，但绝不短于 90 分钟。
- [ ] 莫蒂默的下次照料时间会持久化；刷新页面不会重新抽取时间，也不会累积离线任务。
- [ ] 页面打开期间的日常小动作至少相隔 30 分钟，且不会改变状态值或亲密度。
- [ ] 普通喂食每天最多发放 3 次亲密度奖励；超出后仍可喂食和播放动画。
- [ ] 单只小鸡的固定食物偏好只影响动作、心情和台词，不影响健康，也不绕过亲密度上限。
- [ ] 每个收藏 ID 只能解锁一次；清理日志不会移除收藏。
- [ ] 页面隐藏或关闭时动画循环停止；状态时间继续按真实时间计算。
- [ ] 0–100 的状态和亲密度都不会越界，离线不会导致死亡或永久损失。


---

## V1.2 变更记录

- 保留 V1.1 的随机正式照料间隔、紧急提前规则、亲密度奖励和八模块结构，不新增“每日 45% 触发”或“每天最多一次”的随机门槛。
- 明确区分正式照料与日常氛围事件：正式照料可实际改变状态并增加共同/莫蒂默亲密度；氛围事件不改状态、不加亲密度、不计收藏次数。
- 增加正式照料事件字段、照料计数持久化、睡眠/休息时的延后规则、氛围字卡分类和莫蒂默性格边界。
- `mortimer-care` 收藏以持久化正式照料计数为依据，累计 3 次正式照料后通过 `unlockOnce` 解锁。
