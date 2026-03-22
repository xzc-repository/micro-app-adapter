import React, {JSX, use, useCallback, useEffect, useRef, useSyncExternalStore} from "react";
import { MemoryRouter, Routes, useNavigate, useLocation, NavigateFunction, Route } from "react-router-dom";
export function isMicroApp(): boolean {
  return !!window.__MICRO_APP_ENVIRONMENT__;
}
export function getBasename(): string {
  return window.__MICRO_APP_BASE_ROUTE__ || '/';
}
export interface MicroAppRouteState {
    ready:boolean;
    targetPath:string;
    listeners: Set<() => void>;
    subscribe: (listeners: ()=> void) => () => void;
    notify: () => void;
    setPath: (path: string) => void;
    reset(): void;
}
export interface UseMicroAppRouteSyncResult{
    ready:boolean;
    targetPath:string;
}
export interface MicroAppDataListenerProps {
    onRouteChange:(data: { path: string, event?: string; }) => void;
}
export interface RouteConfig {
    path: string;
    component: React.ComponentType;
}
export interface MicroAppRouteViewProps {
    routes: RouteConfig[];
    defaultPath?: string;
    fallback?: React.ComponentType;
}
export interface MicroAppRouterProps {
    Router: React.ComponentType<{basename?: string, children?: React.ReactNode}>;
    routes: RouteConfig[];
    defaultPath?: string;
    fallback?: React.ComponentType;
    basename?: string;
}
export function createMicroAppRouteState(): MicroAppRouteState {
    const envIsMicroApp = window.__MICRO_APP_ENVIRONMENT__;
    const state: MicroAppRouteState =  {
        ready: !envIsMicroApp,
        targetPath: '',
        listeners: new Set(),
        subscribe(listener:() => void){
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        },
        notify() {
            this.listeners.forEach(listener => listener());
        },
        setPath(path: string) {
            this.targetPath = path;
            this.ready = true;
            this.notify();
        },
        reset() {
            this.ready =false
            this.notify();
            this.targetPath = '';
        }
    }
    return state;
}

export function useMicroAppRouteSync(): UseMicroAppRouteSyncResult {
    const state = getGlobalRouteState();
    const ready = useSyncExternalStore(
        useCallback((listener: () => void) => state.subscribe(listener), [state]),
        useCallback(() => state.ready, [state])
    );
    const targetPath = useSyncExternalStore(
        useCallback((listener: () => void) => state.subscribe(listener), [state]),
        useCallback(() => state.targetPath, [state]),
    )
    return { ready, targetPath}
}

