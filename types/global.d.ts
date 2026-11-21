// Global type declarations for modules with missing or incompatible types

// react-native-view-shot - missing React 19 types
declare module 'react-native-view-shot' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  export interface CaptureOptions {
    format?: 'png' | 'jpg';
    quality?: number;
    result?: 'tmpfile' | 'datauri' | 'datauri-base64';
    snapshotContentContainer?: boolean;
  }

  export interface ViewShotProps extends ViewProps {
    onCapture?: (uri: string) => void;
    captureMode?: 'view' | 'mount';
    children?: React.ReactNode;
  }

  export class ViewShot extends React.Component<ViewShotProps> {
    capture(): Promise<string>;
    capture(options: CaptureOptions): Promise<string>;
  }

  export default ViewShot;
}

// expo-blur - BlurView type issues
declare module 'expo-blur' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  export interface BlurViewProps extends ViewProps {
    intensity?: number;
    tint?: 'light' | 'dark' | 'default';
    blurType?: 'default' | 'system' | 'material';
    blurAmount?: number;
    overlayColor?: string;
    reducedTransparencyFallbackColor?: string;
  }

  export const BlurView: React.FC<BlurViewProps>;
}

// expo-camera - CameraView type issues
declare module 'expo-camera' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  export type CameraType = 'front' | 'back';
  export type FlashMode = 'off' | 'on' | 'auto';
  export type WhiteBalance = 'auto' | 'cloudy' | 'daylight' | 'flash' | 'fluorescent' | 'incandescent' | 'shade' | 'twilight' | 'warm-fluorescent';
  export type AutoFocus = 'off' | 'on' | 'auto';
  export type Zoom = number;

  export interface CameraViewProps extends ViewProps {
    type?: CameraType;
    flashMode?: FlashMode;
    autoFocus?: AutoFocus;
    whiteBalance?: WhiteBalance;
    zoom?: Zoom;
    pictureSize?: string;
    ratio?: string;
    videoStabilizationMode?: 'off' | 'standard' | 'cinematic' | 'cinematic-extended';
    onCameraReady?: () => void;
    onMountError?: (error: Error) => void;
    onBarCodeScanned?: (data: { data: string; type: string }) => void;
    onPictureSaved?: (uri: string) => void;
    onVideoRecorded?: (uri: string) => void;
  }

  export const CameraView: React.FC<CameraViewProps>;
  export default CameraView;
}

// expo-linear-gradient - LinearGradient type issues
declare module 'expo-linear-gradient' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
    startPoint?: { x: number; y: number };
    endPoint?: { x: number; y: number };
  }

  export const LinearGradient: React.FC<LinearGradientProps>;
  export default LinearGradient;
}

// expo-video - VideoView type issues
declare module 'expo-video' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  export interface VideoViewProps extends ViewProps {
    source: { uri: string } | number;
    style?: any;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
    isLooping?: boolean;
    isMuted?: boolean;
    playbackRate?: number;
    poster?: string;
    onPlaybackStatusUpdate?: (status: {
      isLoaded: boolean;
      isPlaying: boolean;
      durationMillis: number;
      positionMillis: number;
      naturalSize: { width: number; height: number; orientation: 'portrait' | 'landscape' };
      error?: string;
    }) => void;
    onFullscreenUpdate?: (isFullscreen: boolean) => void;
    usePoster?: boolean;
    controls?: boolean;
    posterStyle?: any;
  }

  export const VideoView: React.FC<VideoViewProps>;
  export default VideoView;
}

// react-native-reanimated - fix Animated types
declare module 'react-native-reanimated' {
  import React from 'react';

  export interface SharedValue<T> {
    value: T;
  }

  export interface AnimatedStyle {
    [key: string]: any;
  }

  export function useSharedValue<T>(initial: T): SharedValue<T>;
  export function useAnimatedStyle<T extends AnimatedStyle>(factory: () => T): T;
  export function withTiming<T>(toValue: T, config?: { duration?: number; easing?: (t: number) => number }): T;
  export function withSpring<T>(toValue: T, config?: { damping?: number; stiffness?: number; mass?: number }): T;
  export function withSequence(...animations: any[]): any;
  export function withRepeat(animation: any, times?: number, repeatReverse?: boolean): any;
  export function withDelay(delay: number, animation: any): any;
  export function runOnJS<T extends (...args: any[]) => any>(fn: T): T;

  export const FadeIn: {
    duration: (ms: number) => any;
  };
  export const FadeInUp: {
    duration: (ms: number) => any;
  };
  export const FadeInDown: {
    duration: (ms: number) => any;
  };
}

// expo-file-system - File type
declare module 'expo-file-system' {
  export class File {
    constructor(uri: string);
    uri: string;
    exists: boolean;
    name: string;
    async copy(options: { to: File | string }): Promise<void>;
    async delete(): Promise<void>;
    async getInfo(): Promise<{ exists: boolean; size: number; uri: string }>;
  }

  export class Directory {
    constructor(...paths: string[]);
    uri: string;
    exists: boolean;
    async create(options?: { intermediates?: boolean; idempotent?: boolean }): Promise<void>;
    async list(options?: { recursive?: boolean }): Promise<File[]>;
    async delete(): Promise<void>;
  }

  export const Paths: {
    document: string;
    cache: string;
    bundle: string;
  };
}

// react-native-screens - Stack types
declare module 'react-native-screens' {
  export function enableScreens(enabled?: boolean): void;
}

// Fix for react/jsx-runtime
declare module 'react/jsx-runtime' {
  import React from 'react';
  export namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface IntrinsicAttributes extends React.Attributes {}
  }
  export const jsx: any;
  export const jsxs: any;
  export const jsxDEV: any;
  export const Fragment: React.FC<{ children?: React.ReactNode }>;
}

// Ensure React types are available
declare module 'react' {
  export = React;
  export as namespace React;
  import ReactDOM from 'react-dom';
  export { ReactDOM };
}