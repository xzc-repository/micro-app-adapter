# @micro-app-adapter/react-vite

React + Vite 项目的微前端生命周期适配器，帮助 React 子应用快速接入微前端框架。

## 功能特性

### 核心功能

- ✅ **生命周期管理** - 自动注册 mount/unmount 生命周期
- ✅ **独立运行支持** - 非微前端环境下自动启动应用
- ✅ **路由同步** - 主子应用路由双向同步
- ✅ **数据通信** - 监听主应用下发的数据
- ✅ **环境判断** - 检测微前端运行环境
- ✅ **TypeScript 支持** - 完整的类型定义

### 技术特点

- 🚀 **ESM 输出** - 原生 ES Module，符合 Vite 生态
- 📦 **零配置** - 开箱即用，无需复杂配置
- 🎯 **React 16.8+** - 支持 React 16.8+ 和 React 17/18
- 💪 **TypeScript** - 完整类型支持

## 安装

```bash
pnpm add @micro-app-adapter/react-vite

# 或
npm install @micro-app-adapter/react-vite

# 或
yarn add @micro-app-adapter/react-vite
```

## 版本要求

- React >= 16.8.0
- React-DOM >= 16.8.0
- React-Router-DOM >= 6.0.0 (可选)

## 快速开始

### 1. 基础接入

修改你的应用入口文件：

```tsx
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerReactMicroApp } from '@micro-app-adapter/react-vite';

// 注册微前端生命周期
registerReactMicroApp(React, ReactDOM, App, {
  appName: 'react-vite-sub-app',
  containerId: 'root'  // 可选，默认为 'root'
});
```

### 2. 路由同步方案

#### 方案一：使用 MicroAppRouter 组件（推荐）

```tsx
// App.tsx
import React from 'react';
import { MicroAppRouter, RouteConfig } from '@micro-app-adapter/react-vite';
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
import React, { useEffect } from 'react';
import { 
  isMicroApp, 
  getBasename, 
  useMicroAppNavigate,
  MicroAppDataListener 
} from '@micro-app-adapter/react-vite';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

function RouteSync() {
  const navigate = useNavigate();
  useMicroAppNavigate(navigate);
  return null;
}

function App() {
  const basename = getBasename();
  
  return (
    <>
      {/* 数据监听器 */}
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

#### 方案三：使用 MicroAppRouteView（轻量级）

```tsx
// App.tsx
import React from 'react';
import { 
  MicroAppRouteView, 
  MicroAppDataListener,
  isMicroApp 
} from '@micro-app-adapter/react-vite';
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

**使用示例：**

```tsx
registerReactMicroApp(React, ReactDOM, App, {
  appName: 'my-app',
  containerId: 'root'
});
```

**生命周期注册规则：**

- 注册到 `window['micro-app-{appName}']`
- 提供 `mount` 和 `unmount` 方法
- 非微前端环境自动调用 `mount`

---

### isMicroApp

判断当前是否运行在微前端环境。

```tsx
function isMicroApp(): boolean;
```

**使用示例：**

```tsx
if (isMicroApp()) {
  console.log('运行在微前端环境');
  console.log('子应用名称:', window.__MICRO_APP_NAME__);
}
```

---

### getBasename

获取微前端基础路由。

```tsx
function getBasename(): string;
```

**使用示例：**

```tsx
const basename = getBasename(); // 返回 '/sub-app' 或 '/'
```

---

### createMicroAppRouteState

创建路由状态管理对象。

```tsx
function createMicroAppRouteState(): MicroAppRouteState;

interface MicroAppRouteState {
  ready: boolean;
  targetPath: string;
  listeners: Set<() => void>;
  subscribe: (listener: () => void) => () => void;
  notify: () => void;
  setPath: (path: string) => void;
  reset(): void;
}
```

---

### useMicroAppRouteSync

获取路由同步状态的 Hook。

```tsx
function useMicroAppRouteSync(): UseMicroAppRouteSyncResult;

interface UseMicroAppRouteSyncResult {
  ready: boolean;      // 路由是否就绪
  targetPath: string;  // 目标路径
}
```

**使用示例：**

