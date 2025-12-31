export enum Layout {
    PORTRAIT = 'PORTRAIT',
    LANDSCAPE = 'LANDSCAPE',
}

export interface Viewport {
    width: number;
    height: number;
    deviceScalFactor?: number;
    isMobile?: boolean;
    isLandscape?: boolean;
    hasTouch?: boolean;
}