import { workspace, Uri } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigType } from './interface';

export class ConfigurationManager {
  /**
   * Get configuration for a specific workspace folder.
   * Merges VS Code settings with .iconfont.json (if exists).
   * .iconfont.json takes precedence.
   */
  static getConfig(workspaceFolderUri: Uri): ConfigType {
    const config = workspace.getConfiguration('iconfont', workspaceFolderUri);
    
    // Read from VS Code settings
    // Note: We use empty string as fallback for paths to avoid "undefined" string conversion issues
    const vsCodeConfig: ConfigType = {
      projectUrl: workspaceFolderUri.fsPath,
      projectName: path.basename(workspaceFolderUri.fsPath),
      transionMethod: config.get<string>('transionMethod') || 'svg',
      transionSvgDir: config.get<string>('transionSvgDir') || '',
      transionFontClassDir: config.get<string>('transionFontClassDir') || '',
      transionSymbolJsDir: config.get<string>('transionSymbolJsDir') || '',
      symbolJsWiteTemplateDir: config.get<string>('symbolJsWiteTemplateDir') || 'false',
      cookie: config.get<string>('cookie'),
    };

    // Normalize paths from VS Code settings (remove backslashes)
    // This matches the original logic: String(getConfig.get(...)).replace("\\", "/")
    vsCodeConfig.transionSvgDir = String(vsCodeConfig.transionSvgDir).replace(/\\/g, '/');
    vsCodeConfig.transionFontClassDir = String(vsCodeConfig.transionFontClassDir).replace(/\\/g, '/');
    vsCodeConfig.transionSymbolJsDir = String(vsCodeConfig.transionSymbolJsDir).replace(/\\/g, '/');
    vsCodeConfig.symbolJsWiteTemplateDir = String(vsCodeConfig.symbolJsWiteTemplateDir).replace(/\\/g, '/');

    // Read from .iconfont.json
    const configPath = path.join(workspaceFolderUri.fsPath, '.iconfont.json');
    let fileConfig: Partial<ConfigType> = {};
    
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        fileConfig = JSON.parse(content);
      } catch (e) {
        console.error(`Failed to read .iconfont.json at ${configPath}`, e);
      }
    }

    // Merge: file config overrides VS Code config
    const finalConfig = { ...vsCodeConfig, ...fileConfig };

    return finalConfig;
  }
}
