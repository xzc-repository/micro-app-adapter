# @micro-app-adapter/vue3-vite

Vue 3 + Vite 项目的微前端生命周期适配器，帮助 Vue 3 子应用快速接入微前端框架。

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
- 🎯 **Vue 3 组合式 API** - 提供完整的 Composition API 支持
- 💪 **TypeScript** - 完整类型支持
- 🧩 **组件化** - 提供开箱即用的路由组件

## 安装

```bash
pnpm add @micro-app-adapter/vue3-vite

# 或
npm install @micro-app-adapter/vue3-vite

# 或
yarn add @micro-app-adapter/vue3-vite
```

## 版本要求

- Vue >= 3.0.0
- Vue-Router >= 4.0.0 (可选)

## 快速开始

### 1. 基础接入

```ts
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { registerVueMicroApp } from '@micro-app-adapter/vue3-vite';

// 注册微前端生命周期
registerVueMicroApp(App, {
  appName: 'vue3-vite-sub-app',
  router,           // 可选
  mountId: '#app'   // 可选，默认 '#app'
});
```

### 2. 路由同步方案

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
import { MicroAppRouter, RouteConfig, getBasename } from '@micro-app-adapter/vue3-vite';
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
} from '@micro-app-adapter/vue3-vite';
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
} from '@micro-app-adapter/vue3-vite';

const { ready, targetPath } = useMicroAppRouteSync();
const { navigate } = useMicroAppNavigate();

// 根据路径动态渲染组件
const currentComponent = computed(() => {
  if (!ready.value) return null;
  // 根据targetPath返回对应组件
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
import { registerVueMicroApp } from '@micro-app-adapter/vue3-vite';

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

**生命周期注册规则：**

- 注册到 `window['micro-app-{appName}']`
- 提供 `mount` 和 `unmount` 方法
- 非微前端环境自动调用 `mount`

---

### isMicroApp

判断当前是否运行在微前端环境。

```ts
function isMicroApp(): boolean;
```

**使用示例：**

```vue
<template>
  <div v-if="isMicroApp()">微前端环境</div>
  <div v-else>独立运行</div>
</template>

<script setup>
import { isMicroApp } from '@micro-app-adapter/vue3-vite';
</script>
```

---

### getBasename

获取微前端基础路由。

```ts
function getBasename(): string;
```

**使用示例：**

```ts
const basename = getBasename(); // 返回 '/sub-app' 或 '/'
```

---

### createMicroAppRouteState

创建路由状态管理对象。

```ts
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

```ts
function useMicroAppRouteSync(): UseMicroAppRouteSyncResult;

interface UseMicroAppRouteSyncResult {
  ready: Ref<boolean>;      // 路由是否就绪
  targetPath: Ref<string>;  // 目标路径
}
```

**使用示例：**

```vue
<template>
  <div v-if="!ready">加载中...</div>
  <div v-else>当前路径: {{ targetPath }}</div>
</template>

<script setup>
import { useMicroAppRouteSync } from '@micro-app-adapter/vue3-vite';

const { ready, targetPath } = useMicroAppRouteSync();
</script>
```

---

### useMicroAppNavigate

获取导航函数的 Hook。

```ts
function useMicroAppNavigate(): { navigate: (path: string) => void };
```

**使用示例：**

```vue
<template>
  <button @click="handleNavigate('/home')">跳转首页</button>
  <button @click="handleNavigate('/about')">跳转关于</button>
</template>

<script setup>
import { useMicroAppNavigate } from '@micro-app-adapter/vue3-vite';

const { navigate } = useMicroAppNavigate();

const handleNavigate = (path: string) => {
  navigate(path);
  // 微前端环境：同步到主应用
  // 独立运行：更新 hash 路由
};
</script>
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

**使用示例：**

```vue
<script setup>
import { useMicroAppDataListener } from '@micro-app-adapter/vue3-vite';

useMicroAppDataListener((data) => {
  console.log('路径:', data.path);
  console.log('事件:', data.event);
});
</script>
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

**使用示例：**

```vue
<template>
  <MicroAppDataListener :on-route-change="handleRouteChange" />
</template>

<script setup>
import { MicroAppDataListener } from '@micro-app-adapter/vue3-vite';

const handleRouteChange = (data) => {
  console.log('路由变化:', data);
};
</script>
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
  routes: RouteConfig[];       // 路由配置
  defaultPath?: string;        // 默认路径，默认 '/home'
  fallback?: Component;        // 找不到路由时的回退组件
}

interface RouteConfig {
  path: string;
  component: Component;
  children?: RouteConfig[];    // 支持嵌套路由
}

const MicroAppRouteView: Component;
```

**使用示例：**

```vue
<template>
  <MicroAppRouteView 
    :routes="routes" 
    default-path="/home"
    :fallback="NotFound"
  />
</template>

<script setup>
import { MicroAppRouteView } from '@micro-app-adapter/vue3-vite';
import NotFound from './pages/NotFound.vue';

const routes = [
  { path: '/home', component: Home },
  { path: '/about', component: About },
  { 
    path: '/user', 
    component: User,
    children: [
      { path: '/user/profile', component: Profile }
    ]
  },
];
</script>
```

---

### MicroAppRouter

一体化路由组件，自动处理微前端和独立运行两种模式。

```ts
interface MicroAppRouterProps {
  routes: RouteConfig[];
  defaultPath?: string;        // 默认 '/home'
  basename?: string;           // 基础路径，默认 '/'
  historyMode?: 'hash' | 'history';  // 路由模式，默认 'hash'
  fallback?: Component;        // 回退组件
}

const MicroAppRouter: Component;
```

**特性：**

- 微前端环境：使用内置路由系统，监听主应用数据
- 独立运行：使用简单的 hash/history 路由
- 自动处理路由同步和状态管理
- 提供 router context 供子组件使用

**使用示例：**

```vue
<template>
  <MicroAppRouter
    :routes="routes"
    default-path="/home"
    basename="/sub-app"
    history-mode="hash"
  />
</template>

<script setup>
import { MicroAppRouter, getBasename } from '@micro-app-adapter/vue3-vite';

const basename = getBasename();

const routes = [
  { path: '/home', component: Home },
  { path: '/about', component: About },
];
</script>
```

## 类型导出

```ts
// 接口类型
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
<micro-app 
  name="vue3-vite-sub-app"
  url="http://localhost:5173"
  baseroute="/sub-app"
></micro-app>
```

## 完整示例

```ts
// main.ts
import { registerVueMicroApp } from '@micro-app-adapter/vue3-vite';
import App from './App.vue';
import router from './router';

registerVueMicroApp(App, {
  appName: 'vue3-vite-sub-app',
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
import { MicroAppRouter, RouteConfig, getBasename } from '@micro-app-adapter/vue3-vite';
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

## 注意事项

1. **不需要 public-path**: Vite 项目无需配置 public-path
2. **Vue 版本**: 要求 Vue 3.0+
3. **路由库**: 可选使用 vue-router 4.0+，或使用内置路由组件
4. **构建输出**: 仅输出 ESM 格式

## 与 vue3-webpack 版本的差异

| 特性 | vue3-vite | vue3-webpack |
|-----|----------|--------------|
| 输出格式 | ESM | ESM + CJS |
| public-path | 不需要 | 需要引入 |
| route-sync 入口 | 无独立入口 | 有独立入口 |
| 构建工具 | father (ESM only) | father (ESM + CJS) |

## License

MIT
