/**
 * @fileoverview Vue3 路由同步模块
 * 提供微前端环境下的路由状态管理和同步功能
 * @module @micro-app-adapter/vue3-webpack/route-sync
 *
 * @description
 * 该模块实现了主子应用之间的路由双向同步：
 * 1. 主应用路由变化时，自动同步到子应用
 * 2. 子应用路由变化时，自动同步到主应用
 * 3. 支持声明式路由配置和响应式状态管理
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

/**
 * 判断当前是否运行在微前端环境中
 * @returns 如果在微前端环境中返回 true，否则返回 false
 */
export function isMicroApp(): boolean {
  return !!window.__MICRO_APP_ENVIRONMENT__
}

/**
 * 获取微前端基础路由前缀
 * @returns 基础路由路径，默认为 '/'
 *
 * @description
 * 在微前端环境中，子应用通常挂载在某个路径前缀下，
 * 该函数返回主应用分配给子应用的基础路由
 */
export function getBasename(): string {
  return window.__MICRO_APP_BASE_ROUTE__ || '/'
}
/**
 * 微前端路由状态接口
 * 用于管理路由同步的全局状态
 * @interface MicroAppRouteState
 */
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

/**
 * useMicroAppRouteSync Hook 的返回结果
 * @interface UseMicroAppRouteSyncResult
 */
export interface UseMicroAppRouteSyncResult {
  /** 路由是否已准备好（响应式） */
  ready: Ref<boolean>
  /** 当前目标路径（响应式） */
  targetPath: Ref<string>
}

/**
 * 路由配置接口
 * @interface RouteConfig
 */
export interface RouteConfig {
  /** 路由路径 */
  path: string
  /** 路由对应的组件 */
  component: Component
  /** 子路由配置 */
  children?: RouteConfig[]
}

/**
 * MicroAppRouter 组件的 Props 接口
 * @interface MicroAppRouterProps
 */
export interface MicroAppRouterProps {
  /** 路由配置数组 */
  routes: RouteConfig[]
  /** 默认路径，默认为 '/home' */
  defaultPath?: string
  /** 路由基础路径前缀 */
  basename?: string
  /** 路由模式：hash 或 history */
  historyMode?: 'hash' | 'history'
  /** 找不到路由时的回退组件 */
  fallback?: Component
}
/** 全局路由状态实例（单例） */
let _globalRouteState: MicroAppRouteState | null = null

/**
 * 获取全局路由状态实例
 * 如果实例不存在则创建一个新实例
 * @returns 全局路由状态实例
 */
function getGlobalRouteState(): MicroAppRouteState {
  if (!_globalRouteState) {
    _globalRouteState = createMicroAppRouteState()
  }
  return _globalRouteState
}

/**
 * 创建微前端路由状态对象
 *
 * @description
 * 创建一个包含路由状态管理的对象，支持：
 * - 发布订阅模式：组件可以订阅状态变化
 * - 路径设置：更新目标路径并通知监听器
 * - 状态重置：清空路由状态
 *
 * @returns 路由状态对象
 */
export function createMicroAppRouteState(): MicroAppRouteState {
  // 检测是否在微前端环境中
  const envIsMicroApp = window.__MICRO_APP_ENVIRONMENT__

  const state: MicroAppRouteState = {
    // 非微前端环境下，默认 ready 为 true
    ready: !envIsMicroApp,
    targetPath: '',
    listeners: new Set(),

    /**
     * 订阅状态变化
     * @param listener - 状态变化时的回调函数
     * @returns 取消订阅的函数
     */
    subscribe(listener: () => void) {
      this.listeners.add(listener)
      return () => this.listeners.delete(listener)
    },

    /**
     * 通知所有监听器状态已变化
     */
    notify() {
      this.listeners.forEach((listener) => listener())
    },

    /**
     * 设置目标路径
     * @param path - 新的目标路径
     */
    setPath(path: string) {
      this.targetPath = path
      this.ready = true
      this.notify()
    },

    /**
     * 重置路由状态
     * 在 beforeShow/afterShow 事件时调用
     */
    reset() {
      this.ready = false
      this.notify()
      this.targetPath = ''
    },
  }
  return state
}
/**
 * Vue Composition API Hook：同步微前端路由状态
 *
 * @description
 * 该 Hook 用于在 Vue 组件中获取和响应微前端路由状态变化。
 * 它会自动订阅全局路由状态，并在组件卸载时取消订阅。
 *
 * @returns 包含 ready 和 targetPath 的响应式对象
 */
