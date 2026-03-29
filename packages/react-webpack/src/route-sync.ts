/**
 * @fileoverview React 路由同步模块
 * 提供微前端环境下的路由状态管理和同步功能
 * @module @micro-app-adapter/react-webpack/route-sync
 *
 * @description
 * 该模块实现了主子应用之间的路由双向同步：
 * 1. 主应用路由变化时，自动同步到子应用
 * 2. 子应用路由变化时，自动同步到主应用
 * 3. 提供 useSyncExternalStore 兼容 shim，支持 React < 18
 */

import React, { JSX, useCallback, useEffect, useRef, useState } from 'react'
import {
  MemoryRouter,
  Routes,
  useNavigate,
  useLocation,
  NavigateFunction,
  Route,
} from 'react-router-dom'
import './type'

/**
 * useSyncExternalStore 兼容 shim
 *
 * @description
 * React 18 引入了 useSyncExternalStore Hook，
 * 该 shim 为 React < 18 提供兼容实现。
 * 如果 React 版本支持原生 Hook，则使用原生实现。
 *
 * @param subscribe - 订阅函数
 * @param getSnapshot - 获取快照函数
 * @returns 当前状态快照
 */
const useSyncExternalStoreShim = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T
): T => {
  // 尝试使用 React 内置的 Hook
  const builtInHook = (React as any).useSyncExternalStore
  if (builtInHook) {
    return builtInHook(subscribe, getSnapshot)
  }

  // 兼容实现：使用 useState + useEffect
  const [state, setState] = useState<T>(() => getSnapshot())
  useEffect(() => {
    setState(getSnapshot())
    return subscribe(() => {
      setState(getSnapshot())
    })
  }, [subscribe, getSnapshot])
  return state
}

/** 判断当前是否运行在微前端环境中 */
export function isMicroApp(): boolean {
  return !!window.__MICRO_APP_ENVIRONMENT__
}

/** 获取微前端基础路由前缀 */
export function getBasename(): string {
  return window.__MICRO_APP_BASE_ROUTE__ || '/'
}

/** 微前端路由状态接口 */
export interface MicroAppRouteState {
  /** 路由是否已准备好 */
  ready: boolean
  /** 目标路径 */
  targetPath: string
  /** 状态变化监听器集合 */
  listeners: Set<() => void>
  /** 订阅状态变化 */
  subscribe: (listeners: () => void) => () => void
  /** 通知所有监听器 */
  notify: () => void
  /** 设置目标路径 */
  setPath: (path: string) => void
  /** 重置状态 */
  reset(): void
}

/** useMicroAppRouteSync Hook 的返回结果 */
export interface UseMicroAppRouteSyncResult {
  /** 路由是否已准备好 */
  ready: boolean
  /** 当前目标路径 */
  targetPath: string
}

/** MicroAppDataListener 组件的 Props */
export interface MicroAppDataListenerProps {
  /** 路由变化时的回调函数 */
  onRouteChange: (data: { path: string; event?: string }) => void
}

/** 路由配置接口 */
export interface RouteConfig {
  /** 路由路径 */
  path: string
  /** 路由对应的组件 */
  component: React.ComponentType
}

/** MicroAppRouteView 组件的 Props */
export interface MicroAppRouteViewProps {
  /** 路由配置数组 */
  routes: RouteConfig[]
  /** 默认路径 */
  defaultPath?: string
  /** 找不到路由时的回退组件 */
  fallback?: React.ComponentType
}

/** MicroAppRouter 组件的 Props */
export interface MicroAppRouterProps {
  /** React Router 组件（BrowserRouter 或 HashRouter） */
  Router: React.ComponentType<{ basename?: string; children?: React.ReactNode }>
  /** 路由配置数组 */
  routes: RouteConfig[]
  /** 默认路径 */
  defaultPath?: string
  /** 找不到路由时的回退组件 */
  fallback?: React.ComponentType
  /** 路由基础路径前缀 */
  basename?: string
}

