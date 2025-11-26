import * as vscode from 'vscode';
import { vueService } from './service';
// 实现列表数据提供程序
export class ListDataProvider implements vscode.TreeDataProvider<ListItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ListItem | undefined> = new vscode.EventEmitter<ListItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<ListItem | undefined> = this._onDidChangeTreeData.event;
	async getChildren(element?: ListItem) {
		const list = await vueService.getProject();
		const data = list.map(item => new ListItem({ label: item.name, id: item.id }));
		return Promise.resolve(data);
	}
	getTreeItem(element: ListItem): vscode.TreeItem {
		return element;
	}
	// 添加此方法以更新树数据
	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}
}

// 列表项类
class ListItem extends vscode.TreeItem {
	constructor(
		public readonly label: {label:string,id:string},
	) {
		super(label);
		this.command = {
			command: 'sc-async-iconfont.click',
			title: 'Click',
			arguments: [this]
		};
	}
}