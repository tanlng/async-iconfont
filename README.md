# sc-async-iconfont

# 插件功能简述

sc-async-iconfont插件的目的，主要是为了更便捷使用 [iconfont](https://www.iconfont.cn/) 中的项目图标。插件的功能主要包括：

1. 展示iconfont的项目图标仓库，并且可以删除、添加和搜索项目中的图标;
2. 可搜索iconfont的所有图标，并且添加至iconfont项目中;
3. 可导出图标至本地，主要分为两种方式：一、svg文件形式；二、官网推荐的 [symbol引用](https://www.iconfont.cn/help/detail?spm=a313x.manage_type_myprojects.i1.d8cf4382a.77b13a81pEzUTj&helptype=code) 方式;

以下是插件界面功能展示：
![插件简介](out/src/html/images/intro.jpg)

删除项目中的图标和导出单个图标至本地项目：
![](out/src/html/images/projectOperation.jpg)

搜索iconfont官网图标并直接添加到项目中、也可直接导出单个图标至本地项目：
![](out/src/html/images/search.jpg)

# 插件使用方式

### 第一种：svg图标
将iconfont官网单个项目中的icon图标以svg文件的形式导入到本地项目中指定的目录（默认在src/assets/icons目录下），本地项目可直接使用svg图标也可自行封装svg组件引用图标。

### 第二种：symbol引用
插件中 [symbol引用](https://www.iconfont.cn/help/detail?spm=a313x.manage_type_myprojects.i1.d8cf4382a.77b13a81pEzUTj&helptype=code) 的使用方式，插件通过配置会自动把js文件传输到本地项目中指定目录（默认在public目录下），并把script标签插入到指定的模版文件中（默认在index.html中）。

* 将symbol的js文件传输到指定目录，文件名根据文件内容生成hash值：内容发生变化hash值变化，内容不变，hash值不变。
* 配置js文件以script形式插入html模版，如果未设置，则不会进行标签插入操作。

# 插件配置方式简介

### 1. 登录iconfont

进入[iconfont官网](https://www.iconfont.cn/)，然后注册或登录账号。

### 2. cookie复制

![辅助cookie](out/src/html/images/cookie.jpg)

### 3. 插件配置（两种方式）

### 第一种：User Settings
在vscode的用户配置（User Settings）中找到插件进行配置。
![配置](out/src/html/images/config.jpg)

### 第二种：本地项目加配置文件
在本地项目根目录下新建iconfont配置文件：文件名【.iconfont.json】。

```
.iconfont.json 配置示例
{
	"cookie": "xxx", // iconfont官网cookie，可选，优先级高于vscode配置
	"transionMethod":"svg|symbol|font-class",		// 插件使用方式
	"transionSvgDir":"src/assets/icons",	// svg方式传输icons到项目中指定的文件夹
	"transionSymbolJsDir":"src/assets/",	// symbol方式传输js文件到指定的文件夹
	"transionFontClassDir":"src/assets/fonts",	// font-class方式传输css和字体文件到指定的文件夹
	"symbolJsWiteTemplateDir":"template/index.html"		// 把symbol js文件插入到html模版中
}
```

# 开发与打包

## 环境要求

- Node.js 22+
- npm 或 yarn
- TypeScript

## 开发环境设置

1. **克隆项目**
   ```bash
   git clone https://github.com/forever-chen/async-iconfont.git
   cd async-iconfont
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **开发模式**
   ```bash
   # 监听TypeScript变化并自动编译
   npm run watch
   
   # 或者使用esbuild监听模式
   npm run esbuild-watch
   ```

4. **调试插件**
   - 在VSCode中按 `F5` 启动调试
   - 选择 "Run Extension" 配置
   - 这会打开一个新的VSCode窗口用于测试插件

## 打包发布

### 方法一：使用vsce工具（推荐）

1. **安装vsce**
   ```bash
   npm install -g @vscode/vsce
   ```

2. **编译插件**
   ```bash
   # Windows
   npm version patch
   npm run compile:win
   
   # Linux/Mac
   npm version patch
   npm run compile
   ```

3. **打包插件**
   ```bash
   npm run esbuild-base -- --minify
   ```

4. **创建发布包**
   ```bash
   vsce package
   ```

5. **发布到市场**
   ```bash
   # 登录发布者账号
   vsce login forever-chen
   
   # 发布插件
   vsce publish
   ```

## 发布流程

### 1. 创建Azure DevOps发布者账号

1. 访问 [Azure DevOps](https://dev.azure.com/)
2. 使用Microsoft账号登录
3. 创建新组织（如果还没有）
4. 创建个人访问令牌：
   - 点击右上角头像 → "Personal access tokens"
   - 点击 "New Token"
   - 设置名称和过期时间
   - 范围选择 "Custom defined"
   - 勾选 "Marketplace" → "Manage" 权限
   - 复制并保存令牌

### 2. 发布插件

#### 使用vsce命令行（推荐）
```bash
# 登录
vsce login forever-chen

# 发布
vsce publish
```

#### 使用Web界面
1. 访问 [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. 创建发布者账号
3. 上传.vsix文件
4. 填写插件信息
5. 发布

## 版本管理

每次发布前需要更新版本号：

1. **修改package.json中的版本号**
   ```json
   {
     "version": "0.0.4"  // 增加版本号
   }
   ```

2. **更新CHANGELOG.md**
   ```markdown
   ## [0.0.4] - 2024-01-01
   - 新增功能
   - 修复bug
   ```

3. **重新打包发布**

## 常用命令

```bash
# 开发相关
npm run watch          # TypeScript监听模式
npm run esbuild-watch  # esbuild监听模式
npm run lint           # 代码检查
npm test              # 运行测试

# 打包相关
npm run compile:win    # Windows编译
npm run compile        # Linux/Mac编译
npm run esbuild        # 开发版本打包
npm run esbuild-base -- --minify  # 生产版本打包

# 发布相关
vsce package          # 打包为.vsix
vsce publish          # 发布到市场
vsce publish patch    # 发布补丁版本
vsce publish minor    # 发布次要版本
vsce publish major    # 发布主要版本
```

## 故障排除

### vsce工具问题
如果遇到vsce兼容性问题：
- 确保Node.js版本 >= 18
- 尝试安装特定版本：`npm install -g @vscode/vsce@2.15.0`
- 使用手动打包方式

### 编译问题
如果编译失败：
- 检查TypeScript配置
- 确保所有依赖已安装
- 检查文件路径是否正确

### 发布问题
如果发布失败：
- 检查网络连接
- 验证发布者令牌
- 确认版本号已更新