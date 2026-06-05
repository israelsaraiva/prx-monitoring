export type KeyValue = { key: string; value: string; active: boolean; id: number };

export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; token: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'apikey'; key: string; value: string; addTo: 'header' | 'query' };

export type BodyType = 'none' | 'json' | 'text' | 'xml' | 'html' | 'form-data' | 'urlencoded';

export interface SavedRequest {
  id: string;
  collectionId: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: string;
  bodyType: BodyType;
  auth: AuthConfig;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
  requests: SavedRequest[];
}

export interface EnvVariable {
  key: string;
  value: string;
  active: boolean;
  id: number;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvVariable[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
  time: number;
  size: number;
  request: {
    method: string;
    url: string;
    headers: KeyValue[];
    params: KeyValue[];
    body: string;
    bodyType: BodyType;
    auth: AuthConfig;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    setCookies?: string[];
    data: unknown;
    isJson: boolean;
    time: number;
    size: number;
  };
}

export interface Settings {
  timeout: number;
  sslVerification: boolean;
  useServerProxy: boolean;
  localProxyUrl: string;
}

const COLLECTIONS_KEY = 'rest-client:collections';
const ENVIRONMENTS_KEY = 'rest-client:environments';
const ACTIVE_ENVIRONMENT_ID_KEY = 'rest-client:active-environment-id';
const HISTORY_KEY = 'rest-client:history';
const SETTINGS_KEY = 'rest-client:settings';
const DEFAULT_SETTINGS: Settings = { timeout: 30000, sslVerification: true, useServerProxy: false, localProxyUrl: '' };

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    if (!value) {
      return fallback;
    }

    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

export function getCollections(): Collection[] {
  const collections = readStorage<Collection[]>(COLLECTIONS_KEY, []);
  return Array.isArray(collections) ? collections : [];
}

export function saveCollections(collections: Collection[]) {
  writeStorage(COLLECTIONS_KEY, Array.isArray(collections) ? collections : []);
}

export function getEnvironments(): Environment[] {
  const environments = readStorage<Environment[]>(ENVIRONMENTS_KEY, []);
  return Array.isArray(environments) ? environments : [];
}

export function saveEnvironments(environments: Environment[]) {
  writeStorage(ENVIRONMENTS_KEY, Array.isArray(environments) ? environments : []);
}

export function getActiveEnvironmentId(): string | null {
  const activeEnvironmentId = readStorage<string | null>(ACTIVE_ENVIRONMENT_ID_KEY, null);
  return typeof activeEnvironmentId === 'string' ? activeEnvironmentId : null;
}

export function setActiveEnvironmentId(id: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_ENVIRONMENT_ID_KEY, id);
      return;
    }

    window.localStorage.removeItem(ACTIVE_ENVIRONMENT_ID_KEY);
  } catch {
    // ignore storage failures
  }
}

export function getHistory(): HistoryEntry[] {
  const history = readStorage<HistoryEntry[]>(HISTORY_KEY, []);
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .slice()
    .sort((firstEntry, secondEntry) => secondEntry.timestamp - firstEntry.timestamp)
    .slice(0, 100);
}

export function saveHistory(history: HistoryEntry[]) {
  const normalizedHistory = Array.isArray(history)
    ? history
        .slice()
        .sort((firstEntry, secondEntry) => secondEntry.timestamp - firstEntry.timestamp)
        .slice(0, 100)
    : [];

  writeStorage(HISTORY_KEY, normalizedHistory);
}

export function getSettings(): Settings {
  const settings = readStorage<Partial<Settings>>(SETTINGS_KEY, DEFAULT_SETTINGS);

  return {
    timeout: typeof settings?.timeout === 'number' ? settings.timeout : DEFAULT_SETTINGS.timeout,
    sslVerification:
      typeof settings?.sslVerification === 'boolean' ? settings.sslVerification : DEFAULT_SETTINGS.sslVerification,
    useServerProxy:
      typeof settings?.useServerProxy === 'boolean' ? settings.useServerProxy : DEFAULT_SETTINGS.useServerProxy,
    localProxyUrl:
      typeof settings?.localProxyUrl === 'string' ? settings.localProxyUrl : DEFAULT_SETTINGS.localProxyUrl,
  };
}

export function saveSettings(settings: Settings) {
  writeStorage(SETTINGS_KEY, {
    timeout: typeof settings.timeout === 'number' ? settings.timeout : DEFAULT_SETTINGS.timeout,
    sslVerification:
      typeof settings.sslVerification === 'boolean' ? settings.sslVerification : DEFAULT_SETTINGS.sslVerification,
    useServerProxy:
      typeof settings.useServerProxy === 'boolean' ? settings.useServerProxy : DEFAULT_SETTINGS.useServerProxy,
    localProxyUrl: typeof settings.localProxyUrl === 'string' ? settings.localProxyUrl : DEFAULT_SETTINGS.localProxyUrl,
  });
}

export function interpolateEnv(text: string, env: Environment | null): string {
  if (!text || !env) {
    return text;
  }

  const activeVariables = new Map(
    env.variables
      .filter((variable) => variable.active && variable.key)
      .map((variable) => [variable.key.trim(), variable.value])
  );

  return text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, variableName: string) => {
    const resolvedValue = activeVariables.get(variableName.trim());
    return resolvedValue ?? match;
  });
}
