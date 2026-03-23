# @micro-app-adapter/react-webpack

React + Webpack 项目的微前端生命周期适配器，帮助 React 子应用快速接入微前端框架。

## 功能特性

### 核心功能

| 功能模块 | 功能描述 | 关键API |
|---------|---------|--------|
| 生命周期管理 | 自动注册 mount/unmount 生命周期到 window 对象 | `registerReactMicroApp` |
| 独立运行支持 | 非微前端环境下自动启动应用，无需修改代码 | 自动检测 `__MICRO_APP_ENVIRONMENT__` |
| 路由同步 | 主子应用路由双向同步，支持声明式和编程式导航 | `MicroAppRouter`, `useMicroAppNavigate` |
| 数据通信 | 监听主应用下发的数据变化，支持路由事件监听 | `MicroAppDataListener`, `useMicroAppDataListener` |
| 环境判断 | 检测微前端运行环境，获取基础路由等信息 | `isMicroApp`, `getBasename` |
| TypeScript 支持 | 完整的类型定义，提供良好的开发体验 | 所有API均有类型定义 |
| public-path 支持 | 动态设置 Webpack 公共路径，解决资源加载问题 | `import '@micro-app-adapter/react-webpack/public-path'` |

### 技术特点

| 特性 | 说明 |
|-----|------|
| 📦 双模块格式 | 同时输出 ESM 和 CJS 格式，兼容不同的模块系统 |
| 🔄 React 兼容性 | 支持 React 16.8+ 和 React 18，自动检测版本并选择合适的渲染 API |
| 🎯 API Shim | 为 React <18 提供 useSyncExternalStore 兼容实现 |
| 💪 TypeScript | 完整类型支持，提供优秀的IDE提示 |
| 🔧 public-path | 提供动态公共路径配置，解决微前端资源加载问题 |

## 安装

```bash
pnpm add @micro-app-adapter/react-webpack

# 或
npm install @micro-app-adapter/react-webpack

# 或
yarn add @micro-app-adapter/react-webpack
```

## 版本要求

| 依赖包 | 版本要求 | 说明 |
|-------|---------|------|
| React | >=16.8.0 | 支持 Hooks，自动适配 React 16.8-18+ |
| React-DOM | >=16.8.0 | 与 React 版本保持一致 |
| React-Router-DOM | >=6.0.0 | 可选，路由同步功能需要 |

### React 版本兼容性详情

| React 版本 | 支持状态 | 渲染 API | 卸载 API | 说明 |
|-----------|---------|---------|---------|------|
| React 18.x | ✅ 完整支持 | createRoot | root.unmount() | 推荐版本，支持并发特性 |
| React 17.x | ✅ 完整支持 | ReactDOM.render | unmountComponentAtNode | 自动检测并使用传统API |
| React 16.8+ | ✅ 完整支持 | ReactDOM.render | unmountComponentAtNode | 最低支持版本 |

### useSyncExternalStore 兼容性

| React 版本 | 支持方式 | 说明 |
|-----------|---------|------|
| React 18+ | 原生支持 | 使用 React 内置的 useSyncExternalStore |
| React <18 | Shim 实现 | 适配器提供兼容实现，无需额外配置 |

## 快速开始

### 1. 配置 public-path（重要）

在应用入口文件**最顶部**引入：

```tsx
// main.tsx 或 index.tsx
import '@micro-app-adapter/react-webpack/public-path';

// 其他导入...
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
```

> ⚠️ **注意**: public-path 必须在所有其他导入之前引入，以确保资源路径正确。

### 2. 注册生命周期

```tsx
// main.tsx
import '@micro-app-adapter/react-webpack/public-path';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerReactMicroApp } from '@micro-app-adapter/react-webpack';

// 注册微前端生命周期
registerReactMicroApp(React, ReactDOM, App, {
  appName: 'react-webpack-sub-app',
  containerId: 'root'  // 可选，默认为 'root'
});
```

### 3. 路由同步方案

#### 方案一：使用 MicroAppRouter 组件（推荐）

