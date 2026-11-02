# CaptfEncoder Web

CaptfEncoder 的纯前端 Web 版本，可部署到 Vercel。所有计算都在浏览器本地完成，不需要后端、数据库或任何服务端函数。

- 工具数量：**72 个**（原 76 个工具移除 5 个在线查询工具后，其余全部保留）
- 在线工具（whois / IP ASN / IP info / IP Whois / Factordb）已移除，原目录移动到 `extensions-disabled/`，不参与构建
- 两个 Python 工具已移植为 JavaScript：
  - Gronsfeld 密码
  - Hash 类型识别（使用原项目内置的 `name_that_hash` 规则表）

## 环境要求

- Node.js **>= 18**（推荐 20 / 22）
- npm 9+

## 本地开发

```bash
npm install
npm run dev
```

打开 <http://localhost:8080>。

`npm run dev` 会先执行 `scripts/gen-manifest.js`，扫描 `extensions/` 生成前端需要的清单，然后启动 webpack dev server（支持热更新）。

## 生产构建

```bash
npm run build
```

构建产物在 `dist/`，可直接部署到任意静态托管服务。本地预览：

```bash
npm run preview
```

## 部署到 Vercel

### 方式一：Git 导入

1. 将项目推送到 GitHub / GitLab / Bitbucket
2. 在 Vercel 中 `Add New Project` 并导入仓库
3. Framework Preset 选择 **Other**
4. Build Command 保持 `npm run build`
5. Output Directory 设置为 `dist`
6. 点击 Deploy

仓库根目录已提供 `vercel.json`，上述构建命令和输出目录会自动生效。

### 方式二：Vercel CLI

```bash
npm i -g vercel
vercel
```

生产部署：

```bash
vercel --prod
```

> 路由使用 hash 模式（`/#/extensions/...`），因此不需要配置 SPA rewrite。

## 验证

项目包含一套基于 Puppeteer 的浏览器冒烟测试，会验证主要算法、文件上传、二维码、GIF、EXIF 以及全部 72 个页面能否正常渲染。

```bash
# 1. 先构建并启动静态预览
npm run build
npm run preview        # 默认 http://localhost:3000

# 2. 另开终端运行测试
BASE_URL=http://localhost:3000/ npm run smoke
```

Windows PowerShell：

```powershell
$env:BASE_URL="http://localhost:3000/"; npm run smoke
```

测试使用本机已安装的 Chrome，可通过 `CHROME_PATH` 指定浏览器路径：

```bash
CHROME_PATH="/path/to/chrome" npm run smoke
```

## 项目结构

```
├── extensions/               # 扩展（view + controller），直接复用官方实现
│   ├── ext.app.converter.*   # 编码转换
│   ├── ext.app.classical.*   # 古典密码
│   ├── ext.app.crypto.*      # 密码学
│   ├── ext.app.pki.*         # 公钥
│   ├── ext.app.other.*       # 其他编码
│   ├── ext.app.misc.*        # 杂项（文件/图片）
│   ├── ext.app.home/         # 首页
│   └── ext.common/           # 公共库
├── extensions-disabled/      # 已移除的在线工具（不参与构建）
├── config/                   # 语言、主题、扩展目录配置
├── src/                      # 前端源码（来自官方 CaptfEncoder-V2/renderer.src）
│   ├── extensions-registry.js# 浏览器端扩展注册表（替代 Electron IPC）
│   ├── generated/            # npm run gen 生成的扩展清单
│   ├── plugins/commands.js   # 文件选择/下载/剪贴板等 Web API 实现
│   ├── extendable/           # 通用表单、编辑器、加载组件
│   └── views/                # 应用外壳
├── scripts/
│   ├── gen-manifest.js       # 构建期扫描 extensions/ 生成清单
│   └── smoke-test.js         # Puppeteer 冒烟测试
├── webpack.config.js
├── vercel.json
└── package.json
```

## 实现说明

### Electron → Web 的替换

| Electron 原实现 | Web 实现 |
|---|---|
| `ipcRenderer.invoke(controller)` | 直接调用打包后的 controller 函数 |
| 主进程 `require(view.component.js)` | `require.context` 构建期打包 |
| 主进程扫描 `extensions/` | `scripts/gen-manifest.js` 构建期生成 `manifest.json` |
| `dialog.showOpenDialog` | 隐藏 `<input type="file">` + `FileReader` |
| `dialog.showSaveDialog` | `Blob` + `<a download>` |
| `clipboard` | `navigator.clipboard`（HTTPS） |
| `electron-store` | `localStorage` |
| 窗口控制 / 更新检查 | 已移除或改为浏览器行为 |

### Node 依赖替换

| 原依赖 | Web 替代 |
|---|---|
| `node:crypto`（文件 hash） | `hash-wasm`（支持 MD5/SHA-1/224/256/384/512） |
| `jimp`（EXIF） | `exifr` |
| `jimp` + `qrcode-reader`（二维码解码） | `jsQR` + Canvas |
| `jimp`（GIF 帧转图） | `omggif` + Canvas |
| `python-shell`（Gronsfeld / Hash 识别） | 纯 JavaScript 移植 |

其余加密库（`crypto-js`、`node-forge`、`sm-crypto`、`bcryptjs`、`scryptsy`、`egoroof-blowfish` 等）本身即可在浏览器运行。

## 已知限制

- **不再支持在线工具**：whois 需要 TCP 连接，其他在线查询存在 CORS / 反爬问题，纯静态部署无法可靠支持。如需要，必须增加独立的服务端代理。
- **扩展不能运行时热插拔**：扩展在构建期通过 webpack 打包，新增扩展需要重新构建和部署。
- **Vue 2.7 / Vuetify 2.7 已 EOL**：当前选择是为了最大化复用官方视图组件。后续如需长期维护，可迁移到 Vue 3 + Vuetify 3，但需要重写视图层。
- **大文件哈希会占用浏览器内存**：建议对超大文件做大小限制。
- 哈希识别使用原 `name_that_hash` 规则表，结果与桌面版一致，但不包含其后续版本的更新。

## 许可证

上游项目 [guyoung/CaptfEncoder](https://github.com/guyoung/CaptfEncoder) 使用 MIT License。本 Web 版本同样遵循 MIT License，请保留原项目的版权声明。