export function useMicroAppRouteSync(): UseMicroAppRouteSyncResult {
  const state = getGlobalRouteState()

  // 创建响应式引用
  const ready = ref(state.ready)
  const targetPath = ref(state.targetPath)

  /**
   * 从全局状态更新本地状态
   */
  const updateFromState = () => {
    ready.value = state.ready
    targetPath.value = state.targetPath
  }

  // 组件挂载时订阅状态变化，卸载时自动取消订阅
  onMounted(() => {
    updateFromState()
    const unsubscribe = state.subscribe(updateFromState)
    onUnmounted(unsubscribe)
  })

  return { ready, targetPath }
}

/**
 * Vue Composition API Hook：微前端导航功能
 *
 * @description
 * 提供编程式导航功能，支持：
 * - 微前端环境：同步路由到主应用
 * - 独立运行：直接修改 hash 路由
 *
 * @returns 包含 navigate 函数的对象
 */
export function useMicroAppNavigate() {
  const state = getGlobalRouteState()

  /**
   * 导航到指定路径
   * @param path - 目标路径
   */
  const navigate = (path: string) => {
    if (isMicroApp()) {
      // 微前端环境：更新本地状态并同步到主应用
      state.setPath(path)

      // 获取 microApp 实例（当前窗口或父窗口）
      const microApp = (window as any).microApp || (window.parent as any)?.microApp
      if (microApp) {
        const globalData = microApp.getGlobalData?.()
        const appName = window.__MICRO_APP_NAME__
        const baseroute = window.__MICRO_APP_BASE_ROUTE__ || ''
        const fullPath = baseroute + path

        // 优先使用 pushState，否则使用 jump 方法
        if (globalData?.pushState && appName) {
          globalData.pushState(appName, fullPath, '')
        } else if (globalData?.jump) {
          globalData.jump(fullPath)
        }
      }
    } else {
      // 独立运行环境：直接修改 hash
      const hash = window.location.hash.slice(1)
      if (hash !== path) {
        window.location.hash = path
      }
    }
  }

  return { navigate }
}
/**
 * Vue Composition API Hook：监听主应用下发的数据
 *
 * @description
 * 监听主应用通过 microApp 下发的路由数据变化，
 * 并同步更新本地路由状态。支持以下事件：
 * - beforeShow: 子应用即将显示时触发，会重置路由状态
 * - afterShow: 子应用显示完成后触发，会重置路由状态
 * - 普通数据: 直接更新路由路径
 *
 * @param onRouteChange - 路由变化时的回调函数
 */
