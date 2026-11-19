# ZX SPECTRUM 48K — 本地打开与验收

## 启动方式

- 本地 HTTP（自测端口 8102）：

  ```bash
  cd zx-spectrum-48k-board
  python3 tools/serve.py 8102
  # 打开 http://127.0.0.1:8102
  ```

  `tools/serve.py` 发送 `Cache-Control: no-store`，改源码后刷新即是最新效果。

- **双击支持**：`index.html` 可直接双击打开（file://）。全部为经典 `<script>`
  （非 ES 模块）、无 fetch/XHR、贴图全部 Canvas 程序化生成、three.js 内置于
  `vendor/three.min.js`，file:// 与 HTTP 行为一致。入口加载失败时页面显示引导横幅。

## 交互

- 拖动旋转 / 滚轮缩放；点击零件（含主板、金手指、屏幕）弹出标签。
- 空格：暂停；R：重播；数字键 1-8：跳转 裸板/16K RAM/32K RAM/ULA/CPU/外设/上电/LOAD。
- 时间线 46s 自动循环：PCB → RAM16 → RAM32 → ULA → CPU → CONN → BOOT → LOAD。

## 验收清单

1. HTTP 打开 → 裸板飞入平放 → 8 颗 4116 左→右逐颗落板 → 8 颗 4532 → ULA →
   Z80/ROM/晶振 → RF/EAR+MIC/两条 8 路膜排线/电源区 → 电源线接上后屏幕亮起
   "© 1982 Sinclair Research Ltd" + 闪烁光标 → 进入 LOAD 条纹屏；全程控制台无
   资源加载错误。
2. 按 8（LOAD）：屏幕切为上下水平条纹（pilot tone 红/青，数据段蓝/黄，与 TAPE
   面板状态联动）+ 中间 "LOAD " 光标动画，TAPE 面板出现 ZX pilot tone 条纹波形，
   右上 MODE 变 LOADING，Z80 寄存器 PC 停在 0556。
3. 点击 ULA 弹出 "FERRANTI ULA · 6C001E-5" 标签；RAM 落板过程中 MEMORY 面板按
   4116/4532 落位逐段点亮；双击 index.html 表现与 1、2 一致。

## 界面语言（双语约定）
中文为主、英文为副的双语风格：标题卡/状态卡/阶段胶囊/仪表盘为中文主文案，
英文原文退到小字副位（`.tag .sub`、面板 `.meta`）；型号代号与单位
（Z80A、ULA、Issue 3B、4116/4532、MHz、K）保留英文；3D 零件丝印贴图保持英文
（真实硬件即英文标注），屏幕上的机器内容（© 1982 开机字样、LOAD 条纹屏、
BASIC 输出）原样保留。改动文案时遵循同一约定：主位中文、副位英文、代号不译。
