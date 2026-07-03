declare module "ngrok" {
  export function connect(options: { addr: number; authtoken?: string }): Promise<string>;
  export function disconnect(url?: string): Promise<void>;
  export function kill(): Promise<void>;
  export function getVersion(options?: { binPath?: (defaultPath: string) => string }): Promise<string>;
}

declare module "ngrok/download" {
  export default function downloadNgrok(
    callback: (err?: Error | null) => void,
    options?: {
      arch?: string;
      ignoreCache?: boolean;
    }
  ): void;
}
