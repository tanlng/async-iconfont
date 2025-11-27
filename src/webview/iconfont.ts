/* eslint-disable @typescript-eslint/naming-convention */
import { ExtensionContext, Position, Range, Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { getIndexHtml, getLoadingHtml } from '../utils';
import { vueService } from './service';
import { EventData, EventMessage, Icon, ConfigType } from '../interface';
const system = os.platform().indexOf('win32') > -1 ? 'win' : 'other';

export class VueIconfontHelper {
  webviewPanel: WebviewPanel | undefined;
  context: ExtensionContext;
  localIcons: Icon[] = [];  // 项目icons
  searchIcons:Icon[] =[];  // 全局搜索icons
  projectRootPath: string | undefined; // 第一个项目根目录
  iconsDirPath: string | undefined;  // icons传输完整目录
  currentTextDocumentFileUri: Uri | undefined; // 当前光标所在工作空间文件
  dirPath: string;   // icons传输配置目录
  currentActiveProject: string; // 保存当前激活的iconfont项目id
  workspaceList: ConfigType[] = [];  // 工作空间list
  constructor(context: ExtensionContext) {
    this.context = context;
    this.localIcons = [];
    this.searchIcons = [];
    this.dirPath = workspace.getConfiguration().get('iconfont.dirPath') as string || '/src/assets/icons';
    this.currentTextDocumentFileUri = window.activeTextEditor?.document.uri;
    this.currentActiveProject = '';
    this.getLatestAddress();
    console.log(workspace.getConfiguration());
  }
  private getLatestAddress() {
    this.projectRootPath = workspace.workspaceFolders?.[0]?.uri?.fsPath;
    this.iconsDirPath = path.join(this.projectRootPath || '', `./${ this.dirPath }`);
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
    this.openWebview(
      getIndexHtml(
        this.context,
        this.webviewPanel,
      )
    );
  }
  // 打开webview
  private openWebview(html: string) {
    const columnToShowIn = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : ViewColumn.Active;

    if (!this.webviewPanel) {
      this.webviewPanel = window.createWebviewPanel(
        'iconfont',
        "iconfont助手",
        columnToShowIn || ViewColumn.Active,
        {
          retainContextWhenHidden: true,
          enableScripts: true
        }
      );

      this.webviewPanel.webview.onDidReceiveMessage((e) => this.didReceiveMessage(e));
      this.webviewPanel.onDidDispose(() => {
        this.webviewPanel = undefined;
      });
    } else {
      this.webviewPanel.reveal(columnToShowIn);
    }
    this.webviewPanel.webview.html = html;
    if (this.localIcons) {
      setTimeout(() => {
        this.webviewPanel?.webview?.postMessage({type:'projectIcons',data:this.localIcons});
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
  private checkConfig(info: ConfigType | undefined,activeType?:string) {
    console.log(4444,info)
    if (!info) {
      window.showErrorMessage('请先配置传输类型和传输路径。');
      return false;
    }
    if (!['svg', 'symbol', 'font-class'].includes(info.transionMethod)) {
      window.showErrorMessage('传输方式配置不正确，只能是svg、symbol或font-class，请检查：transionMethod');
      return false;
    }
    if (info.transionMethod === 'svg' || activeType) {
      if (!fs.existsSync(info.transionSvgDir)) {
        window.showErrorMessage('icons传输路径不存在，请检查传输地址配置：transionSvgDir');
        return false;
      }
    } else if (info.transionMethod === 'font-class') {
      if (!fs.existsSync(info.transionFontClassDir)) {
        window.showErrorMessage('font-class传输路径不存在，请检查传输地址配置：transionFontClassDir');
        return false;
      }
    } else {
      if (!fs.existsSync(info.transionSymbolJsDir)) {
        window.showErrorMessage('symbol js文件传输路径不存在，请检查symbol传输地址配置：transionSymbolJsDir');
        return false;
      }
      if (!info.symbolJsWiteTemplateDir.endsWith('false')&&!fs.existsSync(info.symbolJsWiteTemplateDir)) {
        window.showErrorMessage('symbol js文件插入模版路径不存在，请检查配置：symbolJsWiteTemplateDir');
        return false;
      }
    }
    return true
  }
  // 传输项目icons或者单个到项目中
  public async transionIconsToProject(iconfInfo?:{type:string,id:string}) {
    this.generateWorkSpaceList();
    const activeProjectConfig = this.workspaceList.find(item => item.active);
    if (!this.checkConfig(activeProjectConfig, iconfInfo?.type)) {
      return;
    }
    if (activeProjectConfig?.transionMethod === 'svg' || iconfInfo) {
      let transitionIcons = []
      const publicUrl = `${ activeProjectConfig?.transionSvgDir }/`
      if (iconfInfo) {
        let showSvgInfo;
        if (iconfInfo.type === 'projectIcons') {
          showSvgInfo = this.localIcons.find(i => i.id === iconfInfo.id)
        } else {
          showSvgInfo = this.searchIcons.find(i => i.id === iconfInfo.id)
        }
        transitionIcons = [showSvgInfo]
      } else {
        transitionIcons = await vueService.getProjectIcons(this.currentActiveProject)
      }
      transitionIcons.map((item: Icon | undefined) => {
        if (!item){ return;}
        let iconPath = publicUrl + item.fontClass
        try {
          fs.accessSync(iconPath+'.svg', fs.constants.F_OK);
          fs.writeFileSync(`${ iconPath }_${item.id}.svg`, item.showSvg);
        } catch (err) {
          fs.writeFileSync(`${ iconPath }.svg`, item.showSvg);
        }
      });
      window.showInformationMessage(`传输完成`);
    } else if (activeProjectConfig?.transionMethod === 'symbol'){
      const currentProjectIconsInfo = await vueService.getProjectIcons(this.currentActiveProject);
      const fileName = await this.getFileAndWrite(currentProjectIconsInfo, activeProjectConfig.transionSymbolJsDir);
      // 写html
      try {
        if (!activeProjectConfig.symbolJsWiteTemplateDir.endsWith('false')) {
          const html = fs.readFileSync(activeProjectConfig.symbolJsWiteTemplateDir, 'utf8');
          const str = `<script id="fontFile" src="${ fileName }"></script></head>`;
          fs.writeFileSync(activeProjectConfig.symbolJsWiteTemplateDir, html.replace(/<script id\=\"fontFile\"(.*?)<\/script>/g, '').replace('<\/head>', str));
        }
        window.showInformationMessage(`传输完成`);
      } catch (e) {
        window.showErrorMessage(`font.js文件写入模版文件失败`);
      }
    } else if (activeProjectConfig?.transionMethod === 'font-class') {
      try {
        await this.downloadFontClass(activeProjectConfig.transionFontClassDir);
        window.showInformationMessage(`传输完成`);
      } catch (e) {
        window.showErrorMessage(`font-class文件传输失败: ${e}`);
      }
    }
  }

  private async getFileAndWrite(icons: any[], targetDir: string) {
    const svgStr = icons.map(icon => `<symbol id="${icon.fontClass}" viewBox="0 0 1024 1024">` + icon.showSvg.replace(/<svg.*?>|<\/svg>/g, '') + '</symbol>').join('');
    const jsStr = `window._iconfont_svg_string_3201924 = '<svg>${ svgStr}</svg>', function (n) { var t = (t = document.getElementsByTagName("script"))[t.length - 1], e = t.getAttribute("data-injectcss"), t = t.getAttribute("data-disable-injectsvg"); if (!t) { var o, i, a, d, c, s = function (t, e) { e.parentNode.insertBefore(t, e) }; if (e && !n.__iconfont__svg__cssinject__) { n.__iconfont__svg__cssinject__ = !0; try { document.write("<style>.svgfont {display: inline-block;width: 1em;height: 1em;fill: currentColor;vertical-align: -0.1em;font-size:16px;}</style>") } catch (t) { console && console.log(t) } } o = function () { var t, e = document.createElement("div"); e.innerHTML = n._iconfont_svg_string_3201924, (e = e.getElementsByTagName("svg")[0]) && (e.setAttribute("aria-hidden", "true"), e.style.position = "absolute", e.style.width = 0, e.style.height = 0, e.style.overflow = "hidden", e = e, (t = document.body).firstChild ? s(e, t.firstChild) : t.appendChild(e)) }, document.addEventListener ? ~["complete", "loaded", "interactive"].indexOf(document.readyState) ? setTimeout(o, 0) : (i = function () { document.removeEventListener("DOMContentLoaded", i, !1), o() }, document.addEventListener("DOMContentLoaded", i, !1)) : document.attachEvent && (a = o, d = n.document, c = !1, r(), d.onreadystatechange = function () { "complete" == d.readyState && (d.onreadystatechange = null, l()) }) } function l() { c || (c = !0, a()) } function r() { try { d.documentElement.doScroll("left") } catch (t) { return void setTimeout(r, 50) } l() } }(window);`
    const hash = crypto.createHash('md5')
    const digest = hash.update(svgStr).digest('hex')
    const fileName = `font_symbol_${ digest }.js`

    // 写入带 hash 的 symbol 文件（保留原行为）
    fs.writeFileSync(path.join(targetDir, fileName), jsStr);

    // 额外写入固定名的 `iconfont.js` 以便稳定引用，避免每次文件名不同带来的引用问题
    try {
      fs.writeFileSync(path.join(targetDir, 'iconfont.js'), jsStr);
    } catch (e) {
      console.error('写入 iconfont.js 失败', e);
    }

    // 写入 iconfont.json，包含元信息（file/hash/时间）
    try {
      const meta = {
        type: 'symbol',
        file: fileName,
        alias: 'iconfont.js',
        hash: digest,
        generatedAt: Date.now()
      };
      fs.writeFileSync(path.join(targetDir, 'iconfont.json'), JSON.stringify(meta, null, 2));
    } catch (e) {
      console.error('写入 iconfont.json 失败', e);
    }

    return fileName
  }
  
  // 生成workspace list
  private generateWorkSpaceList() {
    const hasCurrentWs = this.workspaceList.find(item => item.active)
    this.workspaceList = [];
    const wsList = workspace.workspaceFolders || [];
    const getConfig = workspace.getConfiguration("iconfont",undefined);
    this.currentTextDocumentFileUri = window.activeTextEditor?.document.uri
    const config: ConfigType = {
      projectUrl:'',
      transionMethod: getConfig.get('transionMethod') || 'svg',
      transionSvgDir: String(getConfig.get('transionSvgDir')).replace('\\', '/') || '',
      transionFontClassDir: String(getConfig.get('transionFontClassDir')).replace('\\', '/') || '',
      transionSymbolJsDir: String( getConfig.get('transionSymbolJsDir')).replace('\\', '/') || '',
      symbolJsWiteTemplateDir: String(getConfig.get('symbolJsWiteTemplateDir')).replace('\\', '/') || 'false',
      projectName: ''
    };
    wsList.map((item,index) => {
      // 获取根目录下的配置文件
      const configJsondir = item.uri.fsPath + '/.iconfont.json';
      let realConfig = {...config};
      if (fs.existsSync(configJsondir)) {
        const configJsonfile = fs.readFileSync(configJsondir, 'utf8');
        realConfig = Object.assign({}, config, JSON.parse(configJsonfile));
      }
      if (!hasCurrentWs) {
        // 当前光标所在文件即为默认选项
        if (this.currentTextDocumentFileUri && this.currentTextDocumentFileUri.path.indexOf(item.uri.fsPath) > -1) {
          realConfig.active = true;
        }
        // 如果没有打开的项目,默认选中第一个项目
        if (!this.currentTextDocumentFileUri && index === 0) {
          realConfig.active = true;
        }
      } else if (hasCurrentWs.projectUrl === item.uri.fsPath) {
        realConfig.active = true;
      }
      const splitStr = system === 'win' ? item.uri.fsPath.split('\\') : item.uri.fsPath.split('/');
      realConfig.projectUrl = item.uri.fsPath
      realConfig.projectName = splitStr.slice(-1)[0];
      realConfig.transionSvgDir = path.join(item.uri.fsPath, realConfig.transionSvgDir) ;
      realConfig.transionFontClassDir = path.join(item.uri.fsPath, realConfig.transionFontClassDir);
      realConfig.transionSymbolJsDir = path.join(item.uri.fsPath, realConfig.transionSymbolJsDir);
      realConfig.symbolJsWiteTemplateDir = path.join(item.uri.fsPath, realConfig.symbolJsWiteTemplateDir);
      this.workspaceList.push(realConfig);
    });
    setTimeout(() => {
      this.webviewPanel?.webview?.postMessage({ type: 'wslist', data: this.workspaceList });
    }, 1000);
  }
  // 监控html页面postmessage
  private async didReceiveMessage(e: EventMessage) {
    const { type, data } = e;
    console.log(type, data);
    switch(type){
      case 'refresh':
        // 刷新
        this.localIcons = await vueService.getProjectIcons(this.currentActiveProject, true); // 获取项目icons
        this.webviewPanel?.webview?.postMessage({type:'projectIcons',data:this.localIcons});
        break;
      case 'search':
        //iconfont的全局搜索
        const { icons, pages } = await vueService.searchGlobalIcons({ t: data.searchValue, page: data.page });
        this.searchIcons = icons;
        this.webviewPanel?.webview?.postMessage({type:'iconsSearch',data:icons,pages});
        break;
      case 'delete':
        //项目中icon的删除
        await vueService.deleteIconFromProject(this.currentActiveProject,data as unknown as string|number);
        // 刷新
        this.localIcons = await vueService.getProjectIcons(this.currentActiveProject, true); // 获取项目icons
        this.webviewPanel?.webview?.postMessage({type:'projectIcons',data:this.localIcons});
        break;
      case 'add':
        // 添加图标
        await vueService.insertIconToProject(this.currentActiveProject,data as unknown as string|number);
        // 刷新
        this.localIcons = await vueService.getProjectIcons(this.currentActiveProject, true); // 获取项目icons
        this.webviewPanel?.webview?.postMessage({type:'projectIcons',data:this.localIcons});
        break;
      case 'transition':
        // 传输至本地项目中
        await this.transionIconsToProject(data as any);
      case 'select':
        data&&this.workspaceList.map(item => {
          item.active = item.projectName === String(data) ? true : false;
          return item;
        });
    }
  }

  private async downloadFontClass(targetDir: string) {
    const projectDetail = await vueService.getIconProjectDetail(this.currentActiveProject);
    // 尝试获取CSS链接
    let cssUrl = projectDetail?.font?.css_file;
    if (!cssUrl && projectDetail?.project?.font_resource) {
        cssUrl = projectDetail.project.font_resource;
    }
    
    if (!cssUrl) {
        window.showErrorMessage('无法找到项目的CSS文件链接，请确认项目是否生成了Font Class代码。');
        return;
    }

    // 下载CSS
    let cssContentBuffer = await vueService.downloadFile(cssUrl);
    let cssContent = cssContentBuffer.toString('utf8');

    // 解析并下载字体文件
    const fontRegex = /url\('(.+?)(\?.*?)?'\)/g;
    const fontFiles = new Map<string, string>();
    
    // 替换CSS中的路径为相对路径
    let newCssContent = cssContent.replace(fontRegex, (fullMatch: string, url: string, query: string) => {
        let downloadUrl = url;
        if (downloadUrl.startsWith('//')) {
            downloadUrl = 'https:' + downloadUrl;
        }
        
        const ext = path.extname(url);
        const fileName = `iconfont${ext}`;
        fontFiles.set(downloadUrl, fileName);
        
        return `url('${fileName}${query || ''}')`;
    });

    // 写入CSS文件
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.join(targetDir, 'iconfont.css'), newCssContent);

    // 下载并写入字体文件
    for (const [fileUrl, fileName] of fontFiles) {
        try {
            const fileContent = await vueService.downloadFile(fileUrl);
            fs.writeFileSync(path.join(targetDir, fileName), fileContent);
        } catch (e) {
            console.error(`下载字体文件失败: ${fileUrl}`, e);
        }
    }

    // 下载 JS 文件
    let jsUrl = projectDetail?.font?.js_file;
    if (jsUrl) {
        try {
            const jsContent = await vueService.downloadFile(jsUrl);
            fs.writeFileSync(path.join(targetDir, 'iconfont.js'), jsContent);
        } catch (e) {
            console.error(`下载 JS 文件失败: ${jsUrl}`, e);
        }
    }

    // 写入 font-class 模式的元信息到 iconfont.json（包含字体文件列表与时间戳）
    try {
      const meta = {
        type: 'font-class',
        files: Array.from(new Set(Array.from(fontFiles.values()))),
        generatedAt: Date.now()
      };
      fs.writeFileSync(path.join(targetDir, 'iconfont.json'), JSON.stringify(meta, null, 2));
    } catch (e) {
      console.error('写入 iconfont.json 失败', e);
    }
  }
}