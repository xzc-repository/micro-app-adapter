/**
 * @fileoverview Webpack Public Path 配置
 * 用于动态设置子应用的资源加载路径
 * @module @micro-app-adapter/react-webpack/public-path
 *
 * @description
 * 在微前端环境中，子应用的资源需要从主应用指定的路径加载。
 * 该文件必须在子应用入口文件的最顶部引入！
 */

// 仅在微前端环境中设置 public path
if (window.__MICRO_APP_ENVIRONMENT__) {
  // 使用主应用提供的公共路径，或默认为 '/'
  __webpack_public_path__ = window.__MICRO_APP_PUBLIC_PATH__ || '/'
}