```tsx
// App.tsx
import React from 'react';
import { MicroAppRouter, RouteConfig } from '@micro-app-adapter/react-webpack';
import { BrowserRouter } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';

const routes: RouteConfig[] = [
  { path: '/home', component: Home },
  { path: '/about', component: About },
  { path: '/user', component: User },
];

function App() {
  return (
    <MicroAppRouter
      Router={BrowserRouter}
      routes={routes}
      defaultPath="/home"
      basename={window.__MICRO_APP_BASE_ROUTE__ || '/'}
    />
  );
}

export default App;
```

#### 方案二：手动路由同步

```tsx
// App.tsx
import React from 'react';
import { 
  isMicroApp, 
  getBasename, 
  useMicroAppNavigate,
  MicroAppDataListener 
} from '@micro-app-adapter/react-webpack';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

function RouteSync() {
  const navigate = useNavigate();
  useMicroAppNavigate(navigate);
  return null;
}

function App() {
  const basename = getBasename();
  
  return (
    <>
      <MicroAppDataListener onRouteChange={(data) => {
        console.log('路由变化:', data.path, data.event);
      }} />
      
      <BrowserRouter basename={basename}>
        <RouteSync />
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
```

#### 方案三：使用 MicroAppRouteView

```tsx
// App.tsx
import React from 'react';
import { 
  MicroAppRouteView, 
  MicroAppDataListener,
  isMicroApp 
} from '@micro-app-adapter/react-webpack';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const routes = [
  { path: '/home', component: Home },
  { path: '/about', component: About },
];

function App() {
  if (isMicroApp()) {
    return (
      <>
        <MicroAppDataListener />
        <MicroAppRouteView routes={routes} defaultPath="/home" />
      </>
    );
  }
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## API 文档

### registerReactMicroApp

注册 React 应用的微前端生命周期。

```tsx
function registerReactMicroApp(
  React: any,
  ReactDOM: any,
  AppComponent: React.ComponentType,
  options: RegisterReactMicroAppOptions
): void;

interface RegisterReactMicroAppOptions {
  appName: string;      // 子应用名称
  containerId?: string; // 挂载容器ID，默认 'root'
}
```

**React 版本兼容性：**

适配器会自动检测 React 版本并选择合适的渲染方式：

| React 版本 | 渲染方式 |
|-----------|---------|
| React 18+ | `createRoot` + `root.unmount()` |
| React 16.8-17 | `ReactDOM.render` + `unmountComponentAtNode` |

**使用示例：**

```tsx
// React 18
import { createRoot } from 'react-dom/client';
registerReactMicroApp(React, { createRoot }, App, { appName: 'my-app' });

// React 17
import ReactDOM from 'react-dom';
registerReactMicroApp(React, ReactDOM, App, { appName: 'my-app' });
```

---

### public-path

动态设置 Webpack 公共路径。

```tsx
// 在入口文件顶部引入
import '@micro-app-adapter/react-webpack/public-path';
```

**工作原理：**

```ts
if (window.__MICRO_APP_ENVIRONMENT__) {
  __webpack_public_path__ = window.__MICRO_APP_PUBLIC_PATH__ || '/';
}
```

在微前端环境下，自动将 Webpack 的公共路径设置为子应用的资源路径。

---

### isMicroApp

判断当前是否运行在微前端环境。

```tsx
function isMicroApp(): boolean;
```

---

### getBasename

获取微前端基础路由。

```tsx
function getBasename(): string;
```

---

### useMicroAppRouteSync

获取路由同步状态的 Hook。

```tsx
function useMicroAppRouteSync(): UseMicroAppRouteSyncResult;

