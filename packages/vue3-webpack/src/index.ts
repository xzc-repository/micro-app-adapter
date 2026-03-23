/**
 * @fileoverview Vue3 + Webpack 微前端适配器入口文件
 * 提供 Vue3 子应用接入微前端框架的生命周期管理功能
 * @module @micro-app-adapter/vue3-webpack
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
 * 该函数会将生命周期函数挂载到 window 对象上，供主应用调用。
 * 同时会自动检测运行环境，在非微前端环境下自动启动应用。
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
   * 创建 Vue 应用实例并挂载到指定 DOM 节点
   */
  function mount(): void {
    const app = createApp(AppComponent)
    if (router) app.use(router)
    app.mount(mountId)
  }

  /**
   * 卸载应用
   * 销毁 Vue 应用实例并释放资源
   */
  function unmount(): void {
    app?.unmount()
    app = null
  }

  // 将生命周期函数挂载到 window 对象，供主应用调用
  // 主应用通过 window['micro-app-{appName}'] 获取生命周期
  ;(window as any)[`micro-app-${appName}`] = { mount, unmount } as MicroAppLifecycle

  // 非微前端环境下（独立运行时），自动挂载应用
  if (!window.__MICRO_APP_ENVIRONMENT__) {
    mount()
  }
}
