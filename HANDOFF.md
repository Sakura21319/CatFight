# 基米斗－哈基米模拟器：项目交接文档

更新时间：2026-09-13  
项目目录：`D:\WorkSpace\CatFight`  
技术栈：Cocos Creator 3.8.8、TypeScript、横屏 1280×720  
微信小游戏 AppID：`wxb87c005c1c0b8106`

## 1. 当前产品状态

```text
主页
├─ 闯关模式 → 直接进入第一关“哈基米过马路”
├─ 画廊 → 猫咪放置与动作演示
└─ 设置 → 声音开关、返回首页

第一关通关弹窗 → 下一关 → 后续关卡页
                         ├─ 第二关（预留）
                         └─ 第三关（预留）
```

旧第二关实现仍在 `CatGarden.ts` 中，但当前没有正式入口；产品状态应视为第一关可玩、第二和第三关仅预留。

主页固定使用 `assets/bundles/menu-pack/main-cover-final.png`。这是用户明确指定的最终封面，后续不要重新生成、替换或修改。封面上的三个视觉按钮覆盖了完整透明点击区域，整块按钮均可点击。

## 2. 第一关玩法

- 橘猫从最左侧 `x = -10.90` 出发，到达最右侧 `x >= 10.60` 通关。
- 只允许左右移动；手机使用左下圆形街机摇杆，键盘使用 `A/D` 或左右方向键。
- 第一关缩放固定；滚轮和双指缩放仅在画廊生效。
- 五条垂直车道，每条两辆车，出生位置错开；轿车比卡车快，卡车更大，均按行驶方向显示车头或车尾。
- 猫进入道路后会主动钻向车辆。吸附时，画面上方显示代码绘制的黄色提示：`⚠ 检测到轮胎  自动吸附 ⚠`。
- 猫移动时有起伏和摆动；哈气为闭嘴、张嘴、闭嘴循环。

两条通关路径：

1. 抵抗本能，直接走到右侧。
2. 地图有 6 个不规则坑洞。撞车后停留 1 秒展示受撞表情，再显示 `哈基米被自动吸附了`。选择“继续”后用黄色猫饼填一个坑，并从最左侧重开；连续挑战期间保留已填状态。最后一个坑填满时只弹一次 `世界破破烂烂，基米缝缝补补`。

退出第一关或完成通关后才清除本轮坑洞状态。

右上角蜂蜜饮料是一次性冲刺道具。使用后变为面向右侧的白猫，循环播放 `haki-rush-run-approved.png` 的三帧奔跑动画，后腿向后抬起约 90°。白猫自动冲向右侧，碰到车辆会将其短暂压扁并清除，到达终点弹出“返回上一级 / 下一关”。

## 3. 画廊与设置

画廊保留 3D 庭院、白笼、九种猫、随机体型与花纹、放置猫、旋转/缩放视角，以及对峙、缠斗、人皇步、飞扑、口香糖回血、老吴撼地掌等演示逻辑。已去掉“看猫脸”“双猫演示”“三猫演示”“向左/向右转”“已选”“数量”等冗余描述或入口，剩余操作按移动端菜单和子菜单组织。

设置页使用独立深色背景，不显示画廊场地。选项为亮色单行文字，目前包含声音开关和返回首页。声音默认关闭；开启后，场上没有猫时音乐和音效仍停止。

## 4. 关键文件

| 文件 | 作用 |
| --- | --- |
| `assets/scripts/CatGarden.ts` | 主菜单、模式、画廊、第一关、UI、车辆和碰撞总调度 |
| `assets/scripts/GardenAudio.ts` | 从 `audio-pack` 动态加载和播放音频 |
| `assets/scripts/AudioPolicy.ts` | 声音开关与“无猫不播放”规则 |
| `assets/scripts/VoxelCat.ts` | 3D 方块猫骨架、姿势和动作 |
| `assets/scripts/CatBreeds.ts` | 品种、体型和随机花纹 |
| `assets/scripts/CatEnvironment.ts` | 画廊庭院与白笼 |
| `wechat-build-config.json` | 微信横屏、AppID、Asset Bundle 构建配置 |
| `tools/build-wechat.ps1` | 微信一键构建及分包后处理 |
| `tools/postprocess-wechat-subpackages.mjs` | 移动 Bundle 并更新微信分包配置 |

