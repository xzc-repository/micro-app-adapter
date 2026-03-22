import './type'
export interface RegisterReactMicroAppOptions {
  appName: string;
  containerId?: string;
}
export interface  MicroAppLifecycle {
  mount:(props?: { container?: HTMLElement }) => void;
  unmount:() => void;
}
function isReact18(ReactDOM:any): boolean {
  return typeof ReactDOM?.createRoot === 'function';
}
export function registerReactMicroApp(
    React:any,
    ReactDOM:any,
    AppComponent: React.ComponentType,
    options: RegisterReactMicroAppOptions
): void {
  const { appName, containerId = 'root' } = options;
  let root: any = null;
  let mountedContainer: HTMLElement | null = null;
  const useReact18 = isReact18(ReactDOM);
  function render (props?: { container?: HTMLElement }) {
    const container = props?.container || document.getElementById(containerId);
    if (!container) {
      return;
    };
    if(useReact18) {
      if(root) {
        root.unmount();
        root = null;
      }
      root = ReactDOM.createRoot(container as HTMLElement);
      root.render(React.createElement(AppComponent));
    }else {
      if(mountedContainer) {
        (ReactDOM as any).unmountComponentAtNode(mountedContainer);
      }
      (ReactDOM as any).render(React.createElement(AppComponent), container as HTMLElement);
      mountedContainer = container as HTMLElement;
    }
  }
  (window as any)[`micro-app-${appName}`] = {
    mount(props?: { container?: HTMLElement }) { render(props); },
    unmount() {
      if(useReact18) {
        if(root) {
          root.unmount();
          root = null;
        }
      }else {
        if(mountedContainer) {
          (ReactDOM as any).unmountComponentAtNode(mountedContainer);
          mountedContainer = null;
        }
      }
    }
  } as MicroAppLifecycle;
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
