declare module 'restana' {
  export interface Request {
    body: any;
    params: any;
    query: any;
    headers: any;
    user?: any;
  }
  
  export interface Response {
    send: (body: any, statusCode?: number) => void;
  }
  
  export interface Service {
    use: (path: string, handler: any) => void;
    get: (path: string, handler: any) => void;
    post: (path: string, handler: any) => void;
    put: (path: string, handler: any) => void;
    delete: (path: string, handler: any) => void;
    patch: (path: string, handler: any) => void;
    start: (port: number) => Promise<any>;
    close: () => Promise<void>;
  }
  
  export default function(options?: any): Service;
}