主场景：`assets/scenes/Main.scene`。

## 5. 资源分包

运行时资源已拆分为 Asset Bundle：

| Bundle | 内容 | 当前大小 |
| --- | --- | ---: |
| `menu-pack` | 固定主页封面 | 2.804 MB |
| `road-scene` | 马路和斑马线 | 1.728 MB |
| `road-cars` | 轿车、卡车精灵表 | 3.806 MB |
| `road-cat` | 橘猫状态、蜂蜜、白猫三帧 | 4.272 MB |
| `gallery-pack` | 画廊 UI 图集 | 0.883 MB |
| `audio-pack` | 音乐和音效 | 3.209 MB |

Cocos 生成的 `internal`、`main` 也作为分包。当前微信构建：主包约 3.723 MB，总体约 21.991 MB；`game.json` 已登记全部 8 个分包并锁定 `landscape`。

`assets/archive/unused-resources` 保存停用旧素材，仅作备份，不参与构建。不要无意中移回 Bundle。

## 6. 构建和验证

微信小游戏推荐只用以下命令：

```powershell
powershell -ExecutionPolicy Bypass -File D:\WorkSpace\CatFight\tools\build-wechat.ps1
```

脚本依次执行 Cocos 构建、成功标记检查和分包后处理。完成后，在微信开发者工具中导入：

```text
D:\WorkSpace\CatFight\build\wechatgame
```

必须导入这一层，因为 `game.json` 位于其根部。不要导入项目根目录或 `subpackages`。不要绕过脚本直接发布普通 Cocos 构建；六个自定义 Bundle 仍依赖后处理移动到微信分包。

Web Mobile 原始输出为 `build/web-mobile`。为避免缓存，每次交付应复制为新的时间戳目录。最近可用入口：

```text
D:\WorkSpace\CatFight\build\web-mobile-test-20260913-090245\index.html
```

不要直接修改 `build` 产物，应修改源码后重建。

验证命令：

```powershell
node 'C:\ProgramData\cocos\editors\Creator\3.8.8\resources\app.asar.unpacked\node_modules\typescript\bin\tsc' --noEmit --skipLibCheck -p tsconfig.json
node --test tests\*.test.cjs
git diff --check
```

交接前 TypeScript 检查通过，4 个 Node 测试通过。`git diff --check` 可能显示仓库原有 CRLF 警告，应与真实空白错误区分。

## 7. 注意事项与后续边界

- Windows 前台直接调用 Cocos CLI 曾出现 `EPIPE`；一键脚本通过 `Start-Process` 重定向日志，应沿用此方式。
- Cocos 路径固定为 `C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe`；换机器后需修改脚本。
- 移动 Cocos 资源时必须连同 `.meta` 移动，保持 UUID。
- 新增大资源应放入合适的 `assets/bundles`，并同步维护构建配置和后处理脚本。
- 微信预览曾因约 36 MB 主包超过 4 MB 报 80051；不要将分包素材重新合回主包。
- 第二、三关仅保留入口。不要把旧“老吴的盲区”直接恢复成正式第二关，除非用户明确要求。
- 规划中的难度递增是过关后增加车辆速度和数量，目前尚未实现持久关卡等级。
- 真机发布前重点验证：分包加载、横屏、蜂蜜点击、摇杆、三帧白猫、车辆压扁、坑洞状态和低端机性能。
- 工作区有大量未提交修改和新增资源。继续开发时保留现状，不要使用 `git reset --hard` 或覆盖用户素材。