/** 创建微前端路由状态对象 */
export function createMicroAppRouteState(): MicroAppRouteState {
  const envIsMicroApp = window.__MICRO_APP_ENVIRONMENT__
  const state: MicroAppRouteState = {
    ready: !envIsMicroApp,
    targetPath: '',
    listeners: new Set(),
    subscribe(listener: () => void) {
      this.listeners.add(listener)
      return () => this.listeners.delete(listener)
    },
    notify() {
      this.listeners.forEach((listener) => listener())
    },
    setPath(path: string) {
      this.targetPath = path
      this.ready = true
      this.notify()
    },
    reset() {
      this.ready = false
      this.notify()
      this.targetPath = ''
    },
  }
  return state
}

/** React Hook：同步微前端路由状态 */
export function useMicroAppRouteSync(): UseMicroAppRouteSyncResult {
  const state = getGlobalRouteState()
  const ready = useSyncExternalStoreShim(
    useCallback((listener: () => void) => state.subscribe(listener), [state]),
    useCallback(() => state.ready, [state])
  )
  const targetPath = useSyncExternalStoreShim(
    useCallback((listener: () => void) => state.subscribe(listener), [state]),
    useCallback(() => state.targetPath, [state])
  )
  return { ready, targetPath }
}

/** React Hook：微前端导航功能 */
export function useMicroAppNavigate(navigate: NavigateFunction): UseMicroAppRouteSyncResult {
  const { ready, targetPath } = useMicroAppRouteSync()
  const lastPathRef = useRef<string>('')
  useEffect(() => {
    if (!window.__MICRO_APP_ENVIRONMENT__) return
    if (!targetPath || targetPath === lastPathRef.current) return
    lastPathRef.current = targetPath
    navigate(targetPath, { replace: true })
  }, [targetPath, navigate])
  return { ready, targetPath }
}

/** React 组件：微前端数据监听器 */
export function MicroAppDataListener(props: MicroAppDataListenerProps): JSX.Element | null {
  const { onRouteChange } = props
  const state = getGlobalRouteState()
  const lastPathRef = useRef<string>('')

  const updateRoute = useCallback(
    (data: { path?: string; event?: string }) => {
      if (!data?.path || data.path === lastPathRef.current) return
      lastPathRef.current = data.path
      state.setPath(data.path)
      onRouteChange?.({ path: data.path, event: data.event })
    },
    [state, onRouteChange]
  )

  useEffect(() => {
    const microApp = (window as any).microApp || (window.parent as any)?.microApp
    if (!microApp) return

    const handleDataChange = (data: { path?: string; event?: string }) => {
      if (data?.event === 'beforeShow' || data?.event === 'afterShow') {
        state.reset()
        lastPathRef.current = ''
        if (data.path) updateRoute(data)
        return
      }
      updateRoute(data)
    }

    microApp.addDataListener(handleDataChange)
    const initData = microApp.getData()
    if (initData?.path) updateRoute(initData)
    return () => microApp.removeDataListener(handleDataChange)
  }, [state, updateRoute])

  return null
}