export function useMicroAppNavigate(navigate: NavigateFunction): UseMicroAppRouteSyncResult {
    const { ready, targetPath } = useMicroAppRouteSync();
    const lastPathRef = useRef<string>('');
    useEffect(() => {
        if(!window.__MICRO_APP_ENVIRONMENT__) return
        if(!targetPath || targetPath === lastPathRef.current) return;
        lastPathRef.current = targetPath;
        navigate(targetPath, {replace: true});
    },[targetPath, navigate]);
    return { ready, targetPath };
}
export function MicroAppDataListener(props: MicroAppDataListenerProps): JSX.Element | null {
    const { onRouteChange } = props;
    const state = getGlobalRouteState();
    const lastPathRef = useRef<string>('');
    const updateRoute = useCallback((data: { path?:string; event?:string}) => {
        if(!data?.path || data.path === lastPathRef.current) return;
        lastPathRef.current = data.path;
        state.setPath(data.path);
        onRouteChange?.({path:data.path, event:data.event});
    },[state, onRouteChange]);
    useEffect(() => {
        const microApp = (window as any).microApp || (window.parent as any)?.microApp;
        if (!microApp) return;
        const handleDataChange = (data: { path?: string, event?: string }) => {
            if(data?.event === 'beforeShow' || data?.event === 'afterShow') {
                state.reset();
                lastPathRef.current = '';
                if(data.path) updateRoute(data);
                return
            }
            updateRoute(data);
        };
        microApp.addDataListener(handleDataChange);
        const initData = microApp.getData();
        if(initData?.path) updateRoute(initData);
        return () => microApp.removeDataListener(handleDataChange);
    }, [state, updateRoute])
    return null
}
export function MicroAppRouteView(props: MicroAppRouteViewProps): JSX.Element | null {
    const { routes, defaultPath = "/home", fallback: Fallback } = props;
    const { ready, targetPath } = useMicroAppRouteSync();
    if(!isMicroApp()) return null;
    if(!ready) return null;
    const normalizedPath = targetPath.replace(/^\//, '').split('?')[0] || defaultPath.replace(/^\//, '');
    const lookupPath = `/${normalizedPath}`;
    const route = routes.find(r => r.path === lookupPath);
    if(!route)  {
        if(Fallback) return React.createElement(Fallback);
        const defaultRoute = routes.find(r => r.path === defaultPath);
        const DefaultComponent = defaultRoute?.component;
        if(DefaultComponent) return React.createElement(DefaultComponent);
        return null;
    }
    const Component = route.component;
    return React.createElement(Component);
}
function MicroAppRouterInternal(props: MicroAppRouterProps): JSX.Element {
    const { Router, routes, basename } = props;
    return React.createElement(
        Router,
        {basename},
        React.createElement(
            Routes,
            null,
            routes.map(({path, component: Component}) => React.createElement(Route, {
                key: path,
                path,
                element: React.createElement(Component),
            })
        )
    ))
}
function RouteNavigateSync(): null {
    const { targetPath } = useMicroAppRouteSync();
    const navigate = useNavigate();
    const location = useLocation();
    const lastTargetPathRef = useRef<string>('');
    const isSyncingFromBaseRef = useRef<boolean>(false);
    const lastSyncedPathRef = useRef<string>('');
    useEffect(() => {
        if(!targetPath || targetPath === lastTargetPathRef.current) return;
        if(targetPath === location.pathname) {
            lastTargetPathRef.current = targetPath;
            return;
        }
        lastTargetPathRef.current = targetPath;
        isSyncingFromBaseRef.current = true;
        navigate(targetPath, {replace: true});
    },[targetPath, navigate, location.pathname]);
    useEffect(() => {
        if(!window.__MICRO_APP_ENVIRONMENT__) return;
        if(isSyncingFromBaseRef.current) {
            isSyncingFromBaseRef.current = false;
            lastSyncedPathRef.current = location.pathname;
            return;
        }
        if(location.pathname === lastTargetPathRef.current) return;
        const microApp = (window as any).microApp || (window.parent as any)?.microApp;
        if(!microApp) return;
        const globalData = microApp.getGlobalData?.();
        const appName = window.__MICRO_APP_NAME__;
        const baseroute =window.__MICRO_APP_BASE_ROUTE__ || '';
        const syncToBase = (path: string) => {
            const fullPath = baseroute + path;
            if(globalData?.pushState && appName) {
                globalData.pushState(appName, fullPath,'');
            } else if(globalData?.jump) {
                globalData.jump(fullPath);
            }
        }
        lastSyncedPathRef.current = location.pathname;
        syncToBase(location.pathname);
    }, [location.pathname]);
    return null
}
function MicroAppRouterContentWithoutListener(props: MicroAppRouteViewProps): JSX.Element {
    const { routes } = props;
    return React.createElement(
        React.Fragment,
        null,
        React.createElement(RouteNavigateSync),
        React.createElement(
            Routes,
            null,
            routes.map(({path, component: Component}) => React.createElement(Route, {
                key: path,
                path,
                element: React.createElement(Component),
            }))
        )
    )
}
function MicroAppRouterMicroApp(props: MicroAppRouterProps): JSX.Element {
    const { routes, defaultPath = '/home' } = props;
    const { ready, targetPath } = useMicroAppRouteSync();
    const dataListener = React.createElement(MicroAppDataListener);
    if(!ready) {
        return React.createElement(React.Fragment, null, dataListener);
    }
    const initialPath = targetPath || defaultPath;
    return React.createElement(
        React.Fragment,
        null,
        dataListener,
        React.createElement(
            MemoryRouter,
            {initialEntries: [initialPath], key: initialPath},
            React.createElement(MicroAppRouterContentWithoutListener, {routes})
        )
    )
}
export function MicroAppRouter(props: MicroAppRouterProps): JSX.Element {
    if(isMicroApp()) {
        return React.createElement(MicroAppRouterMicroApp, props);
    }
    return React.createElement(MicroAppRouterInternal, props);
}
let _globalRouteState: MicroAppRouteState | null = null;
function getGlobalRouteState(): MicroAppRouteState {
    if(!_globalRouteState) {
        _globalRouteState = createMicroAppRouteState();
    }
    return _globalRouteState;
}