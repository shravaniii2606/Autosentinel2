import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        'auto-rotate'?: boolean;
        'auto-rotate-delay'?: string;
        'rotation-per-second'?: string;
        'camera-controls'?: boolean;
        'disable-zoom'?: boolean;
        'shadow-intensity'?: string;
        exposure?: string;
        'environment-image'?: string;
      };
    }
  }
}
