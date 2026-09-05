import { io } from 'socket.io-client';
import { LOCAL_SERVER, CLOUD_SERVER } from './config';

let socket = null, baseUrl = null;

export function connectSocket(user) {
  return new Promise(resolve => {
    const attempt = (url, fallback) => {
      const s = io(url, { timeout: 4000, transports: ['websocket'] });
      s.on('connect', () => { socket = s; baseUrl = url; resolve({ socket: s, baseUrl: url }); });
      s.on('connect_error', () => { s.close(); fallback ? attempt(fallback, null) : resolve({ socket: null, baseUrl: CLOUD_SERVER }); });
    };
    attempt(LOCAL_SERVER, CLOUD_SERVER); // يحاول المحلي أولاً ثم السحابي
  });
}
export const getSocket = () => socket;
export const getBaseUrl = () => baseUrl || CLOUD_SERVER;
