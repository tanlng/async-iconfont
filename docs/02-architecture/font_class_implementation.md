# Font Class 模式下载实现原理说明

本文档详细说明了插件在 `font-class` 模式下，如何获取并处理 CSS 及字体文件的实现逻辑。

## 核心流程

实现代码位于 `src/webview/iconfont.ts` 中的 `downloadFontClass` 方法。

### 1. 获取资源链接

首先通过 `vueService.getIconProjectDetail` 获取项目的详细信息（类型为 `ProjectDetail`）。

*   **CSS 链接**：优先尝试读取 `projectDetail.font.css_file`，如果不存在则读取 `projectDetail.project.font_resource`。
*   **JS 链接**：读取 `projectDetail.font.js_file`（用于 Symbol 模式，但在 Font Class 模式下我们也尝试下载以便备用）。
*   **字体文件链接**：直接从 `projectDetail.font` 对象中获取 `eot_file`, `woff_file`, `woff2_file`, `ttf_file`, `svg_file` 等字段。

### 2. 并行下载资源文件

为了提高效率，插件使用 `Promise.all` 并行下载所有资源文件。

#### 2.1 字体与 JS 文件

插件维护了一个映射表，将 API 返回的字段名映射到本地文件名：

| API 字段名 | 本地文件名 |
| :--- | :--- |
| `js_file` | `iconfont.js` |
| `eot_file` | `iconfont.eot` |
| `woff_file` | `iconfont.woff` |
| `woff2_file` | `iconfont.woff2` |
| `ttf_file` | `iconfont.ttf` |
| `svg_file` | `iconfont.svg` |

插件遍历此映射表，如果 API 返回了对应的 URL，则将其下载并保存为对应的本地文件名。

#### 2.2 CSS 文件

CSS 文件需要特殊处理：
1.  下载 CSS 内容。
2.  **内容替换**：使用正则表达式 `/url\('(.+?)(\?.*?)?'\)/g` 将其中的远程 URL 替换为本地相对路径（例如 `url('iconfont.woff2?t=...')`）。
3.  保存为 `iconfont.css`。

#### 2.3 JSON 文件

*   尝试根据 CSS 的 URL 推断 `iconfont.json` 的 URL（将 `.css` 后缀替换为 `.json`）。
*   如果下载成功，保存为 `iconfont.json`。
*   此文件为可选下载，如果失败仅会在控制台输出警告。

### 3. 错误处理

*   如果在获取项目详情或 CSS 链接时失败，会弹出错误提示。
*   关键文件（CSS）下载失败会抛出异常并提示用户。
*   可选文件（如 JSON）下载失败会被忽略，不影响主流程。

## 代码逻辑片段

```typescript
// 正则解析 CSS 中的 url()
const fontRegex = /url\('(.+?)(\?.*?)?'\)/g;

// 替换逻辑
let newCssContent = cssContent.replace(fontRegex, (fullMatch, url, query) => {
    // 1. 补全协议
    let downloadUrl = url.startsWith('//') ? 'https:' + url : url;
    
    // 2. 生成固定文件名 (iconfont.woff2, iconfont.ttf 等)
    const ext = path.extname(url);
    const fileName = `iconfont${ext}`;
    
    // 3. 记录到下载列表
    fontFiles.set(downloadUrl, fileName);
    
    // 4. 返回替换后的 CSS 内容 (保留 query 参数)
    return `url('${fileName}${query || ''}')`;
});
```

## 潜在风险与设计考量

1.  **文件名冲突**：目前的实现将所有文件重命名为 `iconfont.*`。如果 CSS 中引用了两个不同路径但扩展名相同的文件（在 iconfont 场景下极少见），后下载的文件会覆盖前面的文件。
2.  **正则匹配**：目前的正则只匹配单引号 `url('...')`。如果 iconfont 官方生成的 CSS 改用双引号或无引号，此正则可能失效。目前观察到的 iconfont 生成格式均为单引号。
