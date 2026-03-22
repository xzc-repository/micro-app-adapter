import "./types"
import { createApp } from 'vue'
import type { Component, App as VueApp } from 'vue'
import type { Router } from 'vue-router'
export interface RegisterVueMicroAppOptions {
  appName: string,
  router?: Router,
  mountId?: string,
}
export interface  MicroAppLifecycle {
  mount:(props?: { container?: HTMLElement }) => void;
  unmount:() => void;
}
export function registerVueMicroApp(AppComponent: Component, options: RegisterVueMicroAppOptions) {
  const { appName, router, mountId = '#app' } = options
  let app: VueApp | null = null;
  function mount(props?: { container?: HTMLElement }): void {
    const container = props?.container || document.querySelector(mountId)
    if(!container) {
      return;
    }
    if(app) {
      app.unmount();
      app = null;
    }
    app = createApp(AppComponent);
    if(router) app.use(router);
    app.mount(container as HTMLElement);
  }
  function unmount(): void {
    if(app) {
      app.unmount();
      app = null;
    }
  }
 const resolvedName = appName || window.__MICRO_APP_NAME__;
  (window as any)[`'micro-app-${resolvedName}`] = { mount, unmount } as MicroAppLifecycle;
  if(!window.__MICRO_APP_ENVIRONMENT__) {
    mount();
  }
 }
export {
  isMicroApp,
    getBasename,
  createMicroAppRouteState,
  useMicroAppRouteSync,
  useMicroAppNavigate,
  MicroAppDataListener,
  MicroAppRouteView,
  MicroAppRouter
} from "./route-sync";
export type {
  MicroAppRouteState,
  UseMicroAppRouteSyncResult,
  RouteConfig,
  MicroAppRouterProps
} from "./route-sync";