```tsx
function MyComponent() {
  const { ready, targetPath } = useMicroAppRouteSync();
  
  if (!ready) return <div>加载中...</div>;
  
  return <div>当前路径: {targetPath}</div>;
}
```

---

### useMicroAppNavigate

路由导航同步 Hook。

```tsx
function useMicroAppNavigate(navigate: NavigateFunction): UseMicroAppRouteSyncResult;
```

**使用示例：**

```tsx
import { useNavigate } from 'react-router-dom';

function RouteSync() {
  const navigate = useNavigate();
  const { ready, targetPath } = useMicroAppNavigate(navigate);
  
  return null;
}
```

---

### MicroAppDataListener

数据监听组件，监听主应用下发的路由数据。

```tsx
interface MicroAppDataListenerProps {
  onRouteChange?: (data: { path: string; event?: string }) => void;
}

function MicroAppDataListener(props: MicroAppDataListenerProps): JSX.Element | null;
```

**使用示例：**

```tsx
<MicroAppDataListener 
  onRouteChange={(data) => {
    console.log('路径:', data.path);
    console.log('事件:', data.event); // 'beforeShow' | 'afterShow' | undefined
  }} 
/>
```

**事件类型：**

| 事件 | 说明 |
|-----|------|
| `beforeShow` | 子应用即将显示 |
| `afterShow` | 子应用已显示 |
| `undefined` | 普通路由切换 |

---

### MicroAppRouteView

路由视图组件，根据目标路径渲染对应组件。

```tsx
interface MicroAppRouteViewProps {
  routes: RouteConfig[];       // 路由配置
  defaultPath?: string;        // 默认路径，默认 '/home'
  fallback?: React.ComponentType;  // 找不到路由时的回退组件
}

interface RouteConfig {
  path: string;
  component: React.ComponentType;
}
```

**使用示例：**

```tsx
const routes: RouteConfig[] = [
  { path: '/home', component: Home },
  { path: '/about', component: About },
];

<MicroAppRouteView 
  routes={routes} 
  defaultPath="/home"
  fallback={NotFound}
/>
```

---

### MicroAppRouter

一体化路由组件，自动处理微前端和独立运行两种模式。

```tsx
interface MicroAppRouterProps {
  Router: React.ComponentType<{basename?: string; children?: React.ReactNode}>;
  routes: RouteConfig[];
  defaultPath?: string;
  fallback?: React.ComponentType;
  basename?: string;
}
```

**特性：**

- 微前端环境：使用 MemoryRouter，监听主应用路由
- 独立运行：使用传入的 Router（如 BrowserRouter）
- 自动处理路由同步

**使用示例：**

```tsx
import { BrowserRouter } from 'react-router-dom';

<MicroAppRouter
  Router={BrowserRouter}
  routes={routes}
  defaultPath="/home"
  basename="/sub-app"
/>
```

## 类型导出

```tsx
// 接口类型
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

适配器会扩展 Window 接口：

```tsx
declare global {
  interface Window {
    __MICRO_APP_ENVIRONMENT__: boolean;  // 是否微前端环境
    __MICRO_APP_NAME__: string;          // 子应用名称
    __MICRO_APP_BASE_URL__: string;      // 基础URL
    __MICRO_APP_PUBLIC_PATH__: string;   // 公共路径
    [key: string]: any;
  }
}
```

## 主应用配置示例

```html
<!-- 主应用中嵌入子应用 -->
<micro-app 
  name="react-vite-sub-app"
  url="http://localhost:5173"
  baseroute="/sub-app"
></micro-app>
```

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

1. **不需要 public-path**: Vite 项目无需配置 public-path
2. **React 版本**: 要求 React 16.8+，推荐使用 React 18
3. **路由库**: 使用 react-router-dom v6+
4. **构建输出**: 仅输出 ESM 格式

## 与 react-webpack 版本的差异

| 特性 | react-vite | react-webpack |
|-----|-----------|---------------|
| 输出格式 | ESM | ESM + CJS |
| public-path | 不需要 | 需要引入 |
| React 最低版本 | 16.8.0 | 16.8.0 |
| useSyncExternalStore | 原生使用 | 提供 shim |

## License

MIT