interface UseMicroAppRouteSyncResult {
  ready: boolean;
  targetPath: string;
}
```

> **兼容性说明**: 对于不支持 `useSyncExternalStore` 的 React 版本（< 18），适配器提供了兼容 shim。

---

### useMicroAppNavigate

路由导航同步 Hook。

```tsx
function useMicroAppNavigate(navigate: NavigateFunction): UseMicroAppRouteSyncResult;
```

---

### MicroAppDataListener

数据监听组件。

```tsx
interface MicroAppDataListenerProps {
  onRouteChange?: (data: { path: string; event?: string }) => void;
}
```

---

### MicroAppRouteView

路由视图组件。

```tsx
interface MicroAppRouteViewProps {
  routes: RouteConfig[];
  defaultPath?: string;
  fallback?: React.ComponentType;
}
```

---

### MicroAppRouter

一体化路由组件。

```tsx
interface MicroAppRouterProps {
  Router: React.ComponentType<{basename?: string; children?: React.ReactNode}>;
  routes: RouteConfig[];
  defaultPath?: string;
  fallback?: React.ComponentType;
  basename?: string;
}
```

## 模块导出

适配器提供两个入口：

### 主入口

```tsx
import { 
  registerReactMicroApp,
  isMicroApp,
  getBasename,
  MicroAppRouter,
  // ...
} from '@micro-app-adapter/react-webpack';
```

### public-path 入口

```tsx
import '@micro-app-adapter/react-webpack/public-path';
```

## 类型导出

```tsx
export type { 
  RegisterReactMicroAppOptions,
  MicroAppLifecycle,
  MicroAppRouteState,
  UseMicroAppRouteSyncResult,
  MicroAppDataListenerProps,
  RouteConfig,
  MicroAppRouteViewProps,
  MicroAppRouterProps
};
```

## 全局类型扩展

```tsx
declare global {
  interface Window {
    __MICRO_APP_ENVIRONMENT__: boolean;
    __MICRO_APP_NAME__: string;
    __MICRO_APP_BASE_URL__: string;
    __MICRO_APP_PUBLIC_PATH__: string;
    [key: string]: any;
  }
  let __webpack_public_path__: string;
}
```

## Webpack 配置建议

```js
// webpack.config.js
module.exports = {
  output: {
    libraryTarget: 'umd',
    globalObject: 'window',
    // publicPath 由适配器动态设置
    publicPath: '/',
  },
  // 确保正确处理 React
  externals: process.env.NODE_ENV === 'production' ? {
    react: 'React',
    'react-dom': 'ReactDOM'
  } : {}
};
```

## 主应用配置示例

```html
<micro-app 
  name="react-webpack-sub-app"
  url="http://localhost:3000"
  baseroute="/sub-app"
></micro-app>
```

## 与 react-vite 版本的差异对比

| 特性 | react-webpack | react-vite |
|-----|--------------|-----------|
| 输出格式 | ESM + CJS | ESM |
| public-path | **必须引入** | 不需要 |
| React 最低版本 | 16.8.0 | 16.8.0 |
| React 18 支持 | 完整支持 + 向后兼容 | 完整支持（createRoot） |
| React <18 支持 | ✅ 完整支持 | ⚠️ 有限支持 |
| 渲染 API | 自动检测版本 | 仅 createRoot |
| useSyncExternalStore | 提供 shim（兼容 React <18） | 原生使用（React 18+） |
| 浏览器兼容性 | 更广泛 | 现代浏览器 |
| 构建工具 | Webpack | Vite |
| 适用场景 | 旧项目迁移、广泛兼容 | 新项目、现代浏览器 |

### 如何选择？

- **选择 react-webpack**：需要兼容 React <18、需要广泛浏览器支持、从旧项目迁移、使用 Webpack 构建
- **选择 react-vite**：新项目、使用 Vite 构建、目标用户使用现代浏览器、React 18+

## 开发调试

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
```

## 注意事项

1. **public-path 必须最先引入**: 确保在所有其他导入之前
2. **React 版本**: 支持 React 16.8+，自动适配渲染 API
3. **路由库**: 使用 react-router-dom v6+
4. **构建输出**: 同时输出 ESM 和 CJS 格式

## 常见问题

### 1. 资源加载 404？

确保正确引入了 public-path 模块，且在入口文件最顶部。

### 2. React 17 及以下版本报错？

适配器已内置兼容处理，如果仍有问题，检查 ReactDOM 的导入方式。

### 3. 样式加载异常？

检查 Webpack 的 publicPath 配置，确保与微前端环境兼容。

## License

MIT
