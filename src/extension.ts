// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { vueService } from './webview/service';
import * as SideBar from './webview/siderMenu';
import { VueIconfontHelper } from './webview/iconfont';
import * as fs from 'fs';
import * as path from 'path';
export function activate(context: vscode.ExtensionContext) {
	// 尝试从工作区根目录的 .iconfont.json 读取 cookie
	let cookie = '';
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders && workspaceFolders.length > 0) {
		const configPath = path.join(workspaceFolders[0].uri.fsPath, '.iconfont.json');
		if (fs.existsSync(configPath)) {
			try {
				const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
				if (config.cookie) {
					cookie = config.cookie;
				}
			} catch (e) {
				console.error('读取 .iconfont.json 失败', e);
			}
		}
	}

	// 如果没有找到，则使用 VS Code 配置
	if (!cookie) {
		cookie = vscode.workspace.getConfiguration().get('iconfont.cookie') as string;
	}

	if (!cookie) {
		vscode.window.showErrorMessage('请先登录iconfont官网获取并配置cookie');
		return;
	}
	context!.globalState.update('outExist', fs.existsSync(path.join(context.extensionPath, 'src')) ? '' : 'out') 
	vueService.setCookie(cookie);
	vueService.setContext(context);
	const siderInstance = new SideBar.ListDataProvider();
	// 创建菜单项
	vscode.window.createTreeView('sc-async-iconfont', {
		treeDataProvider: siderInstance
	});
	const iconfontHelper = new VueIconfontHelper(context);
	// 监听菜单项点击事件
	context.subscriptions.push(vscode.commands.registerCommand('sc-async-iconfont.click', async ({ label }) => {
		iconfontHelper.start(label.id);
		vscode.window.showInformationMessage(`You clicked ${ label.label }`);
	}));
	// 全量更新icons
	context.subscriptions.push(vscode.commands.registerCommand('sc-async-iconfont.refresh', () => {
		iconfontHelper.updateOperation();
		setTimeout(() => {
			siderInstance.refresh();
		});
		vscode.window.showInformationMessage(`You clicked refresh`);
	}));
}
export function deactivate() { }
