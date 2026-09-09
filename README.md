# 猫咪小院 · CatFight

Cocos Creator 3.8.8，TypeScript 3D 原型。打开 assets/scenes/Main.scene 后浏览器预览。
GitHub 仓库：https://github.com/Sakura21319/CatFight.git
独立构建：执行 node tests/serve-build.cjs 后访问 http://127.0.0.1:7458 。
编辑器预览：http://localhost:7456/?scene=0a9cbf04-e21a-431e-a58a-156673c2eec5

## 操作

- 点击选择猫咪种类，再轻点地面放置；最多 48 只。
- 拖动地面旋转视角，滚轮缩放；手机可使用向左转、向右转、拉近、拉远按钮。
- 切换场地：12×10 米大庭院 / 白色笼子，切换时保留猫咪。笼子根据视角隐藏近侧栏杆，保持猫咪可见。
- 全部品种：清空并展示 8 种猫。双猫、三猫演示用于快速检查行为。
- 看猫脸：暂停行为并展示首只猫的近景，再次点击返回。
- 声音：默认关闭，点击开启背景音乐和音效。

## 模型与行为

躯干是一张闭合的低多边形网格，保留适度棱角；弓背时连续弯曲，无独立分块裂缝。脸部用立体头型和像素化五官组合：阶梯眼眶、圆形像素瞳孔、压低眼睑、双侧立体口鼻、像素鼻子与收紧嘴线，不使用照片贴片。原照片只存于 art/cats/references 用于美术参考。

8 种外观：橘猫、狸花、三花、布偶、英短蓝猫、奶牛猫、暹罗、黑猫。新增猫按种类生成 64×64 花纹贴图；条纹和色块的种子各不相同，猫咪存活期间不变。布偶、暹罗有重点色及蓝眼睛。当前仍共用基础骨架与体型，尚未实现各品种的长短毛与独立骨骼资产。

单猫随机走动；邻近检测半径 1.9 米。双猫对峙时中心距离约 1.5 米，进入缠斗后以每只最高 1.45 米/秒靠近到约 0.58 米，速度为普通调整间距的 2.23 倍。完整侧躺、腹部相对，四条腿从肩胯关节前后交替摆动，每秒 7 次。三只或更多猫形成邻近连通组时停止缠斗，必要时退开到安全距离后保持对峙。无尘土或星星粒子。

## 替换音频

占位音频为本地程序合成，无第三方音乐素材。替换以下文件、保持文件名，然后重新构建即可：

- assets/resources/audio/music.wav：16 秒循环背景音乐。
- assets/resources/audio/hiss.wav：哈气声占位。
- assets/resources/audio/fight.wav：缠斗声占位。
- assets/resources/audio/place.wav：放置提示音。

GardenAudio.ts 控制加载和音量。可用 node tests/generate-audio.cjs 重新生成占位文件（会覆盖上述 WAV）。当前不是实录猫叫。

## 检查

node tests/rules.test.cjs
node tests/voxel-pose.test.cjs
node tests/surface.test.cjs
node tests/breeds-space.test.cjs

使用 Cocos 安装包自带 TypeScript 执行 tsc --noEmit --skipLibCheck -p tsconfig.json。skipLibCheck 跳过 Cocos 引擎内部声明缺失，仍检查项目脚本。

源码按 CatGarden（交互与调度）、VoxelCat（模型与动作）、CatSurface（连续网格）、CatBreeds（品种花纹）、GardenSpace（距离）、CatEnvironment（场地）、GardenAudio（音频）划分。

已生成 build/web-mobile。构建目录由 Cocos 管理，不在那里改源码。微信 AppID、真机性能和 48 只猫上限的低端设备性能尚未验证；正式移动版本仍需合批和模型优化。
