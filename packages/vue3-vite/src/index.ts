/**
 * @fileoverview Vue3 + Vite 微前端适配器入口文件
 * 提供 Vue3 子应用接入微前端框架的生命周期管理功能
 * @module @micro-app-adapter/vue3-vite
 *
 * @description
 * 与 Webpack 版本的区别：
 * - 不需要 public-path 配置（Vite 原生支持 ESM）
 * - 支持容器挂载点配置
 * - 自动获取子应用名称
 */

import './types'
import { createApp } from 'vue'
import type { Component, App as VueApp } from 'vue'
import type { Router } from 'vue-router'

/**
 * 注册 Vue 微应用时的配置选项
 * @interface RegisterVueMicroAppOptions
 */
export interface RegisterVueMicroAppOptions {
  /** 子应用名称，用于标识和通信 */
  appName: string
  /** Vue Router 实例，可选 */
  router?: Router
  /** 挂载点选择器，默认为 '#app' */
  mountId?: string
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
 * 注册 Vue3 微应用
 *
 * @description
 * 该函数会将生命周期函数挂载到 window 对象上，供主应用调用。
 * 同时会自动检测运行环境，在非微前端环境下自动启动应用。
 *
 * 与 Webpack 版本相比，Vite 版本：
 * - 支持动态容器挂载
 * - 自动清理旧实例后再创建新实例
 * - 支持从环境变量获取应用名称
 *
 * @param AppComponent - Vue 根组件
 * @param options - 注册配置选项
 */
export function registerVueMicroApp(AppComponent: Component, options: RegisterVueMicroAppOptions) {
  const { appName, router, mountId = '#app' } = options

  // Vue 应用实例引用，用于后续卸载
  let app: VueApp | null = null

  /**
   * 挂载应用
   * @param props - 可选的挂载属性，包含容器元素
   */
  function mount(props?: { container?: HTMLElement }): void {
    // 获取挂载容器：优先使用传入的容器，否则使用默认选择器
    const container = props?.container || document.querySelector(mountId)
    if (!container) {
      return
    }

    // 如果已存在实例，先卸载
    if (app) {
      app.unmount()
      app = null
    }

    // 创建并挂载新实例
    app = createApp(AppComponent)
    if (router) app.use(router)
    app.mount(container as HTMLElement)
  }

  /**
   * 卸载应用
   * 销毁 Vue 应用实例并释放资源
   */
  function unmount(): void {
    if (app) {
      app.unmount()
      app = null
    }
  }

  // 解析应用名称：优先使用配置的名称，否则从环境变量获取
  const resolvedName = appName || window.__MICRO_APP_NAME__

  // 将生命周期函数挂载到 window 对象，供主应用调用
  ;(window as any)[`micro-app-${resolvedName}`] = { mount, unmount } as MicroAppLifecycle

  // 非微前端环境下（独立运行时），自动挂载应用
  if (!window.__MICRO_APP_ENVIRONMENT__) {
    mount()
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
  MicroAppRouteView,
  MicroAppRouter,
} from './route-sync'

// 导出类型定义
export type {
  MicroAppRouteState,
  UseMicroAppRouteSyncResult,
  RouteConfig,
  MicroAppRouterProps,
} from './route-sync'
