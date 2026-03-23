/**
 * @fileoverview 全局类型声明文件
 * 扩展 Window 接口，添加微前端环境变量声明
 * @module @micro-app-adapter/react-webpack/types
 */

declare global {
  /**
   * 扩展 Window 接口
   * 添加微前端框架注入的全局变量
   */
  interface Window {
    /** 是否运行在微前端环境中 */
    __MICRO_APP_ENVIRONMENT__: boolean
    /** 子应用名称 */
    __MICRO_APP_NAME__: string
    /** 子应用基础 URL */
    __MICRO_APP_BASE_URL__: string
    /** 子应用公共路径前缀 */
    __MICRO_APP_PUBLIC_PATH__: string
    /** 支持其他动态属性 */
    [key: string]: any
  }

  /**
   * Webpack 全局变量：公共路径
   * 用于动态设置资源加载路径
   */
  let __webpack_public_path__: string
}

export {}