export function useMicroAppDataListener(
  onRouteChange?: (data: { path: string; event?: string }) => void
): void {
  const state = getGlobalRouteState()

  // 记录上次处理的路径，避免重复处理
  const lastPathRef = ref('')

  /**
   * 更新路由状态
   * @param data - 主应用下发的数据
   */
  const updateRoute = (data: { path?: string; event?: string }) => {
    if (!data?.path || data.path === lastPathRef.value) return
    lastPathRef.value = data.path
    state.setPath(data.path)
    onRouteChange?.({ path: data.path, event: data.event })
  }

  onMounted(() => {
    // 获取 microApp 实例
    const microApp = (window as any).microApp || (window.parent as any)?.microApp
    if (!microApp) return

    /**
     * 处理数据变化
     * @param data - 主应用下发的数据
     */
    const handleDataChange = (data: { path?: string; event?: string }) => {
      // beforeShow/afterShow 事件需要重置状态
      if (data?.event === 'beforeShow' || data?.event === 'afterShow') {
        state.reset()
        lastPathRef.value = ''
        if (data.path) updateRoute(data)
        return
      }
      updateRoute(data)
    }

    // 添加数据监听器
    microApp.addDataListener(handleDataChange)

    // 处理初始数据
    const initData = microApp.getData()
    if (initData?.path) updateRoute(initData)

    // 组件卸载时移除监听器
    onUnmounted(() => {
      microApp.removeDataListener(handleDataChange)
    })
  })
}
/**
 * 微前端数据监听组件
 *
 * @description
 * 一个无渲染组件，用于在模板中监听主应用下发的数据变化。
 * 内部使用 useMicroAppDataListener Hook 实现。
 */
export const MicroAppDataListener = defineComponent({
  name: 'MicroAppDataListener',
  props: {
    /** 路由变化时的回调函数 */
    onRouteChange: {
      type: Function as PropType<(data: { path: string; event?: string }) => void>,
      default: undefined,
    },
  },
  setup(props) {
    useMicroAppDataListener(props.onRouteChange)
    return () => null // 无渲染组件
  },
})

/**
 * 微前端路由视图组件
 *
 * @description
 * 根据当前路由状态渲染对应的组件。
 * 仅在微前端环境中生效，独立运行时返回 null。
 */