/** React 组件：微前端路由视图 */
export function MicroAppRouteView(props: MicroAppRouteViewProps): JSX.Element | null {
  const { routes, defaultPath = '/home', fallback: Fallback } = props
  const { ready, targetPath } = useMicroAppRouteSync()

  if (!isMicroApp()) return null
  if (!ready) return null

  const normalizedPath =
    targetPath.replace(/^\//, '').split('?')[0] || defaultPath.replace(/^\//, '')
  const lookupPath = `/${normalizedPath}`
  const route = routes.find((r) => r.path === lookupPath)

  if (!route) {
    if (Fallback) return React.createElement(Fallback)
    const defaultRoute = routes.find((r) => r.path === defaultPath)
    const DefaultComponent = defaultRoute?.component
    if (DefaultComponent) return React.createElement(DefaultComponent)
    return null
  }
  const Component = route.component
  return React.createElement(Component)
}

/** 内部组件：独立运行时的路由器 */
function MicroAppRouterInternal(props: MicroAppRouterProps): JSX.Element {
  const { Router, routes, basename } = props
  return React.createElement(
    Router,
    { basename },
    React.createElement(
      Routes,
      null,
      routes.map(({ path, component: Component }) =>
        React.createElement(Route, {
          key: path,
          path,
          element: React.createElement(Component) as JSX.Element,
        })
      )
    )
  )
}

/** 内部组件：路由导航同步 */
function RouteNavigateSync(): null {
  const { targetPath } = useMicroAppRouteSync()
  const navigate = useNavigate()
  const location = useLocation()
  const lastTargetPathRef = useRef<string>('')
  const isSyncingFromBaseRef = useRef<boolean>(false)
  const lastSyncedPathRef = useRef<string>('')

  // 同步主应用下发的路由到本地
  useEffect(() => {
    if (!targetPath || targetPath === lastTargetPathRef.current) return
    if (targetPath === location.pathname) {
      lastTargetPathRef.current = targetPath
      return
    }
    lastTargetPathRef.current = targetPath
    isSyncingFromBaseRef.current = true
    navigate(targetPath, { replace: true })
  }, [targetPath, navigate, location.pathname])

  // 同步本地路由到主应用
  useEffect(() => {
    if (!window.__MICRO_APP_ENVIRONMENT__) return
    if (isSyncingFromBaseRef.current) {
      isSyncingFromBaseRef.current = false
      lastSyncedPathRef.current = location.pathname
      return
    }
    if (location.pathname === lastTargetPathRef.current) return

    const microApp = (window as any).microApp || (window.parent as any)?.microApp
    if (!microApp) return

    const globalData = microApp.getGlobalData?.()
    const appName = window.__MICRO_APP_NAME__
    const baseroute = window.__MICRO_APP_BASE_ROUTE__ || ''

    const syncToBase = (path: string) => {
      const fullPath = baseroute + path
      if (globalData?.pushState && appName) {
        globalData.pushState(appName, fullPath, '')
      } else if (globalData?.jump) {
        globalData.jump(fullPath)
      }
    }

    lastSyncedPathRef.current = location.pathname
    syncToBase(location.pathname)
  }, [location.pathname])

  return null
}

/** 内部组件：路由内容（不含监听器） */
function MicroAppRouterContentWithoutListener(props: MicroAppRouteViewProps): JSX.Element {
  const { routes } = props
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(RouteNavigateSync),
    React.createElement(
      Routes,
      null,
      routes.map(({ path, component: Component }) =>
        React.createElement(Route, {
          key: path,
          path,
          element: React.createElement(Component) as JSX.Element,
        })
      )
    )
  )
}

/** 内部组件：微前端环境下的路由器 */
function MicroAppRouterMicroApp(props: MicroAppRouterProps): JSX.Element {
  const { routes, defaultPath = '/home' } = props
  const { ready, targetPath } = useMicroAppRouteSync()
  const dataListener = React.createElement(MicroAppDataListener)

  if (!ready) {
    return React.createElement(React.Fragment, null, dataListener)
  }

  const initialPath = targetPath || defaultPath
  return React.createElement(
    React.Fragment,
    null,
    dataListener,
    React.createElement(
      MemoryRouter,
      { initialEntries: [initialPath], key: initialPath },
      React.createElement(MicroAppRouterContentWithoutListener, { routes })
    )
  )
}

/**
 * React 组件：微前端路由器
 *
 * @description
 * 统一的路由管理组件，根据运行环境自动切换模式：
 * - 微前端环境：使用 MemoryRouter 模式
 * - 独立运行：使用传入的 Router 组件
 */
export function MicroAppRouter(props: MicroAppRouterProps): JSX.Element {
  if (isMicroApp()) {
    return React.createElement(MicroAppRouterMicroApp, props)
  }
  return React.createElement(MicroAppRouterInternal, props)
}

/** 全局路由状态实例（单例） */
let _globalRouteState: MicroAppRouteState | null = null

/** 获取全局路由状态实例 */
function getGlobalRouteState(): MicroAppRouteState {
  if (!_globalRouteState) {
    _globalRouteState = createMicroAppRouteState()
  }
  return _globalRouteState
}
