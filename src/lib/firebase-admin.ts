import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveFirebaseProjectId(): string | undefined {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;

  const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { projectId?: string };
      if (parsed?.projectId && parsed.projectId !== 'remixed-project-id') {
        return parsed.projectId;
      }
    } catch {
      // Ignore malformed optional config file
    }
  }
  return undefined;
}

const projectId = resolveFirebaseProjectId();
let adminAuthInstance: Auth | null = null;

if (projectId) {
  if (!getApps().length) {
    initializeApp({ projectId });
  }
  adminAuthInstance = getAuth();
}

export const adminAuth = adminAuthInstance;
