declare global {
    interface Window {
        __MICRO_APP_ENVIRONMENT__: boolean;
        __MICRO_APP_NAME__: string;
        __MICRO_APP_BASE_URL__: string;
        __MICRO_APP_PUBLIC_PATH__: string;
        [key: string]: any;
    }
    let __webpack_public_path__: string;
}
export {};
