declare global {
  interface Window {
    VLibras?: {
      Widget: new (url: string) => {
        init?: () => void;
      };
    };
  }
}

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    vw?: string | boolean;
    'vw-access-button'?: string | boolean;
    'vw-plugin-wrapper'?: string | boolean;
  }
}

export {};

