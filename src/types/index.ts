import { Request as RestanaRequest } from 'restana';
import { Request as ExpressRequest } from 'express';
import { IncomingMessage } from 'http';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'arbitrator';
  business_id?: string | null;
  [key: string]: any;
}

type CustomRequest = (RestanaRequest | ExpressRequest) & Partial<IncomingMessage> & {
  user?: User;
  body: any;
  headers: { [key: string]: string | string[] | undefined };
  params: {
    id?: string;
    email?: string;
    profileId?: string; 
    [key: string]: string | undefined; 
  };
  initiatorEmail?: string;
  counterpartyEmail?: string;
  clientIp?: string;
  ip: string;
  path: string;
  method: string;
  file?: Express.Multer.File;
};

type NextFunction = (err?: any) => void;

interface RestanaResponse {
  send(body?: any, statusCode?: number): void;
  setHeader(name: string, value: string): void;
  getHeader(name: string): string | undefined;
  [key: string]: any;
}

export { CustomRequest, RestanaResponse, User, NextFunction };