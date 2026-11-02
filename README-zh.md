# CaptfEncoder Web

CaptfEncoder 的纯前端 Web 版本，可部署到 Vercel。所有计算都在浏览器本地完成，不需要后端、数据库或任何服务端函数。

[English](README.md)

- **72 个工具**：编码转换、古典密码、密码学、公钥密码、特殊编码、文件与图片工具
- **在线工具已移除**：whois / IP ASN / IP info / IP Whois / Factordb（需要服务端代理，无法在纯静态站点运行）
- **Python 依赖已移除**：Gronsfeld 密码与 Hash 类型识别已移植为 JavaScript
- **Vue 2.7 + Vuetify 2.7 + webpack 5**

## 环境要求

- Node.js >= 18（推荐 20 / 22）
- npm 9+

## 本地开发

```bash
npm install
npm run dev
```

打开 <http://localhost:8080>。

`npm run dev` 会先通过 `scripts/gen-manifest.js` 重新生成扩展清单，然后启动支持热更新的 webpack-dev-server。

## 生产构建

```bash
npm run build     # 产物输出到 dist/
npm run preview   # 本地预览 dist/
```

## 部署到 Vercel

将仓库导入 Vercel，`vercel.json` 已配置好：

- Framework Preset：**Other**
- Build Command：`npm run build`
- Output Directory：`dist`

项目使用 hash 路由（`/#/extensions/...`），因此不需要配置 SPA rewrite。

## 验证

项目包含基于 Puppeteer 的冒烟测试，覆盖主要算法、文件上传、二维码、GIF 拆帧、EXIF 解析，并会渲染全部 72 个扩展页面。

```bash
npm run build
npm run preview        # http://localhost:3000

# 另开终端
BASE_URL=http://localhost:3000/ npm run smoke
```

PowerShell：

```powershell
$env:BASE_URL="http://localhost:3000/"; npm run smoke
```

测试使用本机已安装的 Chrome，可通过 `CHROME_PATH` 指定浏览器路径。

## 项目结构

```
extensions/              # 扩展视图 + controller（复用上游实现）
extensions-disabled/     # 已从 Web 构建中移除的在线工具
config/                  # 语言、主题、扩展目录
src/                     # Vue 应用外壳
  extensions-registry.js # 浏览器端扩展注册表（替代 Electron IPC）
  generated/             # npm run gen 生成的清单
  plugins/commands.js    # 文件选择/下载/剪贴板等 Web API
scripts/
  gen-manifest.js        # 构建期扫描 extensions/
  smoke-test.js          # Puppeteer 冒烟测试
webpack.config.js
vercel.json
```

## 说明

Electron → Web 的替换细节、Node 依赖替换表见 [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)。

- 所有工具均在浏览器本地运行，上传的文件不会离开浏览器。
- 扩展在构建期打包，不支持运行时热插拔。
- Vue 2 / Vuetify 2 已 EOL；这样选择是为了最大化复用上游视图组件。
- Hash 类型识别使用上游项目内置的 `name_that_hash` 规则表。
- 超大文件 hash 会受浏览器内存限制。

## 许可证

MIT。基于 [guyoung/CaptfEncoder](https://github.com/guyoung/CaptfEncoder)（MIT License），请保留原项目版权声明。
