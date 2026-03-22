import './types'
export interface RegisterReactMicroAppOptions {
  appName: string;
  containerId?: string;
}
export interface  MicroAppLifecycle {
  mount:(props?: { container?: HTMLElement }) => void;
  unmount:() => void;
}
export function registerReactMicroApp(
    React:any,
    ReactDOM:any,
    AppComponent: React.ComponentType,
    options: RegisterReactMicroAppOptions
): void {
  const { appName, containerId = 'root' } = options;
  let root: any = null;
  function render (props?: { container?: HTMLElement }) {
    const container = props?.container || document.getElementById(containerId);
   if (!container) {
     return;
   }
   if(root) {
     root.unmount();
     root = null;
   }
   root = ReactDOM.createRoot(container as HTMLElement);
   root.render(React.createElement(AppComponent));
  }
  function mount (props?: { container?: HTMLElement }):void {
    render(props);
  }
  function unmount (): void {
    if(root) {
      root.unmount();
      root = null;
    }
  }
  const resolvedName = appName || window.__MICRO_APP_NAME__;
  (window as any)[`micro-app-${resolvedName}`] = { mount, unmount } as MicroAppLifecycle;
  if(!window.__MICRO_APP_ENVIRONMENT__) {
    render()
  }
}
export {
  isMicroApp,
    getBasename,
    createMicroAppRouteState,
    useMicroAppRouteSync,
    useMicroAppNavigate,
    MicroAppDataListener,
    MicroAppRouter,
    MicroAppRouteView
} from './route-sync'

export type {
  MicroAppRouteState,
    UseMicroAppRouteSyncResult,
    MicroAppDataListenerProps,
    RouteConfig,
    MicroAppRouteViewProps,
    MicroAppRouterProps
} from './route-sync'
