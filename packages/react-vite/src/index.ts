/**
 * @fileoverview React + Vite 微前端适配器入口文件
 * 提供 React 子应用接入微前端框架的生命周期管理功能
 * @module @micro-app-adapter/react-vite
 *
 * @description
 * 特点：
 * - 仅支持 React 18+（使用 createRoot API）
 * - 不需要 public-path 配置（Vite 原生支持 ESM）
 * - 支持容器动态挂载
 */

import './types'

/**
 * 注册 React 微应用时的配置选项
 * @interface RegisterReactMicroAppOptions
 */
export interface RegisterReactMicroAppOptions {
  /** 子应用名称，用于标识和通信 */
  appName: string
  /** 挂载点 DOM ID，默认为 'root' */
  containerId?: string
}

/**
 * 微前端生命周期接口
 * 主应用通过调用这些方法来控制子应用的挂载和卸载
 * @interface MicroAppLifecycle
 */
export interface MicroAppLifecycle {
  /** 挂载子应用 */
  mount: (props?: { container?: HTMLElement }) => void
  /** 卸载子应用 */
  unmount: () => void
}

/**
 * 注册 React 微应用
 *
 * @description
 * 该函数会将生命周期函数挂载到 window 对象上，供主应用调用。
 * 同时会自动检测运行环境，在非微前端环境下自动启动应用。
 *
 * 注意：Vite 版本仅支持 React 18+，使用 createRoot API
 *
 * @param React - React 模块
 * @param ReactDOM - ReactDOM 模块（需要 React 18+）
 * @param AppComponent - React 根组件
 * @param options - 注册配置选项
 */
export function registerReactMicroApp(
  React: any,
  ReactDOM: any,
  AppComponent: React.ComponentType,
  options: RegisterReactMicroAppOptions
): void {
  const { appName, containerId = 'root' } = options

  // React 18 root 引用
  let root: any = null

  /**
   * 渲染应用
   * @param props - 可选的挂载属性，包含容器元素
   */
  function render(props?: { container?: HTMLElement }) {
    const container = props?.container || document.getElementById(containerId)
    if (!container) {
      return
    }

    // 如果已存在 root，先卸载
    if (root) {
      root.unmount()
      root = null
    }

    // 使用 React 18 createRoot API
    root = ReactDOM.createRoot(container as HTMLElement)
    root.render(React.createElement(AppComponent))
  }

  /**
   * 挂载子应用
   */
  function mount(props?: { container?: HTMLElement }): void {
    render(props)
  }

  /**
   * 卸载子应用
   */
  function unmount(): void {
    if (root) {
      root.unmount()
      root = null
    }
  }

  // 解析应用名称：优先使用配置的名称，否则从环境变量获取
  const resolvedName = appName || window.__MICRO_APP_NAME__

  // 将生命周期函数挂载到 window 对象，供主应用调用
  ;(window as any)[`micro-app-${resolvedName}`] = { mount, unmount } as MicroAppLifecycle

  // 非微前端环境下（独立运行时），自动渲染应用
  if (!window.__MICRO_APP_ENVIRONMENT__) {
    render()
  }
}

// 导出路由同步相关的功能
export {
  isMicroApp,
  getBasename,
  createMicroAppRouteState,
  useMicroAppRouteSync,
  useMicroAppNavigate,
  MicroAppDataListener,
  MicroAppRouter,
  MicroAppRouteView,
} from './route-sync'

// 导出类型定义
export type {
  MicroAppRouteState,
  UseMicroAppRouteSyncResult,
  MicroAppDataListenerProps,
  RouteConfig,
  MicroAppRouteViewProps,
  MicroAppRouterProps,
} from './route-sync'
