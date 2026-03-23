/**
 * @fileoverview Vue3 路由同步模块
 * 提供微前端环境下的路由状态管理和同步功能
 * @module @micro-app-adapter/vue3-vite/route-sync
 */

import {
  defineComponent,
  ref,
  watch,
  onMounted,
  onUnmounted,
  h,
  Component,
  Ref,
  PropType,
  provide,
} from 'vue'
import './types'

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
  /** 路由是否已准备好（响应式） */
  ready: Ref<boolean>
  /** 当前目标路径（响应式） */
  targetPath: Ref<string>
}

/** 路由配置接口 */
export interface RouteConfig {
  /** 路由路径 */
  path: string
  /** 路由对应的组件 */
  component: Component
  /** 子路由配置 */
  children?: RouteConfig[]
}

/** MicroAppRouter 组件的 Props 接口 */
export interface MicroAppRouterProps {
  /** 路由配置数组 */
  routes: RouteConfig[]
  /** 默认路径 */
  defaultPath?: string
  /** 路由基础路径前缀 */
  basename?: string
  /** 路由模式 */
  historyMode?: 'hash' | 'history'
  /** 找不到路由时的回退组件 */
  fallback?: Component
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

/** Vue Composition API Hook：同步微前端路由状态 */
export function useMicroAppRouteSync(): UseMicroAppRouteSyncResult {
  const state = getGlobalRouteState()
  const ready = ref(state.ready)
  const targetPath = ref(state.targetPath)
  const updateFromState = () => {
    ready.value = state.ready
    targetPath.value = state.targetPath
  }
  onMounted(() => {
    updateFromState()
    const unsubscribe = state.subscribe(updateFromState)
    onUnmounted(unsubscribe)
  })
  return { ready, targetPath }
}

/** Vue Composition API Hook：微前端导航功能 */
export function useMicroAppNavigate() {
  const state = getGlobalRouteState()
  const navigate = (path: string) => {
    if (isMicroApp()) {
      state.setPath(path)
      const microApp = (window as any).microApp || (window.parent as any)?.microApp
      if (microApp) {
        const globalData = microApp.getGlobalData?.()
        const appName = window.__MICRO_APP_NAME__
        const baseroute = window.__MICRO_APP_BASE_ROUTE__ || ''
        const fullPath = baseroute + path
        if (globalData?.pushState && appName) {
          globalData.pushState(appName, fullPath, '')
        } else if (globalData?.jump) {
          globalData.jump(fullPath)
        }
      }
    } else {
      const hash = window.location.hash.slice(1)
      if (hash !== path) {
        window.location.hash = path
      }
    }
  }
  return { navigate }
}

/** Vue Composition API Hook：监听主应用下发的数据 */
export function useMicroAppDataListener(
  onRouteChange?: (data: { path: string; event?: string }) => void
): void {
  const state = getGlobalRouteState()
  const lastPathRef = ref('')
  const updateRoute = (data: { path?: string; event?: string }) => {
    if (!data?.path || data.path === lastPathRef.value) return
    lastPathRef.value = data.path
    state.setPath(data.path)
    onRouteChange?.({ path: data.path, event: data.event })
  }
  onMounted(() => {
    const microApp = (window as any).microApp || (window.parent as any)?.microApp
    if (!microApp) return
    const handleDataChange = (data: { path?: string; event?: string }) => {
      if (data?.event === 'beforeShow' || data?.event === 'afterShow') {
        state.reset()
        lastPathRef.value = ''
        if (data.path) updateRoute(data)
        return
      }
      updateRoute(data)
    }
    microApp.addDataListener(handleDataChange)
    const initData = microApp.getData()
    if (initData?.path) updateRoute(initData)
    onUnmounted(() => {
      microApp.removeDataListener(handleDataChange)
    })
  })
}

/** 微前端数据监听组件（无渲染组件） */
export const MicroAppDataListener = defineComponent({
  name: 'MicroAppDataListener',
  props: {
    onRouteChange: {
      type: Function as PropType<(data: { path: string; event?: string }) => void>,
      default: undefined,
    },
  },
  setup(props) {
    useMicroAppDataListener(props.onRouteChange)
    return () => null
  },
})

/** 微前端路由视图组件 */
export const MicroAppRouteView = defineComponent({
  name: 'MicroAppRouteView',
  props: {
    routes: {
      type: Array as () => RouteConfig[],
      required: true,
    },
    defaultPath: {
      type: String,
      default: '/home',
    },
    fallback: {
      type: Object as () => Component,
      default: undefined,
    },
  },
  setup(props) {
    const { ready, targetPath } = useMicroAppRouteSync()
    return () => {
      if (!isMicroApp()) return null
      if (!ready.value) return null
      const normalizedPath =
        targetPath.value.replace(/^\//, '').split('?')[0] || props.defaultPath.replace(/^\//, '')
      const lookupPath = `/${normalizedPath}`
      const route = props.routes.find((r) => r.path === lookupPath)
      if (!route) {
        if (props.fallback) return h(props.fallback)
        const defaultRoute = props.routes.find((r) => r.path === props.defaultPath)
        if (defaultRoute) return h(defaultRoute.component)
        return null
      }
      return h(route.component)
    }
  },
})

/** 内部组件：路由同步到主应用 */
const MicroAppRouteSync = defineComponent({
  name: 'MicroAppRouteSync',
  setup(_) {
    const { targetPath } = useMicroAppRouteSync()
    const lastSyncedPathRef = ref('')
    watch(targetPath, (newPath) => {
      if (!window.__MICRO_APP_ENVIRONMENT__) return
      if (!newPath || newPath === lastSyncedPathRef.value) return
      lastSyncedPathRef.value = newPath
      const microApp = (window as any).microApp || (window.parent as any)?.microApp
      if (!microApp) return
      const globalData = microApp.getGlobalData?.()
      const appName = window.__MICRO_APP_NAME__
      const baseroute = window.__MICRO_APP_BASE_ROUTE__ || ''
      const fullPath = baseroute + newPath
      if (globalData?.pushState && appName) {
        globalData.pushState(appName, fullPath, '')
      } else if (globalData?.jump) {
        globalData.jump(fullPath)
      }
    })
    return () => null
  },
})

/** 微前端路由器组件 */
export const MicroAppRouter = defineComponent({
  name: 'MicroAppRouter',
  props: {
    routes: {
      type: Array as () => RouteConfig[],
      required: true,
    },
    defaultPath: {
      type: String,
      default: '/home',
    },
    basename: {
      type: String,
      default: '/',
    },
    historyMode: {
      type: String as () => 'hash' | 'history',
      default: 'hash',
    },
    fallback: {
      type: Object as () => Component,
      default: undefined,
    },
  },
  setup(props) {
    // 微前端环境
    if (isMicroApp()) {
      const { ready, targetPath } = useMicroAppRouteSync()
      return () => {
        const dataListener = h(MicroAppDataListener)
        if (!ready.value) {
          return h('div', { class: 'micro-app-router', style: 'height: 100%; width: 100%;' }, [
            dataListener,
          ])
        }
        const currentPath = targetPath.value || props.defaultPath
        const normalizedPath =
          currentPath.replace(/^\//, '').split('?')[0] || props.defaultPath.replace(/^\//, '')
        const lookupPath = `/${normalizedPath}`
        const route = props.routes.find((r) => r.path === lookupPath)
        const content = route
          ? h(route.component, { key: lookupPath })
          : props.fallback
            ? h(props.fallback)
            : null
        return h('div', { class: 'micro-app-router', style: 'height: 100%; width: 100%;' }, [
          dataListener,
          h(MicroAppRouteSync),
          content,
        ])
      }
    }
    // 独立运行环境
    const currentPath = ref(props.defaultPath)
    const isHistoryMode = props.historyMode === 'history'
    const basename = props.basename === '/' ? '' : props.basename
    const getCurrentPath = () => {
      if (isHistoryMode) {
        const path = window.location.pathname
        return path.startsWith(basename) ? path.slice(basename.length) || props.defaultPath : path
      } else {
        const hash = window.location.hash.slice(1)
        return hash || props.defaultPath
      }
    }
    const navigateTo = (path: string) => {
      if (isHistoryMode) {
        const fullPath = basename + path
        if (window.location.pathname !== fullPath) {
          window.history.pushState({}, '', fullPath)
          currentPath.value = path
        }
      } else if (window.location.hash !== '#' + path) {
        window.location.hash = path
      }
    }
    const handleRouteChange = (_event: Event) => {
      const path = getCurrentPath()
      if (path !== currentPath.value) {
        currentPath.value = path
      }
    }
    const routerContext = {
      currentPath,
      navigate: navigateTo,
      isHistoryMode,
    }
    provide('microAppRouter', routerContext)
    onMounted(() => {
      currentPath.value = getCurrentPath()
      if (isHistoryMode) {
        window.addEventListener('popstate', handleRouteChange)
      } else {
        window.addEventListener('hashchange', handleRouteChange)
      }
    })
    onUnmounted(() => {
      if (isHistoryMode) {
        window.removeEventListener('popstate', handleRouteChange)
      } else {
        window.removeEventListener('hashchange', handleRouteChange)
      }
    })
    return () => {
      const normalizedPath =
        currentPath.value.replace(/^\//, '').split('?')[0] || props.defaultPath.replace(/^\//, '')
      const lookupPath = `/${normalizedPath}`
      const route = props.routes.find((r) => r.path === lookupPath)
      if (!route) {
        if (props.fallback) {
          return h('div', { class: 'micro-app-router', style: 'height: 100%; width: 100%;' }, [
            h(props.fallback),
          ])
        }
        const defaultRoute = props.routes.find((r) => r.path === props.defaultPath)
        if (defaultRoute) {
          return h('div', { class: 'micro-app-router', style: 'height: 100%; width: 100%;' }, [
            h(defaultRoute.component, { key: props.defaultPath }),
          ])
        }
        return null
      }
      return h('div', { class: 'micro-app-router', style: 'height: 100%; width: 100%;' }, [
        h(route.component, { key: lookupPath }),
      ])
    }
  },
})

export { getGlobalRouteState }
