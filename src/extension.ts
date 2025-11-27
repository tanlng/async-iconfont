// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { vueService } from "./webview/service";
import * as SideBar from "./webview/siderMenu";
import { VueIconfontHelper } from "./webview/iconfont";
import * as fs from "fs";
import * as path from "path";
import { ConfigurationManager } from "./configuration";

export function activate(context: vscode.ExtensionContext) {
  console.log("[Extension] Activating async-iconfont extension...");
  // 尝试从工作区根目录的 .iconfont.json 读取 cookie
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    vscode.window.showErrorMessage("请先打开一个工作区以使用iconfont扩展");
    throw new Error("No workspace folder found");
  }
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const config = ConfigurationManager.getConfig(
    vscode.workspace.workspaceFolders[0].uri
  );
  const cookie = config.cookie || "";

  if (!cookie) {
    console.error(
      "[Extension] No cookie found in .iconfont.json or VS Code settings."
    );
    vscode.window.showErrorMessage("请先登录iconfont官网获取并配置cookie");
    return;
  }
  console.log("[Extension] Cookie configured successfully.");
  context!.globalState.update(
    "outExist",
    fs.existsSync(path.join(context.extensionPath, "src")) ? "" : "out"
  );
  vueService.setCookie(cookie);
  vueService.setContext(context);
  const siderInstance = new SideBar.ListDataProvider();
  // 创建菜单项
  vscode.window.createTreeView("sc-async-iconfont", {
    treeDataProvider: siderInstance,
  });
  const iconfontHelper = new VueIconfontHelper(context);
  // 监听菜单项点击事件
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "sc-async-iconfont.click",
      async ({ label }) => {
        iconfontHelper.start(label.id);
        vscode.window.showInformationMessage(`You clicked ${label.label}`);
      }
    )
  );
  // 全量更新icons
  context.subscriptions.push(
    vscode.commands.registerCommand("sc-async-iconfont.refresh", () => {
      iconfontHelper.updateOperation();
      setTimeout(() => {
        siderInstance.refresh();
      });
      vscode.window.showInformationMessage(`You clicked refresh`);
    })
  );
}
export function deactivate() {}
