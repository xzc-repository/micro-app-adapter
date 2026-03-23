# Micro-App Adapter

微前端子应用生命周期适配器集合，帮助不同技术栈的子应用快速接入微前端框架。

## 项目简介

本项目提供了一套完整的微前端子应用适配解决方案，支持主流的前端框架和构建工具组合。通过简单的配置，即可让子应用具备微前端环境下的生命周期管理、路由同步、通信等核心能力。

## 技术架构

本项目采用 **pnpm monorepo** 架构，统一管理多个适配器包：

```
micro-app-adapter/
├── packages/
│   ├── react-vite/       # React + Vite 适配器
│   ├── react-webpack/    # React + Webpack 适配器
│   ├── vue3-vite/        # Vue3 + Vite 适配器
│   └── vue3-webpack/     # Vue3 + Webpack 适配器
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 适配器概览

### 包功能说明

| 适配器包 | 适用场景 | 核心功能 |
|---------|---------|---------|
| @micro-app-adapter/react-vite | React + Vite 子应用 | 生命周期管理、路由同步、数据通信、环境检测 |
| @micro-app-adapter/react-webpack | React + Webpack 子应用 | 生命周期管理、路由同步、数据通信、环境检测、public-path |
| @micro-app-adapter/vue3-vite | Vue3 + Vite 子应用 | 生命周期管理、路由同步、数据通信、环境检测 |
| @micro-app-adapter/vue3-webpack | Vue3 + Webpack 子应用 | 生命周期管理、路由同步、数据通信、环境检测、public-path、独立route-sync入口 |

### 技术栈与版本兼容性对比

| 适配器包 | 框架版本 | 构建工具 | 输出格式 | public-path | 特殊功能 |
|---------|---------|---------|---------|------------|---------|
| @micro-app-adapter/react-vite | React >=16.8.0 | Vite | ESM | 不需要 | React 18+ createRoot API |
| @micro-app-adapter/react-webpack | React >=16.8.0 | Webpack | ESM + CJS | **必须引入** | React 版本自动检测、useSyncExternalStore shim |
| @micro-app-adapter/vue3-vite | Vue >=3.0.0 | Vite | ESM | 不需要 | 组合式API支持 |
| @micro-app-adapter/vue3-webpack | Vue >=3.0.0 | Webpack | ESM + CJS | **必须引入** | 独立route-sync入口 |

## 核心功能

所有适配器均提供以下核心能力：

### 1. 生命周期管理
- **自动注册**: 自动将生命周期函数挂载到 `window` 对象
- **独立运行**: 非微前端环境下自动启动应用
- **容器管理**: 支持自定义挂载容器

### 2. 路由同步
- **双向同步**: 主应用与子应用路由状态实时同步
- **状态管理**: 提供响应式的路由状态管理
- **导航控制**: 支持编程式导航和声明式导航

### 3. 数据通信
- **数据监听**: 监听主应用下发的数据变化
- **事件处理**: 支持 beforeShow、afterShow 等生命周期事件
- **全局数据**: 支持获取和操作全局数据

### 4. 环境判断
- **环境检测**: 判断是否运行在微前端环境
- **基础路由**: 自动获取微前端基础路由前缀

## 快速开始

### 安装

根据你的项目技术栈选择对应的适配器：

```bash
# React + Vite 项目
pnpm add @micro-app-adapter/react-vite

# React + Webpack 项目
pnpm add @micro-app-adapter/react-webpack

# Vue3 + Vite 项目
pnpm add @micro-app-adapter/vue3-vite

# Vue3 + Webpack 项目
pnpm add @micro-app-adapter/vue3-webpack
```

### React 项目接入示例

```tsx
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerReactMicroApp } from '@micro-app-adapter/react-vite';

// 注册微前端生命周期
registerReactMicroApp(React, ReactDOM, App, {
  appName: 'my-sub-app',
  containerId: 'root'
});
```

### Vue3 项目接入示例

```ts
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { registerVueMicroApp } from '@micro-app-adapter/vue3-vite';

// 注册微前端生命周期
registerVueMicroApp(App, {
  appName: 'my-sub-app',
  router,
  mountId: '#app'
});
```

### Webpack 项目额外配置

Webpack 项目需要在入口文件顶部引入 public-path：

```ts
// main.ts (Webpack项目)
import '@micro-app-adapter/react-webpack/public-path';
// 或
import '@micro-app-adapter/vue3-webpack/public-path';

