import http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { adminAuth } from './firebase-admin.ts';
import { verifySessionToken } from './security.ts';
import { getOrCreateGoogleUser, getUserById } from '../db/queries.ts';

interface AuthedSocket {
  ws: WebSocket;
  userId: number;
  rol: string;
  clientId?: string;
  isAlive: boolean;
}

export interface RealtimePayload {
  type: string;
  data?: unknown;
}

class RealtimeHub {
  private wss: WebSocketServer | null = null;
  private clients = new Set<AuthedSocket>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  attach(server: http.Server) {
    if (this.wss) return;
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
      if (!req.url || !req.url.startsWith('/ws')) {
        return;
      }
      this.wss!.handleUpgrade(req, socket, head, (ws) => {
        this.wss!.emit('connection', ws, req);
      });
    });

    this.wss.on('connection', (ws) => {
      let authedClient: AuthedSocket | null = null;

      const authTimeout = setTimeout(() => {
        if (!authedClient && ws.readyState === WebSocket.OPEN) {
          ws.close(4001, 'Auth timeout');
        }
      }, 10000);

      ws.on('pong', () => {
        if (authedClient) authedClient.isAlive = true;
      });

      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg?.type === 'auth' && typeof msg.token === 'string') {
            const token = msg.token.trim();
            let resolvedUser: { id: number; rol: string } | null = null;

            const session = verifySessionToken(token);
            if (session) {
              const dbUser = await getUserById(session.userId);
              if (dbUser) resolvedUser = { id: dbUser.id, rol: dbUser.rol };
            } else {
              const decoded = await adminAuth.verifyIdToken(token);
              if (decoded.email) {
                const dbUser = await getOrCreateGoogleUser(decoded.uid, decoded.email, decoded.name);
                resolvedUser = { id: dbUser.id, rol: dbUser.rol };
              }
            }

            if (!resolvedUser) {
              ws.close(4001, 'Unauthorized');
              return;
            }

            clearTimeout(authTimeout);
            if (authedClient) {
              this.clients.delete(authedClient);
            }
            authedClient = {
              ws,
              userId: resolvedUser.id,
              rol: resolvedUser.rol,
              clientId: typeof msg.clientId === 'string' ? msg.clientId : undefined,
              isAlive: true,
            };
            this.clients.add(authedClient);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'auth:ok' }));
            }
          }
        } catch {
          if (!authedClient && ws.readyState === WebSocket.OPEN) {
            ws.close(4001, 'Invalid auth');
          }
        }
      });

      ws.on('close', () => {
        clearTimeout(authTimeout);
        if (authedClient) {
          this.clients.delete(authedClient);
          authedClient = null;
        }
      });

      ws.on('error', () => {
        clearTimeout(authTimeout);
        if (authedClient) {
          this.clients.delete(authedClient);
          authedClient = null;
        }
      });
    });

    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(client);
          continue;
        }
        client.isAlive = false;
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, 30000);
  }

  broadcastAll(payload: RealtimePayload, excludeClientId?: string) {
    const serialized = JSON.stringify(payload);
    for (const client of this.clients) {
      if (excludeClientId && client.clientId === excludeClientId) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(serialized);
      }
    }
  }

  broadcastDirectivoAndUser(targetUserId: number, payload: RealtimePayload, excludeClientId?: string) {
    const serialized = JSON.stringify(payload);
    for (const client of this.clients) {
      if (excludeClientId && client.clientId === excludeClientId) continue;
      if (client.rol === 'directivo' || client.userId === targetUserId) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(serialized);
        }
      }
    }
  }

  broadcastDirectivoOnly(payload: RealtimePayload, excludeClientId?: string) {
    const serialized = JSON.stringify(payload);
    for (const client of this.clients) {
      if (excludeClientId && client.clientId === excludeClientId) continue;
      if (client.rol === 'directivo' && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(serialized);
      }
    }
  }
}

export const realtimeHub = new RealtimeHub();
