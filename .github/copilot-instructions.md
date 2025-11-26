# Hz Async Iconfont Copilot Instructions

## Architecture Overview

This VS Code extension facilitates the management and integration of icons from [iconfont.cn](https://www.iconfont.cn/) into local projects.

- **Entry Point**: `src/extension.ts` activates the extension, checks for the required cookie, initializes the `VueService`, and registers the TreeView and commands.
- **Service Layer**: `src/webview/service.ts` (`VueService`) handles all communication with the `iconfont.cn` API using `axios`. It manages authentication (via cookie) and caches project/icon data in `context.globalState`.
- **Webview Manager**: `src/webview/iconfont.ts` (`VueIconfontHelper`) manages the WebviewPanel. It handles the lifecycle of the webview, message passing between the extension and the webview, and file operations (writing SVGs or Symbol JS).
- **TreeView**: `src/webview/siderMenu.ts` implements `vscode.TreeDataProvider` to display the list of iconfont projects in the sidebar.
- **Frontend**: Located in `src/html/`. The webview loads `index.html` and `index.js`. It communicates with the extension host to trigger actions like downloading icons.

## Critical Workflows

- **Build Process**:
  - The `compile` script (and `compile:win` for Windows) copies the `src/html` directory to `out/src/html` before compiling TypeScript.
  - **Important**: When modifying `src/html/`, ensure the build script is run or the `out/src/html` folder is updated, as the extension loads HTML from `out`.
- **Data Caching**:
  - Project lists and icon details are cached in `context.globalState` (`projectInfoState`, `iconJsonState`).
  - Use `sc-async-iconfont.refresh` command to force an update from the API.
- **Iconfont API**:
  - The extension relies on internal `iconfont.cn` APIs (e.g., `/api/user/myprojects.json`). These are subject to change.
  - **Cookie Requirement**: A valid `iconfont.cookie` must be configured in VS Code settings or in `.iconfont.json` (priority: `.iconfont.json` > VS Code settings).

## Project Conventions

- **Configuration**:
  - Supports both VS Code `User Settings` and a local `.iconfont.json` file in the project root.
  - `src/webview/iconfont.ts` -> `checkConfig` validates these settings.
  - **Generated Files**:
    - **Symbol Mode**: Generates `font_symbol_[hash].js`, `iconfont.js` (stable alias), and `iconfont.json` (metadata).
    - **Font Class Mode**: Generates `iconfont.css`, font files (`iconfont.woff2`, etc.), and `iconfont.json` (metadata).
- **Webview Communication**:
  - **Extension to Webview**: `webviewPanel.webview.postMessage({ type: '...', data: ... })`.
  - **Webview to Extension**: `webviewPanel.webview.onDidReceiveMessage`.
  - Message types are defined in `src/interface.ts` (`EventMessage`).
- **File Handling**:
  - Uses `fs` and `path` to write files.
  - `VueIconfontHelper` determines the destination path based on configuration (`transionSvgDir`, `transionSymbolJsDir`).
  - **SVG Handling**: `VueService.judgementColor` replaces fill colors with `currentColor` if the icon is single-color.

## Key Files

- `src/extension.ts`: Extension activation and command registration.
- `src/webview/service.ts`: API interaction and data caching.
- `src/webview/iconfont.ts`: Webview logic and file generation.
- `src/html/index.js`: Frontend logic for the webview (ensure this matches `EventMessage` types).
- `package.json`: Defines commands, views, and configuration properties.

## Development Tips

- **Environment**: Requires Node.js 22+.
- **Debugging**: Use F5 with "Run Extension".
- **Windows Compatibility**: Use `path.join` for file paths. Note the `compile:win` script in `package.json` for Windows-specific build commands.
- **Error Handling**: API errors should be caught and shown to the user via `vscode.window.showErrorMessage`.
