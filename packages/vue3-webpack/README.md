# @micro-app-adapter/vue3-webpack

Vue 3 + Webpack 项目的微前端生命周期适配器，帮助 Vue 3 子应用快速接入微前端框架。

## 功能特性

### 核心功能

- ✅ **生命周期管理** - 自动注册 mount/unmount 生命周期
- ✅ **独立运行支持** - 非微前端环境下自动启动应用
- ✅ **路由同步** - 主子应用路由双向同步
- ✅ **数据通信** - 监听主应用下发的数据
- ✅ **环境判断** - 检测微前端运行环境
- ✅ **TypeScript 支持** - 完整的类型定义
- ✅ **public-path 支持** - 动态公共路径配置

### 技术特点

- 📦 **双模块格式** - 同时输出 ESM 和 CJS
- 🎯 **Vue 3 组合式 API** - 提供完整的 Composition API 支持
- 💪 **TypeScript** - 完整类型支持
- 🧩 **组件化** - 提供开箱即用的路由组件
- 📤 **多入口** - 支持独立引入 public-path 和 route-sync

## 安装

```bash
pnpm add @micro-app-adapter/vue3-webpack

# 或
npm install @micro-app-adapter/vue3-webpack

# 或
yarn add @micro-app-adapter/vue3-webpack
```

## 版本要求

- Vue >= 3.0.0
- Vue-Router >= 4.0.0 (可选)

## 快速开始

### 1. 配置 public-path（重要）

在应用入口文件**最顶部**引入：

```ts
// main.ts
import '@micro-app-adapter/vue3-webpack/public-path';

// 其他导入...
import { createApp } from 'vue';
import App from './App.vue';
```

> ⚠️ **注意**: public-path 必须在所有其他导入之前引入，以确保资源路径正确。

### 2. 注册生命周期

```ts
// main.ts
import '@micro-app-adapter/vue3-webpack/public-path';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { registerVueMicroApp } from '@micro-app-adapter/vue3-webpack';

// 注册微前端生命周期
registerVueMicroApp(App, {
  appName: 'vue3-webpack-sub-app',
  router,           // 可选
  mountId: '#app'   // 可选，默认 '#app'
});
```

### 3. 路由同步方案

#### 方案一：使用 MicroAppRouter 组件（推荐）

```vue
<!-- App.vue -->
<template>
  <MicroAppRouter
    :routes="routes"
    default-path="/home"
    :basename="basename"
    history-mode="hash"
  />
</template>

<script setup lang="ts">
import { MicroAppRouter, RouteConfig, getBasename } from '@micro-app-adapter/vue3-webpack';
import Home from './pages/Home.vue';
import About from './pages/About.vue';
import User from './pages/User.vue';

const basename = getBasename();

const routes: RouteConfig[] = [
  { path: '/home', component: Home },
  { path: '/about', component: About },
  { path: '/user', component: User },
];
</script>
```

#### 方案二：使用 MicroAppRouteView + MicroAppDataListener

```vue
<!-- App.vue -->
<template>
  <div v-if="isMicroApp()">
    <MicroAppDataListener :on-route-change="handleRouteChange" />
    <MicroAppRouteView 
      :routes="routes" 
      default-path="/home"
      :fallback="NotFound"
    />
  </div>
  <div v-else>
    <!-- 独立运行时的路由 -->
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { 
  isMicroApp, 
  MicroAppDataListener, 
  MicroAppRouteView,
  RouteConfig 
} from '@micro-app-adapter/vue3-webpack';
import NotFound from './pages/NotFound.vue';

const routes: RouteConfig[] = [
  { path: '/home', component: Home },
  { path: '/about', component: About },
];

const handleRouteChange = (data: { path: string; event?: string }) => {
  console.log('路由变化:', data.path, data.event);
};
</script>
```

#### 方案三：手动路由同步（使用 Composition API）

```vue
<!-- App.vue -->
<template>
  <div>
    <MicroAppDataListener />
    <component :is="currentComponent" />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { 
  isMicroApp, 
  useMicroAppRouteSync, 
  useMicroAppNavigate,
  MicroAppDataListener 
} from '@micro-app-adapter/vue3-webpack';

const { ready, targetPath } = useMicroAppRouteSync();
const { navigate } = useMicroAppNavigate();

// 根据路径动态渲染组件
const currentComponent = computed(() => {
  if (!ready.value) return null;
  return getComponentByPath(targetPath.value);
});

// 监听路由变化
watch(targetPath, (newPath) => {
  console.log('目标路径:', newPath);
});
</script>
```

## API 文档

### registerVueMicroApp

注册 Vue 应用的微前端生命周期。

```ts
function registerVueMicroApp(
  AppComponent: Component,
  options: RegisterVueMicroAppOptions
): void;

interface RegisterVueMicroAppOptions {
  appName: string;      // 子应用名称
  router?: Router;      // Vue Router 实例（可选）
  mountId?: string;     // 挂载容器选择器，默认 '#app'
}
```

**使用示例：**

```ts
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import { registerVueMicroApp } from '@micro-app-adapter/vue3-webpack';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/home', component: Home },
    { path: '/about', component: About },
  ]
});

registerVueMicroApp(App, {
  appName: 'vue3-sub-app',
  router,
  mountId: '#app'
});
```

---

### public-path

动态设置 Webpack 公共路径。