export const MicroAppRouteView = defineComponent({
  name: 'MicroAppRouteView',
  props: {
    /** 路由配置数组 */
    routes: {
      type: Array as () => RouteConfig[],
      required: true,
    },
    /** 默认路径 */
    defaultPath: {
      type: String,
      default: '/home',
    },
    /** 找不到路由时的回退组件 */
    fallback: {
      type: Object as () => Component,
      default: undefined,
    },
  },
  setup(props) {
    const { ready, targetPath } = useMicroAppRouteSync()

    return () => {
      // 非微前端环境不渲染
      if (!isMicroApp()) return null
      // 路由未准备好时不渲染
      if (!ready.value) return null

      // 规范化路径：移除前导斜杠和查询参数
      const normalizedPath =
        targetPath.value.replace(/^\//, '').split('?')[0] || props.defaultPath.replace(/^\//, '')
      const lookupPath = `/${normalizedPath}`

      // 查找匹配的路由
      const route = props.routes.find((r) => r.path === lookupPath)
      if (!route) {
        // 未找到路由时，渲染回退组件或默认路由
        if (props.fallback) return h(props.fallback)
        const defaultRoute = props.routes.find((r) => r.path === props.defaultPath)
        if (defaultRoute) return h(defaultRoute.component)
        return null
      }
      return h(route.component)
    }
  },
})
/**
 * 内部组件：路由同步到主应用
 *
 * @description
 * 监听 targetPath 变化，将子应用的路由变化同步到主应用。
 * 这是一个内部组件，不对外暴露。
 */
const MicroAppRouteSync = defineComponent({
  name: 'MicroAppRouteSync',
  setup(_) {
    const { targetPath } = useMicroAppRouteSync()

    // 记录上次同步的路径，避免重复同步
    const lastSyncedPathRef = ref('')

    watch(targetPath, (newPath) => {
      if (!window.__MICRO_APP_ENVIRONMENT__) return
      if (!newPath || newPath === lastSyncedPathRef.value) return

      lastSyncedPathRef.value = newPath

      // 获取 microApp 实例并同步路由
      const microApp = (window as any).microApp || (window.parent as any)?.microApp
      if (!microApp) return

      const globalData = microApp.getGlobalData?.()
      const appName = window.__MICRO_APP_NAME__
      const baseroute = window.__MICRO_APP_BASE_ROUTE__ || ''
      const fullPath = baseroute + newPath

      // 同步到主应用
      if (globalData?.pushState && appName) {
        globalData.pushState(appName, fullPath, '')
      } else if (globalData?.jump) {
        globalData.jump(fullPath)
      }
    })

    return () => null // 无渲染组件
  },
})

/**
 * 微前端路由器组件
 *
 * @description
 * 统一的路由管理组件，根据运行环境自动切换模式：
 * - 微前端环境：使用 MemoryRouter 模式，监听主应用数据
 * - 独立运行：使用 hash 或 history 模式，支持独立路由
 */
export const MicroAppRouter = defineComponent({
  name: 'MicroAppRouter',
  props: {
    /** 路由配置数组 */
    routes: {
      type: Array as () => RouteConfig[],
      required: true,
    },
    /** 默认路径 */
    defaultPath: {
      type: String,
      default: '/home',
    },
    /** 路由基础路径前缀 */
    basename: {
      type: String,
      default: '/',
    },
    /** 路由模式：hash 或 history */
    historyMode: {
      type: String as () => 'hash' | 'history',
      default: 'hash',
    },
    /** 找不到路由时的回退组件 */
    fallback: {
      type: Object as () => Component,
      default: undefined,
    },
  },
  setup(props) {
    // ==================== 微前端环境 ====================
    if (isMicroApp()) {
      const { ready, targetPath } = useMicroAppRouteSync()

      return () => {
        const dataListener = h(MicroAppDataListener)

        // 路由未准备好时，只渲染数据监听器
        if (!ready.value) {
          return h('div', { class: 'micro-app-router', style: 'height: 100%; width: 100%;' }, [
            dataListener,
          ])
        }

        // 获取当前路径并规范化
        const currentPath = targetPath.value || props.defaultPath
        const normalizedPath =
          currentPath.replace(/^\//, '').split('?')[0] || props.defaultPath.replace(/^\//, '')
        const lookupPath = `/${normalizedPath}`

        // 查找匹配的路由
        const route = props.routes.find((r) => r.path === lookupPath)
        const content = route
          ? h(route.component, { key: lookupPath })
          : props.fallback
            ? h(props.fallback)
            : null

        return h('div', { class: 'micro-app-router', style: 'height: 100%; width: 100%;' }, [
          dataListener,
          h(MicroAppRouteSync), // 路由同步组件
          content,
        ])
      }
    }

    // ==================== 独立运行环境 ====================
    const currentPath = ref(props.defaultPath)
    const isHistoryMode = props.historyMode === 'history'
    const basename = props.basename === '/' ? '' : props.basename

    /**
     * 获取当前路径
     * @returns 当前路径字符串
     */
    const getCurrentPath = () => {
      if (isHistoryMode) {
        const path = window.location.pathname
        return path.startsWith(basename) ? path.slice(basename.length) || props.defaultPath : path
      } else {
        const hash = window.location.hash.slice(1)
        return hash || props.defaultPath
      }
    }

    /**
     * 导航到指定路径
     * @param path - 目标路径
     */
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

    /**
     * 处理路由变化事件
     */
    const handleRouteChange = (_event: Event) => {
      const path = getCurrentPath()
      if (path !== currentPath.value) {
        currentPath.value = path
      }
    }

    // 提供路由上下文给子组件使用
    const routerContext = {
      currentPath,
      navigate: navigateTo,
      isHistoryMode,
    }
    provide('microAppRouter', routerContext)

    // 监听路由变化
    onMounted(() => {
      currentPath.value = getCurrentPath()
      if (isHistoryMode) {
        window.addEventListener('popstate', handleRouteChange)
      } else {
        window.addEventListener('hashchange', handleRouteChange)
      }
    })

    // 清理事件监听
    onUnmounted(() => {
      if (isHistoryMode) {
        window.removeEventListener('popstate', handleRouteChange)
      } else {
        window.removeEventListener('hashchange', handleRouteChange)
      }
    })

    // 渲染函数
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

/** 导出获取全局路由状态的函数 */
export { getGlobalRouteState }
