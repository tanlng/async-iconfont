# 故障排除：下载或解压失败 (TypeError: Sp is not a constructor)

## 问题描述

用户在安装插件后，使用 Font Class 模式下载图标时，报错提示：
`下载或解压失败: TypeError: Sp is not a constructor`

调试模式下（Development）运行正常，但安装打包后的 vsix 插件（Production）后出现此错误。

## 错误信息

```
TypeError: Sp is not a constructor
```

`Sp` 是代码压缩（Minification）后的变量名，实际对应代码中的 `AdmZip` 类构造函数。

## 原因分析

项目使用 `esbuild` 进行打包。在 `src/webview/iconfont.ts` 中，原本使用了以下导入方式：

```typescript
import * as AdmZip from "adm-zip";
```

`adm-zip` 是一个 CommonJS 模块，导出的是一个类（构造函数）。
在 TypeScript 编译为 CommonJS 时，这种导入方式通常能工作（取决于 `esModuleInterop` 配置和运行时环境）。
但在 `esbuild` 打包并进行 Tree Shaking 和 ESM 互操作处理时，`import * as AdmZip` 会将 `AdmZip` 视为一个命名空间对象（Namespace Object），而不是构造函数本身。
因此，`new AdmZip(...)` 在运行时会失败，因为命名空间对象不可构造。

`esbuild` 在构建时其实给出了警告：
`[WARNING] Constructing "AdmZip" will crash at run-time because it's an import namespace object, not a constructor [call-import-namespace]`

## 解决方案

将导入方式修改为 TypeScript 针对 CommonJS 模块的标准导入语法：

```typescript
import AdmZip = require("adm-zip");
```

这种方式明确告诉编译器和打包工具，这是一个 CommonJS `require` 导入，`AdmZip` 变量直接绑定到 `module.exports`（即构造函数），从而避免了命名空间对象的转换问题。

## 验证方法

1. 运行构建命令并开启 minify：
   ```bash
   npm run esbuild-base -- --minify
   ```
2. 检查构建输出日志，确认不再出现 `[WARNING] Constructing "AdmZip" will crash at run-time...` 的警告。
3. 打包并安装 vsix，验证 Font Class 下载功能是否正常。
