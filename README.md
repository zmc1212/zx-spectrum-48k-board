# SINCLAIR · ZX SPECTRUM 48K — Issue 3B 主板装配模拟

一个纯前端 3D「产品视频」式演示：1982 年的 Sinclair ZX Spectrum 48K（Issue 3B 主板）
在深灰图纸台面上逐步装配 —— 裸板飞入、8 × 4116 + 8 × 4532 共十六颗 RAM 逐颗落板、
Ferranti ULA（6C001E）、Z80A CPU 与 16K ROM、RF 调制器 / EAR+MIC 磁带插座 /
2 × 8 路膜键盘排线 / 7805 电源区依次就位，随后接上 9V 电源：板后的小屏幕亮起
"© 1982 Sinclair Research Ltd"，最后进入 ZX 经典 LOAD 条纹屏与 pilot tone 波形。
46 秒一个循环，底部五块仪表盘（内存地图 / Z80 寄存器 / ULA 帧计数 / 磁带波形 /
电源轨）全程联动。

**复刻说明**：本站基于 ZX Spectrum 48K（Issue 3B）公开资料（主板照片、布局图与
规格）复刻；48K = 8 × 4116（16K，需 +5V/+12V/−5V 三轨）+ 8 × 4532（32K，64K×1
颗粒关闭高半区当 32K×1 用）。ULA 为 40 脚平封 DIP（丝印 6C001E-x），显示文件
直接读主 DRAM——板上没有独立显存 SRAM；ROM 为 23128 类 16K×8（28 脚）；
时钟为 14 MHz 晶振 ÷4 → Z80 3.5 MHz（48K PAL）；EAR 经 RC 偏置直入 ULA，
板上无比较器芯片。屏幕内容（开机版权页与 LOAD 条纹屏）为程序化 Canvas 模拟，
**并非真实 ROM 输出**；LOAD 边框为风格化近似（pilot tone 红/青水平条纹，
数据段蓝/黄），不逐像素还原 ULA border。

整站零依赖、零构建：three.js r149 UMD 内置于 `vendor/`，所有贴图（图纸台面网格、
PCB 丝印与金手指、芯片顶印字、彩虹条、屏幕画面）均由 Canvas 程序化绘制。

## 运行

```bash
python3 tools/serve.py 8102     # http://127.0.0.1:8102
```

或直接**双击 `index.html`**（file:// 下行为完全一致，无需构建）。

## 交互

| 操作 | 效果 |
| --- | --- |
| 拖动 / 滚轮 | 环绕相机（短暂接管自动运镜） |
| 点击零件 | 弹出该零件标签（主板、金手指、屏幕也可点击） |
| 空格 | 暂停 / 继续 |
| R | 重播 |
| 1-8 | 跳转到 裸板 / 16K RAM / 32K RAM / ULA / CPU / 外设 / 上电 / LOAD 阶段 |

## 代码结构

```
index.html          入口（file:// 与 HTTP 同一入口，加载失败显示引导横幅）
vendor/three.min.js three.js r149 UMD
src/textures.js     Canvas 程序化贴图（图纸台面/PCB 丝印/芯片印字/金手指/彩虹条）
src/scene.js        渲染器、灯光、图纸台面、Issue 3B 主板、小屏幕（动态贴图）
src/parts.js        30 个零件建模 + 分阶段飞入装配控制器
src/dashboard.js    底部五仪表盘（内存地图/Z80/ULA/磁带/电源轨）
src/timeline.js     8 阶段 46s 状态机 + 相机运镜 + 仪表联动状态
src/labels.js       CSS 标签层（ZX 黄/白色零件标签，世界坐标投影）
src/orbit.js        自写轨道相机（拖拽/缩放/自动运镜接管）
src/main.js         入口、主循环、键盘/点击交互
tools/serve.py      本地预览服务器（no-store）
```

## 技术要点

- three.js `physicallyCorrectLights = true`，颜色贴图 `encoding = sRGBEncoding`，
  ACES 色调映射，避免暗色材质发灰。
- 小屏幕贴图为 Canvas 每约 0.1s 重绘：boot 画黑底白字版权页 + 闪烁方块光标；
  load 画上下 1/3 水平条纹（pilot tone 红/青、数据段蓝/黄，随磁带面板状态切换）
  + 中间黑底 LOAD 窗口。
- 内存地图按真实 64K 地址空间分段：ROM $0000-$3FFF、显示文件 $4000-$5AFF、
  三块 RAM bank，随对应芯片落板逐段点亮。
- 4116 动态 RAM 需 +5V/+12V/−5V 三轨，电源面板专门标注。
