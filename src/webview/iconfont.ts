/* eslint-disable @typescript-eslint/naming-convention */
import {
  ExtensionContext,
  Position,
  Range,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace,
} from "vscode";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
// 使用 require 导入 adm-zip 以兼容 esbuild 打包和 CommonJS 模块导出
import AdmZip = require("adm-zip");
import { getIndexHtml, getLoadingHtml, getCookieConfig } from "../utils";
import { vueService } from "./service";
import { EventData, EventMessage, Icon, ConfigType } from "../interface";
import { ConfigurationManager } from "../configuration";
const system = os.platform().indexOf("win32") > -1 ? "win" : "other";

export class VueIconfontHelper {
  webviewPanel: WebviewPanel | undefined;
  context: ExtensionContext;
  localIcons: Icon[] = []; // 项目icons
  searchIcons: Icon[] = []; // 全局搜索icons
  projectRootPath: string | undefined; // 第一个项目根目录
  iconsDirPath: string | undefined; // icons传输完整目录
  currentTextDocumentFileUri: Uri | undefined; // 当前光标所在工作空间文件
  dirPath: string; // icons传输配置目录
  currentActiveProject: string; // 保存当前激活的iconfont项目id
  workspaceList: ConfigType[] = []; // 工作空间list
  constructor(context: ExtensionContext) {
    this.context = context;
    this.localIcons = [];
    this.searchIcons = [];
    this.dirPath =
      (workspace.getConfiguration().get("iconfont.dirPath") as string) ||
      "/src/assets/icons";
    this.currentTextDocumentFileUri = window.activeTextEditor?.document.uri;
    this.currentActiveProject = "";
    this.getLatestAddress();
    console.log(workspace.getConfiguration());
  }
  private getLatestAddress() {
    this.projectRootPath = workspace.workspaceFolders?.[0]?.uri?.fsPath;
    this.iconsDirPath = path.join(
      this.projectRootPath || "",
      `./${this.dirPath}`
    );
  }
  public async start(projecId: string): Promise<void> {
    // if (!this.projectRootPath) {
    //   window.showErrorMessage('请先打开一个项目');
    //   return;
    // };
    this.generateWorkSpaceList();
    this.openWebview(getLoadingHtml(this.context)); // 先打开loading
    this.localIcons = await vueService.getProjectIcons(projecId); // 获取项目icons
    this.currentActiveProject = projecId;
    this.openWebview(getIndexHtml(this.context, this.webviewPanel));
  }
  // 打开webview
  private openWebview(html: string) {
    const columnToShowIn = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : ViewColumn.Active;

    if (!this.webviewPanel) {
      this.webviewPanel = window.createWebviewPanel(
        "iconfont",
        "iconfont助手",
        columnToShowIn || ViewColumn.Active,
        {
          retainContextWhenHidden: true,
          enableScripts: true,
        }
      );

      this.webviewPanel.webview.onDidReceiveMessage(e =>
        this.didReceiveMessage(e)
      );
      this.webviewPanel.onDidDispose(() => {
        this.webviewPanel = undefined;
      });
    } else {
      this.webviewPanel.reveal(columnToShowIn);
    }
    this.webviewPanel.webview.html = html;
    if (this.localIcons) {
      setTimeout(() => {
        this.webviewPanel?.webview?.postMessage({
          type: "projectIcons",
          data: this.localIcons,
        });
      });
    }
  }
  // 更新所有icons
  public async updateOperation() {
    await vueService.updateAllProjectIcons();
    //全量更新完成之后更新当前panel的icons
    setTimeout(async () => {
      this.currentActiveProject && this.start(this.currentActiveProject);
    });
  }
  // 检查配置信息是否完整正确
  private checkConfig(info: ConfigType | undefined, activeType?: string) {
    console.log("检查配置", info);
    if (!info) {
      window.showErrorMessage("请先配置传输类型和传输路径。");
      return false;
    }
    if (!["svg", "symbol", "font-class"].includes(info.transionMethod)) {
      window.showErrorMessage(
        "传输方式配置不正确，只能是svg、symbol或font-class，请检查：transionMethod"
      );
      return false;
    }
    if (info.transionMethod === "svg" || activeType) {
      if (!fs.existsSync(info.transionSvgDir)) {
        window.showErrorMessage(
          "icons传输路径不存在，请检查传输地址配置：transionSvgDir"
        );
        return false;
      }
    } else if (info.transionMethod === "font-class") {
      if (!fs.existsSync(info.transionFontClassDir)) {
        window.showErrorMessage(
          "font-class传输路径不存在，请检查传输地址配置：transionFontClassDir"
        );
        return false;
      }
    } else {
      if (!fs.existsSync(info.transionSymbolJsDir)) {
        window.showErrorMessage(
          "symbol js文件传输路径不存在，请检查symbol传输地址配置：transionSymbolJsDir"
        );
        return false;
      }
      if (
        !info.symbolJsWiteTemplateDir.endsWith("false") &&
        !fs.existsSync(info.symbolJsWiteTemplateDir)
      ) {
        window.showErrorMessage(
          "symbol js文件插入模版路径不存在，请检查配置：symbolJsWiteTemplateDir"
        );
        return false;
      }
    }
    return true;
  }
  // 传输项目icons或者单个到项目中
  public async transionIconsToProject(iconfInfo?: {
    type: string;
    id: string;
  }) {
    this.generateWorkSpaceList();
    const activeProjectConfig = this.workspaceList.find(item => item.active);
    if (!this.checkConfig(activeProjectConfig, iconfInfo?.type)) {
      return;
    }
    if (activeProjectConfig?.transionMethod === "svg" || iconfInfo) {
      let transitionIcons = [];
      const publicUrl = `${activeProjectConfig?.transionSvgDir}/`;
      if (iconfInfo) {
        let showSvgInfo;
        if (iconfInfo.type === "projectIcons") {
          showSvgInfo = this.localIcons.find(i => i.id === iconfInfo.id);
        } else {
          showSvgInfo = this.searchIcons.find(i => i.id === iconfInfo.id);
        }
        transitionIcons = [showSvgInfo];
      } else {
        transitionIcons = await vueService.getProjectIcons(
          this.currentActiveProject
        );
      }
      transitionIcons.map((item: Icon | undefined) => {
        if (!item) {
          return;
        }
        let iconPath = publicUrl + item.fontClass;
        try {
          fs.accessSync(iconPath + ".svg", fs.constants.F_OK);
          fs.writeFileSync(`${iconPath}_${item.id}.svg`, item.showSvg);
        } catch (err) {
          fs.writeFileSync(`${iconPath}.svg`, item.showSvg);
        }
      });
      window.showInformationMessage(`传输完成`);
    } else if (activeProjectConfig?.transionMethod === "symbol") {
      const currentProjectIconsInfo = await vueService.getProjectIcons(
        this.currentActiveProject
      );
      const fileName = await this.getFileAndWrite(
        currentProjectIconsInfo,
        activeProjectConfig.transionSymbolJsDir
      );
      // 写html
      try {
        if (!activeProjectConfig.symbolJsWiteTemplateDir.endsWith("false")) {
          const html = fs.readFileSync(
            activeProjectConfig.symbolJsWiteTemplateDir,
            "utf8"
          );
          const str = `<script id="fontFile" src="${fileName}"></script></head>`;
          fs.writeFileSync(
            activeProjectConfig.symbolJsWiteTemplateDir,
            html
              .replace(/<script id\=\"fontFile\"(.*?)<\/script>/g, "")
              .replace("</head>", str)
          );
        }
        window.showInformationMessage(`传输完成`);
      } catch (e) {
        window.showErrorMessage(`font.js文件写入模版文件失败`);
      }
    } else if (activeProjectConfig?.transionMethod === "font-class") {
      try {
        await this.downloadFontClass(activeProjectConfig.transionFontClassDir);
        window.showInformationMessage(`传输完成`);
      } catch (e) {
        window.showErrorMessage(`font-class文件传输失败: ${e}`);
      }
    }
  }

  private async getFileAndWrite(icons: any[], targetDir: string) {
    const svgStr = icons
      .map(
        icon =>
          `<symbol id="${icon.fontClass}" viewBox="0 0 1024 1024">` +
          icon.showSvg.replace(/<svg.*?>|<\/svg>/g, "") +
          "</symbol>"
      )
      .join("");
    const jsStr = `window._iconfont_svg_string_3201924 = '<svg>${svgStr}</svg>', function (n) { var t = (t = document.getElementsByTagName("script"))[t.length - 1], e = t.getAttribute("data-injectcss"), t = t.getAttribute("data-disable-injectsvg"); if (!t) { var o, i, a, d, c, s = function (t, e) { e.parentNode.insertBefore(t, e) }; if (e && !n.__iconfont__svg__cssinject__) { n.__iconfont__svg__cssinject__ = !0; try { document.write("<style>.svgfont {display: inline-block;width: 1em;height: 1em;fill: currentColor;vertical-align: -0.1em;font-size:16px;}</style>") } catch (t) { console && console.log(t) } } o = function () { var t, e = document.createElement("div"); e.innerHTML = n._iconfont_svg_string_3201924, (e = e.getElementsByTagName("svg")[0]) && (e.setAttribute("aria-hidden", "true"), e.style.position = "absolute", e.style.width = 0, e.style.height = 0, e.style.overflow = "hidden", e = e, (t = document.body).firstChild ? s(e, t.firstChild) : t.appendChild(e)) }, document.addEventListener ? ~["complete", "loaded", "interactive"].indexOf(document.readyState) ? setTimeout(o, 0) : (i = function () { document.removeEventListener("DOMContentLoaded", i, !1), o() }, document.addEventListener("DOMContentLoaded", i, !1)) : document.attachEvent && (a = o, d = n.document, c = !1, r(), d.onreadystatechange = function () { "complete" == d.readyState && (d.onreadystatechange = null, l()) }) } function l() { c || (c = !0, a()) } function r() { try { d.documentElement.doScroll("left") } catch (t) { return void setTimeout(r, 50) } l() } }(window);`;
    const hash = crypto.createHash("md5");
    const digest = hash.update(svgStr).digest("hex");
    const fileName = `font_symbol_${digest}.js`;

    // 写入带 hash 的 symbol 文件（保留原行为）
    fs.writeFileSync(path.join(targetDir, fileName), jsStr);

    // 额外写入固定名的 `iconfont.js` 以便稳定引用，避免每次文件名不同带来的引用问题
    try {
      fs.writeFileSync(path.join(targetDir, "iconfont.js"), jsStr);
    } catch (e) {
      console.error("写入 iconfont.js 失败", e);
    }

    // 写入 iconfont.json，包含元信息（file/hash/时间）
    try {
      const meta = {
        type: "symbol",
        file: fileName,
        alias: "iconfont.js",
        hash: digest,
        generatedAt: Date.now(),
      };
      fs.writeFileSync(
        path.join(targetDir, "iconfont.json"),
        JSON.stringify(meta, null, 2)
      );
    } catch (e) {
      console.error("写入 iconfont.json 失败", e);
    }

    return fileName;
  }

  // 生成workspace list
  private generateWorkSpaceList() {
    const hasCurrentWs = this.workspaceList.find(item => item.active);
    this.workspaceList = [];
    const wsList = workspace.workspaceFolders || [];
    this.currentTextDocumentFileUri = window.activeTextEditor?.document.uri;

    wsList.map((item, index) => {
      // Use ConfigurationManager to get config for this workspace folder
      const realConfig = ConfigurationManager.getConfig(item.uri);

      if (!hasCurrentWs) {
        // 当前光标所在文件即为默认选项
        if (
          this.currentTextDocumentFileUri &&
          this.currentTextDocumentFileUri.path.indexOf(item.uri.fsPath) > -1
        ) {
          realConfig.active = true;
        }
        // 如果没有打开的项目,默认选中第一个项目
        if (!this.currentTextDocumentFileUri && index === 0) {
          realConfig.active = true;
        }
      } else if (hasCurrentWs.projectUrl === item.uri.fsPath) {
        realConfig.active = true;
      }

      realConfig.transionSvgDir = path.join(
        item.uri.fsPath,
        realConfig.transionSvgDir
      );
      realConfig.transionFontClassDir = path.join(
        item.uri.fsPath,
        realConfig.transionFontClassDir
      );
      realConfig.transionSymbolJsDir = path.join(
        item.uri.fsPath,
        realConfig.transionSymbolJsDir
      );
      realConfig.symbolJsWiteTemplateDir = path.join(
        item.uri.fsPath,
        realConfig.symbolJsWiteTemplateDir
      );
      this.workspaceList.push(realConfig);
    });
    setTimeout(() => {
      this.webviewPanel?.webview?.postMessage({
        type: "wslist",
        data: this.workspaceList,
      });
    }, 1000);
  }
  // 监控html页面postmessage
  private async didReceiveMessage(e: EventMessage) {
    const { type, data } = e;
    console.log(type, data);
    switch (type) {
      case "refresh":
        // 刷新
        this.localIcons = await vueService.getProjectIcons(
          this.currentActiveProject,
          true
        ); // 获取项目icons
        this.webviewPanel?.webview?.postMessage({
          type: "projectIcons",
          data: this.localIcons,
        });
        break;
      case "search":
        //iconfont的全局搜索
        const { icons, pages } = await vueService.searchGlobalIcons({
          t: data.searchValue,
          page: data.page,
        });
        this.searchIcons = icons;
        this.webviewPanel?.webview?.postMessage({
          type: "iconsSearch",
          data: icons,
          pages,
        });
        break;
      case "delete":
        //项目中icon的删除
        await vueService.deleteIconFromProject(
          this.currentActiveProject,
          data as unknown as string | number
        );
        // 刷新
        this.localIcons = await vueService.getProjectIcons(
          this.currentActiveProject,
          true
        ); // 获取项目icons
        this.webviewPanel?.webview?.postMessage({
          type: "projectIcons",
          data: this.localIcons,
        });
        break;
      case "add":
        // 添加图标
        await vueService.insertIconToProject(
          this.currentActiveProject,
          data as unknown as string | number
        );
        // 刷新
        this.localIcons = await vueService.getProjectIcons(
          this.currentActiveProject,
          true
        ); // 获取项目icons
        this.webviewPanel?.webview?.postMessage({
          type: "projectIcons",
          data: this.localIcons,
        });
        break;
      case "transition":
        // 传输至本地项目中
        await this.transionIconsToProject(data as any);
      case "select":
        data &&
          this.workspaceList.map(item => {
            item.active = item.projectName === String(data) ? true : false;
            return item;
          });
        break;
      case "info":
        window.showInformationMessage(data as unknown as string);
        break;
      case "error":
        window.showErrorMessage(data as unknown as string);
        break;
    }
  }
  private async downloadFontClassByFilesStrategy(targetDir: string) {
    const projectDetail = await vueService.getIconProjectDetail(
      this.currentActiveProject
    );

    if (!projectDetail) {
      window.showErrorMessage("无法获取项目详情，请检查网络或Cookie配置。");
      return;
    }

    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fontData = projectDetail.font;
    const tasks: Promise<void>[] = [];

    // 1. 下载字体和JS文件
    // 映射 API 字段到本地文件名
    const fileMapping: Record<string, string> = {
      js_file: "iconfont.js",
      eot_file: "iconfont.eot",
      woff_file: "iconfont.woff",
      woff2_file: "iconfont.woff2",
      ttf_file: "iconfont.ttf",
      svg_file: "iconfont.svg",
    };

    Object.entries(fileMapping).forEach(([key, fileName]) => {
      const url = fontData[key];
      if (url) {
        tasks.push(this.downloadAndSave(url, path.join(targetDir, fileName)));
      }
    });

    // 2. 处理 CSS 文件
    const cssUrl = fontData.css_file || projectDetail.project.font_resource;
    if (cssUrl) {
      tasks.push(this.processCss(cssUrl, targetDir));

      // 3. 尝试下载 iconfont.json
      const jsonUrl = cssUrl.replace(/\.css(\?.*)?$/, ".json");
      tasks.push(
        this.downloadAndSave(
          jsonUrl,
          path.join(targetDir, "iconfont.json"),
          true
        )
      );
    } else {
      window.showErrorMessage("未找到 CSS 文件链接");
    }

    try {
      await Promise.all(tasks);
    } catch (e) {
      console.error("部分文件下载失败", e);
      window.showErrorMessage("部分文件下载失败，请查看控制台日志");
    }
  }

  private async downloadFontClass(targetDir: string) {
    const projectDetail = await vueService.getIconProjectDetail(
      this.currentActiveProject
    );

    if (!projectDetail) {
      window.showErrorMessage("无法获取项目详情，请检查网络或Cookie配置。");
      return;
    }

    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 获取 ctoken
    const config = ConfigurationManager.getConfig(
      this.currentTextDocumentFileUri || workspace.workspaceFolders![0].uri
    );
    const cookie = config.cookie || "";
    const ctoken = getCookieConfig(cookie, "ctoken");

    // 构造下载 URL
    const downloadUrl = `https://www.iconfont.cn/api/project/download.zip?pid=${this.currentActiveProject}&ctoken=${ctoken}`;

    try {
      // 下载 ZIP
      const zipBuffer = await vueService.downloadFile(downloadUrl);
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      // 处理解压文件
      // ZIP 结构通常是: download.zip -> font_xxxx/ -> files
      // 我们需要把 files 提取出来，并重命名

      // 1. 找到 CSS 文件，用于后续替换引用
      const cssEntry = zipEntries.find(
        (entry: AdmZip.IZipEntry) =>
          !entry.isDirectory && entry.entryName.endsWith(".css")
      );

      if (!cssEntry) {
        throw new Error("压缩包中未找到 CSS 文件");
      }

      // 2. 遍历所有文件进行处理
      for (const entry of zipEntries) {
        if (entry.isDirectory) {
          continue;
        }

        const ext = path.extname(entry.name).toLowerCase();
        let targetFileName = entry.name; // 默认保持原名
        let content = entry.getData();

        // // 根据扩展名重命名
        // if (ext === ".css") {
        //   targetFileName = "iconfont.css";
        //   // 处理 CSS 内容：替换引用
        //   let cssText = content.toString("utf8");
        //   cssText = cssText.replace(
        //     /url\('?(.+?)(\?.*?)?'?\)/g,
        //     (match: string, url: string, query: string) => {
        //       // url 可能是 "iconfont.woff2" 或 "font_xxx.woff2"
        //       // 我们统一替换为 "iconfont.ext"
        //       const fileExt = path.extname(url);
        //       return `url('iconfont${fileExt}${query || ""}')`;
        //     }
        //   );
        //   content = Buffer.from(cssText, "utf8");
        // } else if (ext === ".js") {
        //   targetFileName = "iconfont.js";
        // } else if (ext === ".json") {
        //   targetFileName = "iconfont.json";
        // } else if ([".eot", ".woff", ".woff2", ".ttf", ".svg"].includes(ext)) {
        //   targetFileName = `iconfont${ext}`;
        // }

        // 写入文件
        fs.writeFileSync(path.join(targetDir, entry.name), content as any);
      }

      window.showInformationMessage("下载并解压完成");
    } catch (e) {
      console.error("下载或解压失败", e);
      window.showErrorMessage(`下载或解压失败: ${e}`);
    }
  }

  private async downloadAndSave(
    url: string,
    filePath: string,
    ignoreError = false
  ) {
    try {
      const content = await vueService.downloadFile(url);
      fs.writeFileSync(filePath, content);
    } catch (e) {
      if (!ignoreError) {
        console.error(`下载失败: ${url}`, e);
        throw e;
      } else {
        console.warn(`可选文件下载失败: ${url}`);
      }
    }
  }

  private async processCss(url: string, targetDir: string) {
    try {
      const content = await vueService.downloadFile(url);
      let cssContent = content.toString("utf8");
      // 替换远程路径为本地路径，保留 query 参数
      cssContent = cssContent.replace(
        /url\('(.+?)(\?.*?)?'\)/g,
        (match: string, url: string, query: string) => {
          const ext = path.extname(url);
          return `url('iconfont${ext}${query || ""}')`;
        }
      );
      fs.writeFileSync(path.join(targetDir, "iconfont.css"), cssContent);
    } catch (e) {
      console.error(`处理 CSS 失败: ${url}`, e);
      throw e;
    }
  }
}
