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

1. HTTP 打开 → 裸板飞入平放 → 8 颗 4116 左→右逐颗落板 → 8 颗 4532 → ULA/显存 →
   Z80/ROM/晶振 → RF/磁带/排线/电源区 → 电源线接上后屏幕亮起
   "© 1982 Sinclair Research Ltd" + 闪烁光标 → 进入 LOAD 条纹屏；全程控制台无
   资源加载错误。
2. 按 8（LOAD）：屏幕切为上下彩虹条纹 + 中间 "LOAD " 光标动画，TAPE 面板出现
   ZX pilot tone 条纹波形，右上 MODE 变 LOADING，Z80 寄存器 PC 停在 0556。
3. 点击 ULA 弹出 "FERRANTI ULA · 5C126" 标签；RAM 落板过程中 MEMORY 面板按
   4116/4532 落位逐段点亮；双击 index.html 表现与 1、2 一致。
