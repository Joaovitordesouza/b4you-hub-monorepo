declare module 'stream-json' {
  import { Transform } from 'stream';
  export function parser(options?: any): Transform;
}

declare module 'stream-json/streamers/StreamArray' {
  import { Transform } from 'stream';
  export function streamArray(options?: any): Transform;
}

declare module 'stream-chain' {
  import { Transform } from 'stream';
  export function chain(streams: any[], options?: any): Transform;
}
