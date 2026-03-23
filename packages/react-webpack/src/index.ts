/**
 * @fileoverview React + Webpack 微前端适配器入口文件
 * 提供 React 子应用接入微前端框架的生命周期管理功能
 * @module @micro-app-adapter/react-webpack
 *
 * @description
 * 特点：
 * - 支持 React 16.8+ 和 React 18+
 * - 自动检测 React 版本并使用对应的渲染 API
 * - 为 React < 18 提供 useSyncExternalStore 兼容
 */

import './type'

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
 * 检测是否为 React 18
 * React 18 引入了 createRoot API
 *
 * @param ReactDOM - ReactDOM 模块
 * @returns 如果是 React 18 返回 true
 */
function isReact18(ReactDOM: any): boolean {
  return typeof ReactDOM?.createRoot === 'function'
}

/**
 * 注册 React 微应用
 *
 * @description
 * 该函数会将生命周期函数挂载到 window 对象上，供主应用调用。
 * 同时会自动检测运行环境，在非微前端环境下自动启动应用。
 *
 * 特性：
 * - 自动检测 React 版本，使用 createRoot 或 render
 * - 支持容器动态传入
 * - 正确处理重复挂载
 *
 * @param React - React 模块
 * @param ReactDOM - ReactDOM 模块
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

  // React 18 root 引用（仅 React 18 使用）
  let root: any = null
  // 已挂载的容器引用（React < 18 使用）
  let mountedContainer: HTMLElement | null = null

  // 检测 React 版本
  const useReact18 = isReact18(ReactDOM)

  /**
   * 渲染应用
   * @param props - 可选的挂载属性，包含容器元素
   */
  function render(props?: { container?: HTMLElement }) {
    const container = props?.container || document.getElementById(containerId)
    if (!container) {
      return
    }

    if (useReact18) {
      // React 18: 使用 createRoot API
      if (root) {
        root.unmount()
        root = null
      }
      root = ReactDOM.createRoot(container as HTMLElement)
      root.render(React.createElement(AppComponent))
    } else {
      // React < 18: 使用传统 render API
      if (mountedContainer) {
        ;(ReactDOM as any).unmountComponentAtNode(mountedContainer)
      }
      ;(ReactDOM as any).render(React.createElement(AppComponent), container as HTMLElement)
      mountedContainer = container as HTMLElement
    }
  }

  // 将生命周期函数挂载到 window 对象，供主应用调用
  ;(window as any)[`micro-app-${appName}`] = {
    /**
     * 挂载子应用
     */
    mount(props?: { container?: HTMLElement }) {
      render(props)
    },
    /**
     * 卸载子应用
     */
    unmount() {
      if (useReact18) {
        if (root) {
          root.unmount()
          root = null
        }
      } else {
        if (mountedContainer) {
          ;(ReactDOM as any).unmountComponentAtNode(mountedContainer)
          mountedContainer = null
        }
      }
    },
  } as MicroAppLifecycle

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