```ts
// 在入口文件顶部引入
import '@micro-app-adapter/vue3-webpack/public-path';
```

**工作原理：**

```ts
if (window.__MICRO_APP_ENVIRONMENT__) {
  __webpack_public_path__ = window.__MICRO_APP_PUBLIC_PATH__ || '/';
}
```

---

### isMicroApp

判断当前是否运行在微前端环境。

```ts
function isMicroApp(): boolean;
```

---

### getBasename

获取微前端基础路由。

```ts
function getBasename(): string;
```

---

### useMicroAppRouteSync

获取路由同步状态的 Hook。

```ts
function useMicroAppRouteSync(): UseMicroAppRouteSyncResult;

interface UseMicroAppRouteSyncResult {
  ready: Ref<boolean>;
  targetPath: Ref<string>;
}
```

---

### useMicroAppNavigate

获取导航函数的 Hook。

```ts
function useMicroAppNavigate(): { navigate: (path: string) => void };
```

**导航行为：**

| 环境 | 行为 |
|-----|------|
| 微前端环境 | 更新状态 + 通知主应用 + 同步到全局数据 |
| 独立运行 | 更新 hash 路由 |

---

### useMicroAppDataListener

数据监听 Hook。

```ts
function useMicroAppDataListener(
  onRouteChange?: (data: { path: string; event?: string }) => void
): void;
```

---

### MicroAppDataListener

数据监听组件。

```ts
interface MicroAppDataListenerProps {
  onRouteChange?: (data: { path: string; event?: string }) => void;
}

const MicroAppDataListener: Component;
```

**事件类型：**

| 事件 | 说明 |
|-----|------|
| `beforeShow` | 子应用即将显示 |
| `afterShow` | 子应用已显示 |
| `undefined` | 普通路由切换 |

---

### MicroAppRouteView

路由视图组件。

```ts
interface MicroAppRouteViewProps {
  routes: RouteConfig[];
  defaultPath?: string;
  fallback?: Component;
}

interface RouteConfig {
  path: string;
  component: Component;
  children?: RouteConfig[];
}
```

---

### MicroAppRouter

一体化路由组件。

```ts
interface MicroAppRouterProps {
  routes: RouteConfig[];
  defaultPath?: string;
  basename?: string;
  historyMode?: 'hash' | 'history';
  fallback?: Component;
}
```

## 模块导出

适配器提供三个入口：

### 主入口

```ts
import { 
  registerVueMicroApp,
  isMicroApp,
  getBasename,
  MicroAppRouter,
  useMicroAppRouteSync,
  // ...
} from '@micro-app-adapter/vue3-webpack';
```

### public-path 入口

```ts
import '@micro-app-adapter/vue3-webpack/public-path';
```

### route-sync 入口

```ts
// 独立引入路由同步功能
import { 
  useMicroAppRouteSync,
  useMicroAppNavigate,
  MicroAppRouter
} from '@micro-app-adapter/vue3-webpack/route-sync';
```

## 类型导出

```ts
export type { 
  RegisterVueMicroAppOptions,
  MicroAppLifecycle,
  MicroAppRouteState,
  UseMicroAppRouteSyncResult,
  RouteConfig,
  MicroAppRouterProps
};
```

## 全局类型扩展

```ts
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
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  }
};
```

## 主应用配置示例

```html
<micro-app 
  name="vue3-webpack-sub-app"
  url="http://localhost:8080"
  baseroute="/sub-app"
></micro-app>
```

## 完整示例

```ts
// main.ts
import '@micro-app-adapter/vue3-webpack/public-path';
import { registerVueMicroApp } from '@micro-app-adapter/vue3-webpack';
import App from './App.vue';
import router from './router';

registerVueMicroApp(App, {
  appName: 'vue3-webpack-sub-app',
  router,
  mountId: '#app'
});
```

```vue
<!-- App.vue -->
<template>
  <MicroAppRouter
    :routes="routes"
    default-path="/home"
    :basename="basename"
  />
</template>

<script setup lang="ts">
import { MicroAppRouter, RouteConfig, getBasename } from '@micro-app-adapter/vue3-webpack';
import Home from './pages/Home.vue';
import About from './pages/About.vue';

const basename = getBasename();

const routes: RouteConfig[] = [
  { path: '/home', component: Home },
  { path: '/about', component: About },
];
</script>
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

## 与 vue3-vite 版本的差异

| 特性 | vue3-webpack | vue3-vite |
|-----|--------------|-----------|
| 输出格式 | ESM + CJS | ESM |
| public-path | **必须引入** | 不需要 |
| route-sync 独立入口 | ✅ 支持 | ❌ 无 |
| 构建工具 | father (双格式) | father (ESM only) |
| 兼容性 | 更广泛 | 现代浏览器 |

## 注意事项

1. **public-path 必须最先引入**: 确保在所有其他导入之前
2. **Vue 版本**: 要求 Vue 3.0+
3. **路由库**: 可选使用 vue-router 4.0+，或使用内置路由组件
4. **构建输出**: 同时输出 ESM 和 CJS 格式

## 常见问题

### 1. 资源加载 404？

确保正确引入了 public-path 模块，且在入口文件最顶部。

### 2. 样式加载异常？

检查 Webpack 的 publicPath 配置，确保与微前端环境兼容。

### 3. 路由不同步？

检查主应用是否正确下发了路由数据，子应用是否正确使用了路由同步组件。

## License

MIT