// 后续代码...
```

## 路由同步方案

适配器提供了完整的路由同步解决方案，支持主子应用路由状态同步：

### React 路由同步

```tsx
import { MicroAppRouter, RouteConfig } from '@micro-app-adapter/react-vite';
import { BrowserRouter } from 'react-router-dom';

const routes: RouteConfig[] = [
  { path: '/home', component: Home },
  { path: '/about', component: About },
];

function App() {
  return (
    <MicroAppRouter
      Router={BrowserRouter}
      routes={routes}
      defaultPath="/home"
      basename="/sub-app"
    />
  );
}
```

### Vue3 路由同步

```vue
<template>
  <MicroAppRouter
    :routes="routes"
    default-path="/home"
    basename="/sub-app"
    history-mode="hash"
  />
</template>

<script setup lang="ts">
import { MicroAppRouter, RouteConfig } from '@micro-app-adapter/vue3-vite';

const routes: RouteConfig[] = [
  { path: '/home', component: Home },
  { path: '/about', component: About },
];
</script>
```

## API 文档

详细 API 文档请查看各子包的 README：

- [React + Vite 适配器](./packages/react-vite/README.md)
- [React + Webpack 适配器](./packages/react-webpack/README.md)
- [Vue3 + Vite 适配器](./packages/vue3-vite/README.md)
- [Vue3 + Webpack 适配器](./packages/vue3-webpack/README.md)

## 开发指南

### 环境要求

- Node.js >= 16.0.0
- pnpm >= 8.0.0

### 本地开发

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm -r build

# 开发模式
pnpm -r dev
```

### 发布流程

```bash
# 在对应包目录下执行
pnpm build
npm publish
```

## 技术栈

- **构建工具**: [father](https://github.com/umijs/father) - 基于 Rollup 的库构建工具
- **包管理**: [pnpm](https://pnpm.io/) - 快速、节省磁盘空间的包管理器
- **开发语言**: TypeScript
- **框架支持**: React 16.8+ / React 17+ / Vue 3.0+

## 版本差异说明

### Vite vs Webpack 构建工具对比

| 特性 | Vite 版本 | Webpack 版本 |
|-----|----------|-------------|
| 输出格式 | ESM | ESM + CJS |
| public-path | 不需要（Vite原生支持ESM） | **必须引入**（入口文件顶部） |
| 构建配置 | 更简洁，零配置 | 支持双模块格式，兼容性更广 |
| 浏览器兼容性 | 现代浏览器 | 更广泛的浏览器支持 |
| 开发体验 | 热更新更快 | 生态更成熟 |

### React 版本兼容性对比

| 特性 | react-vite | react-webpack |
|-----|-----------|---------------|
| React 最低版本 | 16.8.0 | 16.8.0 |
| React 18 支持 | 完整支持（createRoot API） | 完整支持 + 向后兼容 |
| 渲染 API | 仅 createRoot | 自动检测：React 18用createRoot，React <18用render |
| useSyncExternalStore | 原生使用（React 18+） | 提供兼容 shim（支持 React <18） |
| 版本迁移 | 需升级到 React 18+ | 平滑迁移，无需修改代码 |

### Vue3 版本兼容性对比

| 特性 | vue3-vite | vue3-webpack |
|-----|----------|--------------|
| Vue 最低版本 | 3.0.0 | 3.0.0 |
| 组合式 API | 完整支持 | 完整支持 |
| 路由同步入口 | 统一入口 | 独立 route-sync 入口 |
| public-path | 不需要 | **必须引入** |
| 输出格式 | ESM | ESM + CJS |

## 常见问题

### 1. 子应用独立运行时路由不生效？

确保在非微前端环境下正确初始化路由，适配器会自动检测环境并启动应用。

### 2. Webpack 项目资源加载 404？

确保在入口文件最顶部引入了 `public-path` 模块。

### 3. 主子应用路由不同步？

检查主应用是否正确下发了路由数据，子应用是否正确使用了路由同步组件。

## 许可证

MIT

## 贡献指南

欢迎提交 Issue 和 Pull Request！
