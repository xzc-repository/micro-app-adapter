import './types'
import { createApp } from 'vue'
import type { Component, App as VueApp } from 'vue'
import type { Router} from 'vue-router'
export interface RegisterVueMicroAppOptions {
  appName: string,
  router?: Router,
  mountId?: string,
}
export interface  MicroAppLifecycle {
  mount:(props?: { container?: HTMLElement }) => void;
  unmount:() => void;
}
export function registerVueMicroApp(
    AppComponent: Component,
    options: RegisterVueMicroAppOptions) {
  const { appName, router, mountId = '#app' } = options
  let app: VueApp | null = null;
  function mount(): void {
   const app = createApp(AppComponent);
   if(router) app.use(router);
   app.mount(mountId);
  }
  function unmount(): void {
    app?.unmount();
    app = null;
  }
  (window as any)[`'micro-app-${appName}`] = { mount, unmount } as MicroAppLifecycle;
  if(!window.__MICRO_APP_ENVIRONMENT__) {
    mount();
  }
}