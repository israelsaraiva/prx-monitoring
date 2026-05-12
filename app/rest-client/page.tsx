'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Clock,
  Code,
  Copy,
  Download,
  Folder,
  Globe,
  HardDrive,
  HelpCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  type AuthConfig,
  type BodyType,
  type Collection,
  type Environment,
  type HistoryEntry,
  type KeyValue,
  type SavedRequest,
  type Settings as RestClientSettings,
  getActiveEnvironmentId,
  getCollections,
  getEnvironments,
  getHistory,
  getSettings,
  interpolateEnv,
  saveCollections,
  saveEnvironments,
  saveHistory,
  saveSettings,
  setActiveEnvironmentId as persistActiveEnvironmentId,
} from '@/lib/rest-client-storage';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const BODY_TYPE_OPTIONS: { label: string; value: BodyType }[] = [
  { label: 'JSON', value: 'json' },
  { label: 'Plain Text', value: 'text' },
  { label: 'XML', value: 'xml' },
  { label: 'HTML', value: 'html' },
  { label: 'form-data', value: 'form-data' },
  { label: 'x-www-form-urlencoded', value: 'urlencoded' },
  { label: 'none', value: 'none' },
];
const RAW_CONTENT_TYPES: Record<Exclude<BodyType, 'none' | 'form-data' | 'urlencoded'>, string> = {
  json: 'application/json',
  text: 'text/plain',
  xml: 'application/xml',
  html: 'text/html',
};
const EMPTY_AUTH: AuthConfig = { type: 'none' };

type SidePanel = 'collections' | 'history' | 'environments' | 'settings' | null;
type RequestResponse = HistoryEntry['response'] | { error: string };
type RequestTab = {
  id: string;
  method: string;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: string;
  bodyType: BodyType;
  auth: AuthConfig;
  response: RequestResponse | null;
  loading: boolean;
};

type SaveDialogState = {
  open: boolean;
  collectionId: string;
  newCollectionName: string;
  requestName: string;
};

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createKeyValue(): KeyValue {
  return { key: '', value: '', active: true, id: Date.now() + Math.floor(Math.random() * 1000) };
}

function createBlankTab(): RequestTab {
  return {
    id: createId(),
    method: 'GET',
    url: '',
    headers: [createKeyValue()],
    params: [createKeyValue()],
    body: '',
    bodyType: 'none',
    auth: { type: 'none' },
    response: null,
    loading: false,
  };
}

function cloneKeyValues(items: KeyValue[]): KeyValue[] {
  return items.length > 0 ? items.map((item) => ({ ...item })) : [createKeyValue()];
}

function serializeKeyValueBody(items: KeyValue[]) {
  return JSON.stringify(items);
}

function deserializeKeyValueBody(value: string): KeyValue[] {
  if (!value) {
    return [createKeyValue()];
  }

  try {
    const parsed = JSON.parse(value) as KeyValue[];
    if (!Array.isArray(parsed)) {
      return [createKeyValue()];
    }

    const normalized = parsed.map((item, index) => ({
      key: typeof item?.key === 'string' ? item.key : '',
      value: typeof item?.value === 'string' ? item.value : '',
      active: typeof item?.active === 'boolean' ? item.active : true,
      id: typeof item?.id === 'number' ? item.id : Date.now() + index,
    }));

    return normalized.length > 0 ? normalized : [createKeyValue()];
  } catch {
    return [createKeyValue()];
  }
}

function getMethodColor(method: string) {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'text-green-500';
    case 'POST':
      return 'text-blue-500';
    case 'PUT':
      return 'text-orange-500';
    case 'PATCH':
      return 'text-amber-400';
    case 'DELETE':
      return 'text-red-500';
    default:
      return 'text-gray-700 dark:text-slate-300';
  }
}

function getStatusColor(status: number) {
  if (status >= 200 && status < 300) return 'text-green-400';
  if (status >= 300 && status < 400) return 'text-blue-400';
  if (status >= 400 && status < 500) return 'text-orange-400';
  return 'text-red-400';
}

function getStatusBadgeClass(status: number) {
  if (status >= 200 && status < 300) return 'border-green-500/20 bg-green-500/10 text-green-400';
  if (status >= 300 && status < 400) return 'border-blue-500/20 bg-blue-500/10 text-blue-400';
  if (status >= 400 && status < 500) return 'border-orange-500/20 bg-orange-500/10 text-orange-400';
  return 'border-red-500/20 bg-red-500/10 text-red-400';
}

function extractHostname(rawUrl: string) {
  if (!rawUrl.trim()) {
    return 'Untitled';
  }

  try {
    const normalizedUrl = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    return new URL(normalizedUrl).hostname || 'Untitled';
  } catch {
    return rawUrl.trim() || 'Untitled';
  }
}

function buildSavedRequest(tab: RequestTab, collectionId: string, name: string): SavedRequest {
  return {
    id: createId(),
    collectionId,
    name,
    method: tab.method,
    url: tab.url,
    headers: tab.headers.map((header) => ({ ...header })),
    params: tab.params.map((param) => ({ ...param })),
    body: tab.body,
    bodyType: tab.bodyType,
    auth: JSON.parse(JSON.stringify(tab.auth)) as AuthConfig,
  };
}

function isErrorResponse(response: RequestResponse | null): response is { error: string } {
  return Boolean(response && 'error' in response);
}

function getResponsePreview(response: RequestResponse | null) {
  if (!response || isErrorResponse(response)) {
    return '';
  }

  if (typeof response.data === 'string') {
    return response.data;
  }

  return JSON.stringify(response.data, null, 2);
}

function guessBodyType(raw: string, language?: string): BodyType {
  const normalizedLanguage = language?.toLowerCase();
  if (normalizedLanguage === 'json') return 'json';
  if (normalizedLanguage === 'xml') return 'xml';
  if (normalizedLanguage === 'html') return 'html';
  if (normalizedLanguage === 'text') return 'text';

  const trimmed = raw.trim();
  if (!trimmed) return 'none';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html')) return 'html';
  if (trimmed.startsWith('<')) return 'xml';
  return 'text';
}

function KeyValueEditor({
  items,
  setItems,
  addLabel,
}: {
  items: KeyValue[];
  setItems: (items: KeyValue[]) => void;
  addLabel: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(items.length);

  useEffect(() => {
    if (items.length > prevLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLengthRef.current = items.length;
  }, [items.length]);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col overflow-hidden rounded-sm border border-gray-300 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#181818]">
      <div className="flex items-center border-b border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
        <div className="flex-1 border-r border-gray-300 dark:border-[#2a2a2a] px-4 py-2">Key</div>
        <div className="flex-1 border-r border-gray-300 dark:border-[#2a2a2a] px-4 py-2">Value</div>
        <div className="w-16 px-2 py-2 text-center">On</div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto max-h-80 xl:max-h-none">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group flex items-center border-b border-gray-300 dark:border-[#2a2a2a] last:border-0 hover:bg-gray-100 dark:hover:bg-[#1f1f1f]"
          >
            <Input
              placeholder="key"
              value={item.key}
              onChange={(event) => {
                const nextItems = [...items];
                nextItems[index] = { ...nextItems[index], key: event.target.value };
                setItems(nextItems);
              }}
              className="h-10 flex-1 rounded-none border-0 border-r border-gray-300 dark:border-[#2a2a2a] bg-transparent text-xs text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-600 focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-[#5b5bff]"
            />
            <Input
              placeholder="value"
              value={item.value}
              onChange={(event) => {
                const nextItems = [...items];
                nextItems[index] = { ...nextItems[index], value: event.target.value };
                setItems(nextItems);
              }}
              className="h-10 flex-1 rounded-none border-0 border-r border-gray-300 dark:border-[#2a2a2a] bg-transparent text-xs text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-600 focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-[#5b5bff]"
            />
            <div className="flex w-16 items-center justify-center gap-1.5 px-1">
              <input
                type="checkbox"
                checked={item.active}
                onChange={(event) => {
                  const nextItems = [...items];
                  nextItems[index] = { ...nextItems[index], active: event.target.checked };
                  setItems(nextItems);
                }}
                className="h-3.5 w-3.5 cursor-pointer rounded-sm border-gray-400 dark:border-[#444] bg-transparent text-[#5b5bff] focus:ring-[#5b5bff]"
              />
              <button
                type="button"
                onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}
                className="p-1 text-gray-400 dark:text-slate-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex bg-white dark:bg-[#141414]">
        <button
          type="button"
          onClick={() => setItems([...items, createKeyValue()])}
          className="flex h-9 w-full items-center px-4 text-[11px] text-gray-400 dark:text-slate-500 transition-colors hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-700 dark:hover:text-slate-300"
        >
          <Plus className="mr-2 h-3.5 w-3.5" /> {addLabel}
        </button>
      </div>
    </div>
  );
}

export default function RestClientPage() {
  const [tabs, setTabs] = useState<RequestTab[]>([createBlankTab()]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [sidePanel, setSidePanel] = useState<SidePanel>('collections');
  const [collections, setCollectionsState] = useState<Collection[]>([]);
  const [history, setHistoryState] = useState<HistoryEntry[]>([]);
  const [environments, setEnvironmentsState] = useState<Environment[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentIdState] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<RestClientSettings>({ timeout: 30000, sslVerification: true });
  const [collectionSearch, setCollectionSearch] = useState('');
  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});
  const [expandedEnvironments, setExpandedEnvironments] = useState<Record<string, boolean>>({});
  const [showInlineSave, setShowInlineSave] = useState(false);
  const [inlineSaveCollectionId, setInlineSaveCollectionId] = useState('');
  const [inlineSaveName, setInlineSaveName] = useState('');
  const [renamingRequestId, setRenamingRequestId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [codeSnippetOpen, setCodeSnippetOpen] = useState(false);
  const [codeSnippetLang, setCodeSnippetLang] = useState<'curl' | 'http' | 'fetch' | 'axios' | 'python' | 'go'>('curl');
  const [curlImportOpen, setCurlImportOpen] = useState(false);
  const [curlImportValue, setCurlImportValue] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [saveDialog, setSaveDialog] = useState<SaveDialogState>({
    open: false,
    collectionId: '',
    newCollectionName: '',
    requestName: '',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const sendMenuRef = useRef<HTMLDivElement | null>(null);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0], [activeTabId, tabs]);
  const activeEnvironment = useMemo(
    () => environments.find((environment) => environment.id === activeEnvironmentId) ?? null,
    [activeEnvironmentId, environments]
  );

  const syncCollections = useCallback((nextCollections: Collection[]) => {
    setCollectionsState(nextCollections);
    saveCollections(nextCollections);
  }, []);

  const syncHistory = useCallback((nextHistory: HistoryEntry[]) => {
    const limitedHistory = nextHistory
      .slice()
      .sort((firstEntry, secondEntry) => secondEntry.timestamp - firstEntry.timestamp)
      .slice(0, 100);
    setHistoryState(limitedHistory);
    saveHistory(limitedHistory);
  }, []);

  const syncEnvironments = useCallback((nextEnvironments: Environment[]) => {
    setEnvironmentsState(nextEnvironments);
    saveEnvironments(nextEnvironments);
  }, []);

  useEffect(() => {
    const storedCollections = getCollections();
    const storedHistory = getHistory();
    const storedEnvironments = getEnvironments();
    const storedActiveEnvironmentId = getActiveEnvironmentId();
    const storedSettings = getSettings();

    setCollectionsState(storedCollections);
    setHistoryState(storedHistory);
    setEnvironmentsState(storedEnvironments);
    setActiveEnvironmentIdState(storedActiveEnvironmentId);
    setSettingsDraft(storedSettings);
    setInlineSaveCollectionId(storedCollections[0]?.id ?? '');
    setExpandedCollections(Object.fromEntries(storedCollections.map((collection) => [collection.id, true])));
    setExpandedEnvironments(Object.fromEntries(storedEnvironments.map((environment) => [environment.id, true])));
  }, []);

  useEffect(() => {
    if (!sendMenuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!sendMenuRef.current?.contains(event.target as Node)) {
        setSendMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sendMenuOpen]);

  useEffect(() => {
    if (commandPaletteOpen) {
      window.setTimeout(() => commandInputRef.current?.focus(), 0);
    }
  }, [commandPaletteOpen]);

  const updateTab = useCallback((tabId: string, updater: (tab: RequestTab) => RequestTab) => {
    setTabs((currentTabs) => currentTabs.map((tab) => (tab.id === tabId ? updater(tab) : tab)));
  }, []);

  const applyTabRequest = useCallback(
    (request: Omit<RequestTab, 'id' | 'loading' | 'response'> & { response?: RequestResponse | null }) => {
      updateTab(activeTabId, (tab) => ({
        ...tab,
        method: request.method,
        url: request.url,
        headers: cloneKeyValues(request.headers),
        params: cloneKeyValues(request.params),
        body: request.body,
        bodyType: request.bodyType,
        auth: JSON.parse(JSON.stringify(request.auth)) as AuthConfig,
        response: request.response ?? null,
        loading: false,
      }));
    },
    [activeTabId, updateTab]
  );

  const addTab = useCallback(() => {
    const nextTab = createBlankTab();
    setTabs((currentTabs) => [...currentTabs, nextTab]);
    setActiveTabId(nextTab.id);
  }, []);

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabs.length === 1) {
        const blankTab = createBlankTab();
        setTabs([blankTab]);
        setActiveTabId(blankTab.id);
        return;
      }

      const currentIndex = tabs.findIndex((tab) => tab.id === tabId);
      const nextTabs = tabs.filter((tab) => tab.id !== tabId);
      setTabs(nextTabs);

      if (activeTabId === tabId) {
        const fallbackTab = nextTabs[Math.max(0, currentIndex - 1)] ?? nextTabs[0];
        setActiveTabId(fallbackTab.id);
      }
    },
    [activeTabId, tabs]
  );

  const setActiveEnvironment = useCallback((environmentId: string | null) => {
    setActiveEnvironmentIdState(environmentId);
    persistActiveEnvironmentId(environmentId);
  }, []);

  const saveRequestToCollection = useCallback(
    ({
      collectionId,
      requestName,
      newCollectionName,
    }: {
      collectionId: string;
      requestName: string;
      newCollectionName?: string;
    }) => {
      if (!activeTab) {
        return false;
      }

      const trimmedRequestName = requestName.trim() || extractHostname(activeTab.url);
      let targetCollectionId = collectionId;
      let nextCollections = [...collections];

      if (collectionId === '__new__') {
        const trimmedCollectionName = (newCollectionName ?? '').trim();
        if (!trimmedCollectionName) {
          toast('Enter a collection name');
          return false;
        }

        const createdCollection: Collection = {
          id: createId(),
          name: trimmedCollectionName,
          createdAt: Date.now(),
          requests: [],
        };

        nextCollections = [createdCollection, ...nextCollections];
        targetCollectionId = createdCollection.id;
        setExpandedCollections((current) => ({ ...current, [createdCollection.id]: true }));
      }

      if (!targetCollectionId) {
        toast('Select a collection');
        return false;
      }

      const savedRequest = buildSavedRequest(activeTab, targetCollectionId, trimmedRequestName);
      const updatedCollections = nextCollections.map((collection) =>
        collection.id === targetCollectionId
          ? { ...collection, requests: [savedRequest, ...collection.requests] }
          : collection
      );

      syncCollections(updatedCollections);
      setInlineSaveCollectionId(targetCollectionId);
      toast('Request saved');
      return true;
    },
    [activeTab, collections, syncCollections]
  );

  const loadSavedRequest = useCallback(
    (savedRequest: SavedRequest) => {
      applyTabRequest({
        ...savedRequest,
        response: null,
      });
      toast('Request loaded');
    },
    [applyTabRequest]
  );

  const loadHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      applyTabRequest({
        ...entry.request,
        response: entry.response,
      });
      toast('History restored');
    },
    [applyTabRequest]
  );

  const handleBodyTypeChange = useCallback(
    (tabId: string, nextBodyType: BodyType) => {
      updateTab(tabId, (tab) => {
        const nextHeaders = [...tab.headers];
        const contentTypeIndex = nextHeaders.findIndex((header) => header.key.toLowerCase() === 'content-type');

        if (nextBodyType === 'json' || nextBodyType === 'text' || nextBodyType === 'xml' || nextBodyType === 'html') {
          const contentTypeValue = RAW_CONTENT_TYPES[nextBodyType];
          if (contentTypeIndex >= 0) {
            nextHeaders[contentTypeIndex] = { ...nextHeaders[contentTypeIndex], value: contentTypeValue, active: true };
          } else {
            nextHeaders.unshift({ key: 'Content-Type', value: contentTypeValue, active: true, id: Date.now() });
          }
        } else if (
          contentTypeIndex >= 0 &&
          Object.values(RAW_CONTENT_TYPES).includes(
            nextHeaders[contentTypeIndex].value as (typeof RAW_CONTENT_TYPES)[keyof typeof RAW_CONTENT_TYPES]
          )
        ) {
          nextHeaders.splice(contentTypeIndex, 1);
        }

        let nextBody = tab.body;
        if ((nextBodyType === 'form-data' || nextBodyType === 'urlencoded') && !nextBody) {
          nextBody = serializeKeyValueBody([createKeyValue()]);
        }
        if (nextBodyType === 'none') {
          nextBody = '';
        }

        return {
          ...tab,
          bodyType: nextBodyType,
          body: nextBody,
          headers: nextHeaders.length > 0 ? nextHeaders : [createKeyValue()],
        };
      });
    },
    [updateTab]
  );

  const handleSend = useCallback(
    async (saveAfterSend = false) => {
      if (!activeTab?.url.trim()) {
        toast('Please enter a URL');
        return;
      }

      const tabId = activeTab.id;
      updateTab(tabId, (tab) => ({ ...tab, loading: true, response: null }));
      setSendMenuOpen(false);

      try {
        const hasProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(activeTab.url);
        if (!hasProtocol) {
          throw new Error('Please include http:// or https:// in the URL');
        }

        const urlObject = new URL(interpolateEnv(activeTab.url, activeEnvironment));

        activeTab.params
          .filter((param) => param.active && param.key.trim())
          .forEach((param) => {
            urlObject.searchParams.set(
              interpolateEnv(param.key, activeEnvironment),
              interpolateEnv(param.value, activeEnvironment)
            );
          });

        const headers = activeTab.headers
          .filter((header) => header.active && header.key.trim())
          .reduce<Record<string, string>>((result, header) => {
            result[interpolateEnv(header.key, activeEnvironment)] = interpolateEnv(header.value, activeEnvironment);
            return result;
          }, {});

        const auth = activeTab.auth;
        if (auth.type === 'bearer' && auth.token.trim()) {
          headers.Authorization = `Bearer ${interpolateEnv(auth.token, activeEnvironment)}`;
        }
        if (auth.type === 'basic') {
          const username = interpolateEnv(auth.username, activeEnvironment);
          const password = interpolateEnv(auth.password, activeEnvironment);
          headers.Authorization = `Basic ${btoa(`${username}:${password}`)}`;
        }
        if (auth.type === 'apikey' && auth.key.trim()) {
          const interpolatedKey = interpolateEnv(auth.key, activeEnvironment);
          const interpolatedValue = interpolateEnv(auth.value, activeEnvironment);
          if (auth.addTo === 'header') {
            headers[interpolatedKey] = interpolatedValue;
          } else {
            urlObject.searchParams.set(interpolatedKey, interpolatedValue);
          }
        }

        let requestBody: unknown;
        if (!['GET', 'HEAD'].includes(activeTab.method.toUpperCase()) && activeTab.bodyType !== 'none') {
          if (activeTab.bodyType === 'form-data' || activeTab.bodyType === 'urlencoded') {
            const entries = deserializeKeyValueBody(activeTab.body)
              .filter((item) => item.active && item.key.trim())
              .map(
                (item) =>
                  [interpolateEnv(item.key, activeEnvironment), interpolateEnv(item.value, activeEnvironment)] as [
                    string,
                    string,
                  ]
              );

            requestBody = { type: activeTab.bodyType, entries };
          } else {
            requestBody = interpolateEnv(activeTab.body, activeEnvironment);
          }
        }

        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: urlObject.toString(),
            method: activeTab.method,
            headers,
            body: requestBody,
            timeout: settingsDraft.timeout,
            sslVerification: settingsDraft.sslVerification,
          }),
        });

        const data = (await response.json()) as RequestResponse;

        if ('error' in data) {
          throw new Error(data.error);
        }

        updateTab(tabId, (tab) => ({ ...tab, response: data, loading: false }));

        const historyEntry: HistoryEntry = {
          id: createId(),
          timestamp: Date.now(),
          method: activeTab.method,
          url: urlObject.toString(),
          status: data.status,
          time: data.time,
          size: data.size,
          request: {
            method: activeTab.method,
            url: activeTab.url,
            headers: activeTab.headers.map((header) => ({ ...header })),
            params: activeTab.params.map((param) => ({ ...param })),
            body: activeTab.body,
            bodyType: activeTab.bodyType,
            auth: JSON.parse(JSON.stringify(activeTab.auth)) as AuthConfig,
          },
          response: data,
        };

        syncHistory([historyEntry, ...history]);

        if (saveAfterSend) {
          setSaveDialog({
            open: true,
            collectionId: collections[0]?.id ?? '__new__',
            newCollectionName: '',
            requestName: extractHostname(activeTab.url),
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to execute request';
        updateTab(tabId, (tab) => ({ ...tab, response: { error: errorMessage }, loading: false }));
      }
    },
    [activeEnvironment, activeTab, collections, history, syncHistory, updateTab]
  );

  const createCollection = useCallback(() => {
    const trimmedName = newCollectionName.trim();
    if (!trimmedName) {
      return;
    }

    const collection: Collection = {
      id: createId(),
      name: trimmedName,
      createdAt: Date.now(),
      requests: [],
    };

    syncCollections([collection, ...collections]);
    setExpandedCollections((current) => ({ ...current, [collection.id]: true }));
    setInlineSaveCollectionId(collection.id);
    setShowNewCollectionInput(false);
    setNewCollectionName('');
    toast('Collection created');
  }, [collections, newCollectionName, syncCollections]);

  const deleteSavedRequest = useCallback(
    (collectionId: string, requestId: string) => {
      syncCollections(
        collections.map((collection) =>
          collection.id === collectionId
            ? { ...collection, requests: collection.requests.filter((request) => request.id !== requestId) }
            : collection
        )
      );
    },
    [collections, syncCollections]
  );

  const commitRename = useCallback(
    (collectionId: string, requestId: string, name: string) => {
      const trimmed = name.trim();
      if (trimmed) {
        syncCollections(
          collections.map((collection) =>
            collection.id === collectionId
              ? {
                  ...collection,
                  requests: collection.requests.map((r) => (r.id === requestId ? { ...r, name: trimmed } : r)),
                }
              : collection
          )
        );
      }
      setRenamingRequestId(null);
    },
    [collections, syncCollections]
  );

  const importPostmanCollection = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        const parsed = JSON.parse(await file.text()) as {
          info?: { name?: string; _postman_id?: string };
          item?: unknown[];
        };

        if (!parsed.info?._postman_id || !Array.isArray(parsed.item)) {
          throw new Error('Unsupported Postman collection');
        }

        const nextCollectionId = collections.some((collection) => collection.id === parsed.info!._postman_id)
          ? createId()
          : parsed.info._postman_id;

        const parseItems = (items: unknown[]): SavedRequest[] => {
          return items.flatMap((item) => {
            const typedItem = item as {
              name?: string;
              item?: unknown[];
              request?: {
                method?: string;
                url?: string | { raw?: string; query?: Array<{ key?: string; value?: string; disabled?: boolean }> };
                header?: Array<{ key?: string; value?: string; disabled?: boolean }>;
                body?: {
                  mode?: string;
                  raw?: string;
                  options?: { raw?: { language?: string } };
                  formdata?: Array<{ key?: string; value?: string; disabled?: boolean }>;
                  urlencoded?: Array<{ key?: string; value?: string; disabled?: boolean }>;
                };
              };
            };

            if (Array.isArray(typedItem.item) && !typedItem.request) {
              return parseItems(typedItem.item);
            }

            if (!typedItem.request) {
              return [];
            }

            const request = typedItem.request;
            let body = '';
            let bodyType: BodyType = 'none';

            if (request.body?.mode === 'raw') {
              body = request.body.raw ?? '';
              bodyType = guessBodyType(body, request.body.options?.raw?.language);
            }
            if (request.body?.mode === 'formdata') {
              bodyType = 'form-data';
              body = serializeKeyValueBody(
                (request.body.formdata ?? []).map((entry, index) => ({
                  key: entry.key ?? '',
                  value: entry.value ?? '',
                  active: !entry.disabled,
                  id: Date.now() + index,
                }))
              );
            }
            if (request.body?.mode === 'urlencoded') {
              bodyType = 'urlencoded';
              body = serializeKeyValueBody(
                (request.body.urlencoded ?? []).map((entry, index) => ({
                  key: entry.key ?? '',
                  value: entry.value ?? '',
                  active: !entry.disabled,
                  id: Date.now() + index,
                }))
              );
            }

            const rawUrl = typeof request.url === 'string' ? request.url : (request.url?.raw ?? '');

            return [
              {
                id: createId(),
                collectionId: nextCollectionId,
                name: typedItem.name || extractHostname(rawUrl),
                method: request.method ?? 'GET',
                url: rawUrl,
                headers: request.header?.map((header, index) => ({
                  key: header.key ?? '',
                  value: header.value ?? '',
                  active: !header.disabled,
                  id: Date.now() + index,
                })) ?? [createKeyValue()],
                params: (typeof request.url === 'string' ? [] : (request.url?.query ?? [])).map((param, index) => ({
                  key: param.key ?? '',
                  value: param.value ?? '',
                  active: !param.disabled,
                  id: Date.now() + index + 100,
                })) || [createKeyValue()],
                body,
                bodyType,
                auth: { type: 'none' } as AuthConfig,
              },
            ];
          });
        };

        const importedCollection: Collection = {
          id: nextCollectionId,
          name: parsed.info.name || 'Imported Postman Collection',
          createdAt: Date.now(),
          requests: parseItems(parsed.item),
        };

        syncCollections([importedCollection, ...collections]);
        setExpandedCollections((current) => ({ ...current, [importedCollection.id]: true }));
        setInlineSaveCollectionId(importedCollection.id);
        toast('Collection imported');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to import collection');
      } finally {
        event.target.value = '';
      }
    },
    [collections, syncCollections]
  );

  const exportCollection = useCallback((collection: Collection) => {
    const postman = {
      info: {
        name: collection.name,
        _postman_id: collection.id,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: collection.requests.map((r) => ({
        name: r.name,
        request: {
          method: r.method,
          header: r.headers.filter((h) => h.key).map((h) => ({ key: h.key, value: h.value })),
          url: { raw: r.url },
          body: r.body ? { mode: 'raw', raw: r.body } : undefined,
        },
      })),
    };
    const blob = new Blob([JSON.stringify(postman, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name.replace(/[^a-z0-9]/gi, '_')}.postman_collection.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportAllCollections = useCallback(() => {
    const data = { collections };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rest-client-collections.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [collections]);

  const generateCodeSnippet = useCallback(
    (lang: 'curl' | 'http' | 'fetch' | 'axios' | 'python' | 'go') => {
      if (!activeTab) return '';
      const { method, url, headers, params, body, bodyType, auth } = activeTab;
      const allHeaders = headers.filter((h) => h.key && h.active !== false);

      // Build the full URL with active query params from the params tab (mirrors handleSend logic)
      const activeParams = params.filter((p) => p.active && p.key.trim());
      const fullUrl = (() => {
        if (activeParams.length === 0) return url;
        try {
          const urlObj = new URL(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(url) ? url : `https://${url}`);
          activeParams.forEach((p) => urlObj.searchParams.set(p.key, p.value));
          return urlObj.toString();
        } catch {
          const sep = url.includes('?') ? '&' : '?';
          return (
            url + sep + activeParams.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
          );
        }
      })();

      // Merge auth into headers for snippet generation
      const authHeader: { key: string; value: string } | null = (() => {
        if (auth.type === 'bearer') return { key: 'Authorization', value: `Bearer ${auth.token}` };
        if (auth.type === 'basic')
          return { key: 'Authorization', value: `Basic ${btoa(`${auth.username}:${auth.password}`)}` };
        if (auth.type === 'apikey' && auth.addTo === 'header') return { key: auth.key, value: auth.value };
        return null;
      })();
      const allH = authHeader ? [...allHeaders, authHeader] : allHeaders;
      const hasBody = !['GET', 'HEAD'].includes(method.toUpperCase()) && bodyType !== 'none' && body;
      if (hasBody && bodyType === 'json' && !allH.some((h) => h.key.toLowerCase() === 'content-type')) {
        allH.push({ key: 'Content-Type', value: 'application/json' });
      }

      const headerLines = (indent: string, fmt: (k: string, v: string) => string, sep = '\n') =>
        allH.map((h) => `${indent}${fmt(h.key, h.value)}`).join(sep);

      if (lang === 'curl') {
        // Wrap in bash single quotes; embed literal ' using the '\'' idiom
        const bsq = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;
        const parts = [`curl -X ${method.toUpperCase()} ${bsq(fullUrl)}`];
        allH.forEach((h) => parts.push(`  -H ${bsq(`${h.key}: ${h.value}`)}`));
        if (hasBody) parts.push(`  --data-raw ${bsq(body)}`);
        return parts.join(' \\\n');
      }

      if (lang === 'http') {
        const u = (() => {
          try {
            const p = new URL(fullUrl);
            return `${p.pathname}${p.search}`;
          } catch {
            return fullUrl;
          }
        })();
        const host = (() => {
          try {
            return new URL(fullUrl).host;
          } catch {
            return '';
          }
        })();
        const headersStr = headerLines('', (k, v) => `${k}: ${v}`);
        const hostLine = host && !allH.some((h) => h.key.toLowerCase() === 'host') ? `Host: ${host}\n` : '';
        return `${method.toUpperCase()} ${u} HTTP/1.1\n${hostLine}${headersStr}${hasBody ? `\n\n${body}` : ''}`;
      }

      if (lang === 'fetch') {
        const headerObj = allH.length ? `{\n${headerLines('      ', (k, v) => `'${k}': '${v}'`, ',\n')}\n    }` : '{}';
        // Escape backticks and template-literal special chars so the snippet is valid JS
        const safeBody = hasBody ? body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$') : '';
        return `const response = await fetch('${fullUrl}', {\n  method: '${method.toUpperCase()}',\n  headers: ${headerObj},${hasBody ? `\n  body: \`${safeBody}\`,` : ''}\n});\nconst data = await response.json();\nconsole.log(data);`;
      }

      if (lang === 'axios') {
        const headerObj = allH.length ? `{\n${headerLines('    ', (k, v) => `'${k}': '${v}'`, ',\n')}\n  }` : '{}';
        const safeBody = hasBody ? body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$') : '';
        return `import axios from 'axios';\n\nconst response = await axios({\n  method: '${method.toLowerCase()}',\n  url: '${fullUrl}',\n  headers: ${headerObj},${hasBody ? `\n  data: \`${safeBody}\`,` : ''}\n});\nconsole.log(response.data);`;
      }

      if (lang === 'python') {
        const headerDict = allH.length ? `{\n${headerLines('    ', (k, v) => `"${k}": "${v}"`, ',\n')}\n}` : '{}';
        return `import requests\n\nheaders = ${headerDict}\n\nresponse = requests.${method.toLowerCase()}(\n    "${fullUrl}",\n    headers=headers,${hasBody ? `\n    data="""${body}""",` : ''}\n)\nprint(response.json())`;
      }

      if (lang === 'go') {
        const goHeaders = allH.map((h) => `\treq.Header.Set("${h.key}", "${h.value}")`).join('\n');
        return `package main\n\nimport (\n\t"fmt"\n\t"net/http"${hasBody ? '\n\t"strings"' : ''}\n)\n\nfunc main() {\n\t${hasBody ? `body := strings.NewReader(\`${body}\`)\n\treq, _ := http.NewRequest("${method.toUpperCase()}", "${fullUrl}", body)` : `req, _ := http.NewRequest("${method.toUpperCase()}", "${fullUrl}", nil)`}\n${goHeaders ? goHeaders + '\n' : ''}\n\tclient := &http.Client{}\n\tresp, _ := client.Do(req)\n\tdefer resp.Body.Close()\n\tfmt.Println(resp.Status)\n}`;
      }

      return '';
    },
    [activeTab]
  );

  const parseCurlIntoTab = useCallback(() => {
    const raw = curlImportValue.trim();
    if (!raw) return;
    try {
      // Normalize line continuations: bash (\<newline>) and Windows CMD (^<newline>), both CRLF and LF
      // Also decode %27/%22 used as shell close-quotes by some browser devtools (only when followed
      // by whitespace, so mid-value encoded characters like %27%20 are left untouched).
      const normalized = raw
        .replace(/\\\r?\n/g, ' ')
        .replace(/\^\r?\n/g, ' ')
        .replace(/%27(?=\s|$)/gi, "'")
        .replace(/%22(?=\s|$)/gi, '"');

      // Tokenize respecting single-quoted (bash) and double-quoted (bash/cmd) strings
      const tokens: string[] = [];
      let current = '';
      let i = 0;
      while (i < normalized.length) {
        const ch = normalized[i];
        if (ch === '"') {
          // Double-quoted string: \" is an escaped quote inside
          i++;
          while (i < normalized.length && normalized[i] !== '"') {
            if (normalized[i] === '\\') {
              i++;
              current += normalized[i] ?? '';
            } else {
              current += normalized[i];
            }
            i++;
          }
          i++; // closing quote
        } else if (ch === "'") {
          // Single-quoted string (bash): no escape processing
          i++;
          while (i < normalized.length && normalized[i] !== "'") {
            current += normalized[i];
            i++;
          }
          i++; // closing quote
        } else if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
          if (current) {
            tokens.push(current);
            current = '';
          }
          i++;
        } else {
          current += ch;
          i++;
        }
      }
      if (current) tokens.push(current);

      if (tokens[0]?.toLowerCase() !== 'curl') {
        toast('Input does not look like a cURL command');
        return;
      }

      let method = 'GET';
      let methodExplicit = false;
      let url = '';
      const headers: { key: string; value: string }[] = [];
      let body = '';
      let basicAuth: { username: string; password: string } | null = null;

      // Flags that consume the next token as a value but whose value we discard.
      // This prevents stray numeric/string arguments from being mistaken for the URL.
      const DISCARD_VALUE_FLAGS = new Set([
        '-o',
        '--output',
        '-e',
        '--referer',
        '-A',
        '--user-agent',
        '--max-time',
        '--connect-timeout',
        '--retry',
        '--retry-delay',
        '--retry-max-time',
        '--proxy',
        '-x',
        '--dns-servers',
        '--resolve',
        '--cert',
        '--key',
        '--cacert',
        '--capath',
        '--limit-rate',
        '--interface',
        '--unix-socket',
        '--abstract-unix-socket',
      ]);

      let idx = 1;
      while (idx < tokens.length) {
        let token = tokens[idx];

        // Handle long flags with = syntax: --request=POST, --header=Content-Type: ...
        let embeddedValue: string | undefined;
        if (token.startsWith('--') && token.includes('=')) {
          const eqIdx = token.indexOf('=');
          embeddedValue = token.slice(eqIdx + 1);
          token = token.slice(0, eqIdx);
        }

        // Returns the flag's value: embedded (--flag=val) or the next token
        const getValue = (): string => {
          if (embeddedValue !== undefined) return embeddedValue;
          return tokens[++idx] ?? '';
        };

        if (token === '-X' || token === '--request') {
          method = getValue().toUpperCase() || 'GET';
          methodExplicit = true;
        } else if (/^-X([A-Za-z]+)$/.test(token)) {
          // Combined short flag: -XPOST, -XPUT, -XDELETE, etc.
          method = token.slice(2).toUpperCase();
          methodExplicit = true;
        } else if (token === '-H' || token === '--header') {
          const headerRaw = getValue();
          const colon = headerRaw.indexOf(':');
          if (colon !== -1) {
            headers.push({ key: headerRaw.slice(0, colon).trim(), value: headerRaw.slice(colon + 1).trim() });
          }
        } else if (
          token === '-d' ||
          token === '--data' ||
          token === '--data-raw' ||
          token === '--data-binary' ||
          token === '--data-ascii'
        ) {
          body = getValue();
          if (!methodExplicit && method === 'GET') method = 'POST';
        } else if (token === '--data-urlencode') {
          const val = getValue();
          body = body ? body + '&' + val : val;
          if (!methodExplicit && method === 'GET') method = 'POST';
        } else if (token === '-u' || token === '--user') {
          const userRaw = getValue();
          const colon = userRaw.indexOf(':');
          basicAuth =
            colon !== -1
              ? { username: userRaw.slice(0, colon), password: userRaw.slice(colon + 1) }
              : { username: userRaw, password: '' };
        } else if (token === '-b' || token === '--cookie') {
          const cookieVal = getValue();
          // Add as Cookie header (merge if one already exists)
          const existing = headers.find((h) => h.key.toLowerCase() === 'cookie');
          if (existing) {
            existing.value += '; ' + cookieVal;
          } else {
            headers.push({ key: 'Cookie', value: cookieVal });
          }
        } else if (token === '-c' || token === '--cookie-jar') {
          getValue(); // consume path value, don't use it
        } else if (token === '--url') {
          url = getValue();
        } else if (DISCARD_VALUE_FLAGS.has(token)) {
          getValue(); // consume but discard so its value isn't mistaken for the URL
        } else if (!token.startsWith('-')) {
          url = token; // positional argument — the URL
        }
        // All other flag-like tokens are silently ignored (--compressed, -L, -k, etc.)

        idx++;
      }

      if (!url) {
        toast('No URL found in cURL command');
        return;
      }

      // Extract query params from URL into the params tab
      let cleanUrl = url;
      const kvParams: KeyValue[] = [];
      try {
        const urlForParsing = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(url) ? url : `https://${url}`;
        const urlObj = new URL(urlForParsing);
        if (urlObj.search) {
          cleanUrl = url.split('?')[0];
          urlObj.searchParams.forEach((value, key) => {
            kvParams.push({ key, value, active: true, id: Date.now() + Math.floor(Math.random() * 10000) });
          });
        }
      } catch {
        // keep URL as-is if parsing fails
      }

      // Build header KeyValue arrays
      const kvHeaders: KeyValue[] = headers.map((h) => ({
        key: h.key,
        value: h.value,
        active: true,
        id: Date.now() + Math.floor(Math.random() * 10000),
      }));
      if (kvHeaders.length === 0) kvHeaders.push(createKeyValue());
      if (kvParams.length === 0) kvParams.push(createKeyValue());

      // Detect body type from Content-Type header, falling back to content inspection
      const contentType = headers.find((h) => h.key.toLowerCase() === 'content-type')?.value ?? '';
      let bodyType: BodyType = 'none';
      if (body) {
        if (contentType.includes('application/json')) bodyType = 'json';
        else if (contentType.includes('application/x-www-form-urlencoded')) bodyType = 'urlencoded';
        else if (contentType.includes('application/xml') || contentType.includes('text/xml')) bodyType = 'xml';
        else if (contentType.includes('text/html')) bodyType = 'html';
        else bodyType = guessBodyType(body);
      }

      // Promote Authorization header to auth config when recognized
      const authHeaderIdx = headers.findIndex((h) => h.key.toLowerCase() === 'authorization');
      let auth: AuthConfig = { type: 'none' };
      if (authHeaderIdx !== -1) {
        const val = headers[authHeaderIdx].value;
        if (val.toLowerCase().startsWith('bearer ')) {
          auth = { type: 'bearer', token: val.slice(7) };
          kvHeaders.splice(
            kvHeaders.findIndex((h) => h.key.toLowerCase() === 'authorization'),
            1
          );
          if (kvHeaders.length === 0) kvHeaders.push(createKeyValue());
        } else if (val.toLowerCase().startsWith('basic ')) {
          try {
            const decoded = atob(val.slice(6));
            const c = decoded.indexOf(':');
            auth = { type: 'basic', username: decoded.slice(0, c), password: decoded.slice(c + 1) };
            kvHeaders.splice(
              kvHeaders.findIndex((h) => h.key.toLowerCase() === 'authorization'),
              1
            );
            if (kvHeaders.length === 0) kvHeaders.push(createKeyValue());
          } catch {
            /* keep raw header if decoding fails */
          }
        }
      } else if (basicAuth) {
        auth = { type: 'basic', ...basicAuth };
      }

      updateTab(activeTabId, (tab) => ({
        ...tab,
        method: method.toUpperCase(),
        url: cleanUrl,
        headers: kvHeaders,
        params: kvParams,
        body,
        bodyType,
        auth,
      }));
      setCurlImportOpen(false);
      setCurlImportValue('');
      toast('Request imported from cURL');
    } catch {
      toast('Failed to parse cURL command');
    }
  }, [curlImportValue, activeTabId, updateTab]);

  const addEnvironment = useCallback(() => {
    const environment: Environment = {
      id: createId(),
      name: `Environment ${environments.length + 1}`,
      variables: [createKeyValue()],
    };

    syncEnvironments([environment, ...environments]);
    setExpandedEnvironments((current) => ({ ...current, [environment.id]: true }));
    if (!activeEnvironmentId) {
      setActiveEnvironment(environment.id);
    }
  }, [activeEnvironmentId, environments, setActiveEnvironment, syncEnvironments]);

  const updateEnvironment = useCallback(
    (environmentId: string, updater: (environment: Environment) => Environment) => {
      syncEnvironments(
        environments.map((environment) => (environment.id === environmentId ? updater(environment) : environment))
      );
    },
    [environments, syncEnvironments]
  );

  const deleteEnvironment = useCallback(
    (environmentId: string) => {
      const nextEnvironments = environments.filter((environment) => environment.id !== environmentId);
      syncEnvironments(nextEnvironments);
      if (activeEnvironmentId === environmentId) {
        setActiveEnvironment(nextEnvironments[0]?.id ?? null);
      }
    },
    [activeEnvironmentId, environments, setActiveEnvironment, syncEnvironments]
  );

  const clearHistory = useCallback(() => {
    syncHistory([]);
    toast('History cleared');
  }, [syncHistory]);

  useEffect(() => {
    function isTextInput(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tagName = target.tagName.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey && event.key === 'Enter') {
        event.preventDefault();
        void handleSend(false);
        return;
      }

      if (event.metaKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (event.metaKey && event.key === '/') {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTextInput(event.target)) {
        event.preventDefault();
        setHelpOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSend]);

  const commandResults = useMemo(() => {
    const normalizedSearch = commandSearch.trim().toLowerCase();
    const savedRequests = collections.flatMap((collection) =>
      collection.requests.map((request) => ({
        id: `request-${request.id}`,
        type: 'request' as const,
        title: request.name,
        subtitle: `${request.method} ${request.url}`,
        meta: collection.name,
        request,
      }))
    );
    const historyResults = history.map((entry) => ({
      id: `history-${entry.id}`,
      type: 'history' as const,
      title: entry.url,
      subtitle: `${entry.method} • ${entry.status} • ${entry.time}ms`,
      meta: new Date(entry.timestamp).toLocaleString(),
      entry,
    }));

    const matchesSearch = (value: string) => value.toLowerCase().includes(normalizedSearch);

    return {
      savedRequests: savedRequests.filter(
        (item) =>
          !normalizedSearch || matchesSearch(item.title) || matchesSearch(item.subtitle) || matchesSearch(item.meta)
      ),
      history: historyResults.filter(
        (item) =>
          !normalizedSearch || matchesSearch(item.title) || matchesSearch(item.subtitle) || matchesSearch(item.meta)
      ),
    };
  }, [collections, commandSearch, history]);

  const filteredCollections = useMemo(() => {
    const normalizedSearch = collectionSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return collections;
    }

    return collections
      .map((collection) => {
        const collectionMatches = collection.name.toLowerCase().includes(normalizedSearch);
        const requests = collectionMatches
          ? collection.requests
          : collection.requests.filter(
              (request) =>
                request.name.toLowerCase().includes(normalizedSearch) ||
                request.url.toLowerCase().includes(normalizedSearch)
            );
        return { ...collection, requests };
      })
      .filter(
        (collection) => collection.requests.length > 0 || collection.name.toLowerCase().includes(normalizedSearch)
      );
  }, [collectionSearch, collections]);

  const successfulResponse = activeTab?.response && !isErrorResponse(activeTab.response) ? activeTab.response : null;
  const responsePreview = getResponsePreview(activeTab?.response ?? null);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-50 dark:bg-[#111111] font-sans text-gray-700 dark:text-slate-300 selection:bg-[#5b5bff]/30">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 dark:border-[#222222] bg-white dark:bg-[#141414] px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Code className="h-5 w-5 text-[#5b5bff]" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-800 dark:text-slate-200">
              REST Client
            </span>
          </Link>
          <div className="hidden items-center gap-4 text-xs font-semibold text-gray-500 dark:text-slate-400 md:flex">
            <span className="text-gray-900 dark:text-white">API</span>
            <span className="cursor-pointer hover:text-gray-900 dark:hover:text-white">Environments</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="mx-4 hidden h-8 max-w-md flex-1 items-center overflow-hidden rounded border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] px-3 text-gray-500 dark:text-slate-400 transition-colors hover:border-gray-400 dark:hover:border-[#444] hover:text-gray-700 dark:hover:text-slate-300 sm:flex"
        >
          <Search className="mr-2 h-3.5 w-3.5 opacity-70" />
          <span className="text-xs">Search and commands</span>
          <span className="ml-auto rounded border border-gray-300 dark:border-[#333] bg-gray-200 dark:bg-[#222] px-1.5 py-0.5 font-mono text-[10px] opacity-70">
            ⌘ K
          </span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setSaveDialog({
                open: true,
                collectionId: collections[0]?.id ?? '__new__',
                newCollectionName: '',
                requestName: extractHostname(activeTab?.url ?? ''),
              })
            }
            className="hidden h-8 items-center gap-2 rounded border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] px-3 text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-200 dark:hover:bg-[#252525] sm:flex"
          >
            <Code className="h-3.5 w-3.5" /> Save to Workspace
          </button>
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-100 dark:hover:bg-[#252525]"
            title="Back to home"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="z-20 flex w-14 shrink-0 flex-col items-center gap-4 border-r border-gray-200 dark:border-[#222222] bg-white dark:bg-[#141414] py-4 shadow-xl">
          {[
            { key: 'environments', icon: Globe },
            { key: 'collections', icon: Folder },
            { key: 'history', icon: Clock },
          ].map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSidePanel((current) => (current === key ? null : (key as SidePanel)))}
              className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
                sidePanel === key
                  ? 'bg-gray-200 dark:bg-[#252525] text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-[#222] hover:text-gray-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}

          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSidePanel((current) => (current === 'settings' ? null : 'settings'))}
              className={`flex h-10 w-10 items-center justify-center rounded transition-colors ${
                sidePanel === 'settings'
                  ? 'bg-gray-200 dark:bg-[#252525] text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-[#222] hover:text-gray-900 dark:hover:text-slate-100'
              }`}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {sidePanel && (
          <div className="hidden w-64 shrink-0 flex-col border-r border-gray-200 dark:border-[#222222] bg-white dark:bg-[#141414] md:flex">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 dark:border-[#222222] px-4">
              <div className="flex items-center text-xs font-medium text-gray-500 dark:text-slate-400">
                Workspace <span className="mx-2 opacity-50">&gt;</span>
                <span className="text-gray-800 dark:text-slate-200 capitalize">{sidePanel}</span>
              </div>
            </div>

            {sidePanel === 'collections' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-3 border-b border-gray-200 dark:border-[#222222] px-4 py-3">
                  <Input
                    value={collectionSearch}
                    onChange={(event) => setCollectionSearch(event.target.value)}
                    placeholder="Search collections"
                    className="h-8 border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-xs text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-600 focus-visible:ring-[#5b5bff]"
                  />
                  {showNewCollectionInput ? (
                    <Input
                      value={newCollectionName}
                      onChange={(event) => setNewCollectionName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          createCollection();
                        }
                      }}
                      onBlur={() => {
                        if (!newCollectionName.trim()) {
                          setShowNewCollectionInput(false);
                        }
                      }}
                      placeholder="Collection name"
                      className="h-8 border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-xs text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-600 focus-visible:ring-[#5b5bff]"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewCollectionInput(true)}
                      className="flex items-center text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors hover:text-gray-900 dark:hover:text-white"
                    >
                      <Plus className="mr-2 h-3.5 w-3.5" /> New
                    </button>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {filteredCollections.length === 0 ? (
                    <div className="mt-10 flex flex-col items-center justify-center p-4 text-center">
                      <Package className="mb-4 h-12 w-12 text-gray-300 dark:text-[#2a2a2a]" />
                      <p className="mb-6 text-[11px] text-gray-400 dark:text-slate-500">
                        Collections are empty
                        <br />
                        Import or create a collection
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredCollections.map((collection) => (
                        <div
                          key={collection.id}
                          className="rounded border border-gray-200 dark:border-[#222222] bg-gray-50 dark:bg-[#171717]"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedCollections((current) => ({
                                ...current,
                                [collection.id]: !current[collection.id],
                              }))
                            }
                            className="group/col flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 dark:text-slate-300"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${
                                expandedCollections[collection.id] ? 'rotate-0' : '-rotate-90'
                              }`}
                            />
                            <span className="truncate">{collection.name}</span>
                            <span className="ml-auto text-[10px] text-gray-400 dark:text-slate-500">
                              {collection.requests.length}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportCollection(collection);
                              }}
                              className="ml-1 p-0.5 text-gray-400 dark:text-slate-600 opacity-0 transition-opacity hover:text-[#5b5bff] group-hover/col:opacity-100"
                              title="Export collection"
                            >
                              <Download className="h-3 w-3" />
                            </button>
                          </button>
                          {expandedCollections[collection.id] && (
                            <div className="border-t border-gray-200 dark:border-[#222222] bg-white dark:bg-[#141414]">
                              {collection.requests.length === 0 ? (
                                <div className="px-3 py-3 text-[11px] text-gray-400 dark:text-slate-500">
                                  No saved requests
                                </div>
                              ) : (
                                collection.requests.map((request) => (
                                  <div
                                    key={request.id}
                                    className="group flex items-center gap-2 border-b border-gray-200 dark:border-[#1f1f1f] px-3 py-2 text-xs last:border-0 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                  >
                                    {renamingRequestId === request.id ? (
                                      <>
                                        <span
                                          className={`shrink-0 text-[10px] font-bold ${getMethodColor(request.method)}`}
                                        >
                                          {request.method}
                                        </span>
                                        <input
                                          autoFocus
                                          value={renameValue}
                                          onChange={(e) => setRenameValue(e.target.value)}
                                          onBlur={() => commitRename(collection.id, request.id, renameValue)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitRename(collection.id, request.id, renameValue);
                                            if (e.key === 'Escape') setRenamingRequestId(null);
                                          }}
                                          className="min-w-0 flex-1 rounded border border-[#5b5bff] bg-white dark:bg-[#1e1e1e] px-1 py-0.5 text-xs text-gray-800 dark:text-slate-200 outline-none"
                                        />
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => loadSavedRequest(request)}
                                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                      >
                                        <span
                                          className={`shrink-0 text-[10px] font-bold ${getMethodColor(request.method)}`}
                                        >
                                          {request.method}
                                        </span>
                                        <span className="truncate text-gray-700 dark:text-slate-300">
                                          {request.name}
                                        </span>
                                      </button>
                                    )}
                                    {renamingRequestId !== request.id && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRenamingRequestId(request.id);
                                          setRenameValue(request.name);
                                        }}
                                        className="p-1 text-gray-400 dark:text-slate-600 opacity-0 transition-opacity hover:text-gray-700 dark:hover:text-slate-300 group-hover:opacity-100"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    )}
                                    {renamingRequestId !== request.id && (
                                      <button
                                        type="button"
                                        onClick={() => deleteSavedRequest(collection.id, request.id)}
                                        className="p-1 text-gray-400 dark:text-slate-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-gray-200 dark:border-[#222222] p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={importPostmanCollection}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded bg-[#5b5bff] text-xs font-medium text-white transition-colors hover:bg-[#4b4be6]"
                    >
                      Import
                    </button>
                    <button
                      type="button"
                      onClick={exportAllCollections}
                      disabled={collections.length === 0}
                      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded border border-gray-300 dark:border-[#333] bg-gray-100 dark:bg-[#202020] text-xs font-medium text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-200 dark:hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download className="h-3 w-3" /> Export all
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInlineSave((current) => !current);
                      setInlineSaveName(extractHostname(activeTab?.url ?? ''));
                      setInlineSaveCollectionId(collections[0]?.id ?? '__new__');
                    }}
                    className="h-8 w-full rounded border border-gray-300 dark:border-[#333] bg-gray-100 dark:bg-[#202020] text-xs font-medium text-gray-900 dark:text-white transition-colors hover:bg-gray-200 dark:hover:bg-[#2a2a2a]"
                  >
                    + Add new
                  </button>
                  {showInlineSave && (
                    <div className="space-y-2 rounded border border-gray-200 dark:border-[#222222] bg-gray-50 dark:bg-[#171717] p-3">
                      <Select value={inlineSaveCollectionId} onValueChange={setInlineSaveCollectionId}>
                        <SelectTrigger className="h-8 border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-xs text-gray-700 dark:text-slate-300 focus:ring-[#5b5bff]">
                          <SelectValue placeholder="Select collection" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-slate-300">
                          {collections.map((collection) => (
                            <SelectItem key={collection.id} value={collection.id}>
                              {collection.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={inlineSaveName}
                        onChange={(event) => setInlineSaveName(event.target.value)}
                        placeholder="Request name"
                        className="h-8 border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-xs text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-600 focus-visible:ring-[#5b5bff]"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (
                            saveRequestToCollection({
                              collectionId: inlineSaveCollectionId,
                              requestName: inlineSaveName,
                            })
                          ) {
                            setShowInlineSave(false);
                          }
                        }}
                        className="h-8 w-full bg-[#5b5bff] text-xs hover:bg-[#4b4be6]"
                      >
                        Save request
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {sidePanel === 'history' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#222222] px-4 py-3">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Recent requests</span>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-[11px] text-gray-400 dark:text-slate-500 transition-colors hover:text-gray-800 dark:hover:text-slate-200"
                  >
                    Clear history
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {history.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[11px] text-gray-400 dark:text-slate-500">
                      No requests sent yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => loadHistoryEntry(entry)}
                          className="w-full rounded border border-gray-200 dark:border-[#222222] bg-gray-50 dark:bg-[#171717] p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-[#1d1d1d]"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Badge
                              className={`rounded-full border px-2 py-0.5 text-[10px] ${getMethodColor(entry.method)} border-gray-300 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#111111]`}
                            >
                              {entry.method}
                            </Badge>
                            <Badge
                              className={`rounded-full border px-2 py-0.5 text-[10px] ${getStatusBadgeClass(entry.status)}`}
                            >
                              {entry.status}
                            </Badge>
                          </div>
                          <div className="truncate text-xs text-gray-800 dark:text-slate-200">{entry.url}</div>
                          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500">
                            <span>{entry.time} ms</span>
                            <span>{new Date(entry.timestamp).toLocaleString()}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {sidePanel === 'environments' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#222222] px-4 py-3">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Local environments</span>
                  <button
                    type="button"
                    onClick={addEnvironment}
                    className="flex items-center text-xs text-gray-700 dark:text-slate-300 transition-colors hover:text-gray-900 dark:hover:text-white"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add new
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  <div className="space-y-3">
                    {environments.map((environment) => (
                      <div
                        key={environment.id}
                        className={`rounded border ${
                          activeEnvironmentId === environment.id
                            ? 'border-[#5b5bff]/50 bg-gray-50 dark:bg-[#171717]'
                            : 'border-gray-200 dark:border-[#222222] bg-gray-50 dark:bg-[#171717]'
                        }`}
                      >
                        <div className="flex items-center gap-2 px-3 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedEnvironments((current) => ({
                                ...current,
                                [environment.id]: !current[environment.id],
                              }))
                            }
                            className="text-gray-400 dark:text-slate-500 transition-colors hover:text-gray-700 dark:hover:text-slate-300"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${
                                expandedEnvironments[environment.id] ? 'rotate-0' : '-rotate-90'
                              }`}
                            />
                          </button>
                          <div className="flex-1">
                            <Input
                              value={environment.name}
                              onFocus={() => setActiveEnvironment(environment.id)}
                              onChange={(event) =>
                                updateEnvironment(environment.id, (currentEnvironment) => ({
                                  ...currentEnvironment,
                                  name: event.target.value,
                                }))
                              }
                              className="h-8 border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-xs text-gray-700 dark:text-slate-300 focus-visible:ring-[#5b5bff]"
                            />
                          </div>
                          {activeEnvironmentId === environment.id && (
                            <Badge className="border-[#5b5bff]/30 bg-[#5b5bff]/10 text-[10px] text-[#9b9bff]">
                              Active
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteEnvironment(environment.id)}
                            className="p-1 text-gray-400 dark:text-slate-600 transition-colors hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {expandedEnvironments[environment.id] && (
                          <div className="border-t border-gray-200 dark:border-[#222222] p-3">
                            <KeyValueEditor
                              items={environment.variables}
                              setItems={(items) =>
                                updateEnvironment(environment.id, (currentEnvironment) => ({
                                  ...currentEnvironment,
                                  variables: items,
                                }))
                              }
                              addLabel="Add new variable"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    {environments.length === 0 && (
                      <div className="rounded border border-dashed border-gray-300 dark:border-[#2a2a2a] p-4 text-center text-[11px] text-gray-400 dark:text-slate-500">
                        Create an environment to interpolate variables like {'{{baseUrl}}'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {sidePanel === 'settings' && (
              <div className="space-y-4 p-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 dark:text-slate-400">Timeout (ms)</label>
                  <Input
                    type="number"
                    value={settingsDraft.timeout}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        timeout: Number(event.target.value) || 0,
                      }))
                    }
                    className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus-visible:ring-[#5b5bff]"
                  />
                </div>
                <label className="flex items-center gap-3 rounded border border-gray-200 dark:border-[#222222] bg-gray-50 dark:bg-[#171717] px-3 py-3 text-sm text-gray-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={settingsDraft.sslVerification}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        sslVerification: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-400 dark:border-[#444] bg-transparent text-[#5b5bff] focus:ring-[#5b5bff]"
                  />
                  SSL Verification
                </label>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  Stored locally for future proxy support.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    saveSettings(settingsDraft);
                    toast('Settings saved');
                  }}
                  className="w-full bg-[#5b5bff] hover:bg-[#4b4be6]"
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col bg-gray-50 dark:bg-[#171717]">
          <div className="sticky top-0 z-10 flex h-11 shrink-0 items-center overflow-x-auto border-b border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#141414] hide-scrollbar">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveTabId(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setActiveTabId(tab.id);
                  }
                }}
                className={`group flex h-full min-w-[150px] max-w-[220px] cursor-pointer items-center border-r border-gray-200 dark:border-[#222] px-4 text-left ${
                  activeTabId === tab.id
                    ? 'border-t-2 border-t-[#5b5bff] bg-gray-50 dark:bg-[#171717]'
                    : 'bg-white dark:bg-[#141414]'
                }`}
              >
                <span className={`mr-2 text-[10px] font-bold ${getMethodColor(tab.method)}`}>{tab.method}</span>
                <span className="truncate text-xs text-gray-800 dark:text-slate-200">{extractHostname(tab.url)}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="ml-auto rounded p-1 text-gray-500 dark:text-slate-400 opacity-0 transition-all hover:bg-gray-200 dark:hover:bg-[#2a2a2a] group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTab}
              className="h-full border-r border-gray-200 dark:border-[#222] px-4 text-gray-400 dark:text-slate-500 transition-colors hover:bg-gray-200 dark:hover:bg-[#222] hover:text-gray-700 dark:hover:text-slate-300"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="ml-auto flex items-center gap-2 px-4 text-xs text-gray-500 dark:text-slate-400">
              <HardDrive className="h-3.5 w-3.5" />
              <Select
                value={activeEnvironmentId ?? 'none'}
                onValueChange={(value) => setActiveEnvironment(value === 'none' ? null : value)}
              >
                <SelectTrigger className="h-8 border-0 bg-transparent px-0 text-xs text-gray-500 dark:text-slate-400 shadow-none focus:ring-0">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-slate-300">
                  <SelectItem value="none">No environment</SelectItem>
                  {environments.map((environment) => (
                    <SelectItem key={environment.id} value={environment.id}>
                      {environment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 bg-gray-50 dark:bg-[#171717] p-4">
              <div className="flex h-[42px] items-center overflow-visible rounded border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] shadow-sm">
                <div className="relative h-full w-28 shrink-0 border-r border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] transition-colors hover:bg-gray-200 dark:hover:bg-[#252525]">
                  <select
                    value={activeTab?.method ?? 'GET'}
                    onChange={(event) => updateTab(activeTabId, (tab) => ({ ...tab, method: event.target.value }))}
                    className="h-full w-full cursor-pointer appearance-none bg-transparent pl-4 pr-8 text-xs font-bold tracking-wide focus:outline-none"
                  >
                    {METHODS.map((method) => (
                      <option
                        key={method}
                        value={method}
                        className="bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white"
                      >
                        {method}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-[14px] h-3.5 w-3.5 text-gray-400 dark:text-slate-500 transition-colors group-hover:text-gray-700 dark:group-hover:text-slate-300" />
                </div>
                <input
                  value={activeTab?.url ?? ''}
                  onChange={(event) => updateTab(activeTabId, (tab) => ({ ...tab, url: event.target.value }))}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData('text');
                    if (pasted.trimStart().toLowerCase().startsWith('curl ')) {
                      event.preventDefault();
                      setCurlImportValue(pasted);
                      setCurlImportOpen(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleSend(false);
                    }
                  }}
                  placeholder="https://localhost:3000/api"
                  className="h-full w-full flex-1 bg-white dark:bg-[#1e1e1e] px-4 font-mono text-[13px] text-gray-800 dark:text-slate-200 outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#222]"
                />
                <button
                  type="button"
                  onClick={() => setCodeSnippetOpen(true)}
                  title="Generate code snippet"
                  className="flex h-full items-center gap-1.5 border-l border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] px-3 text-[11px] font-medium text-gray-500 dark:text-slate-400 transition-colors hover:bg-gray-100 dark:hover:bg-[#252525] hover:text-[#5b5bff]"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurlImportOpen(true)}
                  title="Import from cURL"
                  className="flex h-full items-center gap-1.5 border-l border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] px-3 text-[11px] font-medium text-gray-500 dark:text-slate-400 transition-colors hover:bg-gray-100 dark:hover:bg-[#252525] hover:text-[#5b5bff]"
                >
                  <Package className="h-3.5 w-3.5" />
                </button>
                <div ref={sendMenuRef} className="relative flex h-full shrink-0">
                  <Button
                    type="button"
                    onClick={() => void handleSend(false)}
                    disabled={activeTab?.loading}
                    className="h-full rounded-none border-0 bg-[#5b5bff] px-6 font-semibold text-white transition-colors hover:bg-[#4b4be6]"
                  >
                    {activeTab?.loading ? (
                      <span className="flex items-center text-xs">
                        <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Sending
                      </span>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        <span className="text-[13px]">Send</span>
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSendMenuOpen((current) => !current)}
                    className="flex h-full items-center justify-center border-l border-[#4b4be6]/50 bg-[#5b5bff] px-2 transition-colors hover:bg-[#4b4be6]"
                  >
                    <ChevronDown className="h-4 w-4 text-white" />
                  </button>
                  {sendMenuOpen && (
                    <div className="absolute right-0 top-[46px] z-30 w-56 rounded border border-gray-300 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#171717] p-1 shadow-2xl">
                      <button
                        type="button"
                        onClick={() => void handleSend(false)}
                        className="flex w-full items-center rounded px-3 py-2 text-left text-xs text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-100 dark:hover:bg-[#1f1f1f]"
                      >
                        Send
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSend(true)}
                        className="flex w-full items-center rounded px-3 py-2 text-left text-xs text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-100 dark:hover:bg-[#1f1f1f]"
                      >
                        Send &amp; Save to Collection
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-1 min-h-0 flex-col overflow-hidden border-t border-gray-200 dark:border-[#222222] xl:flex-row">
              <div className="flex w-full shrink-0 flex-col border-b border-gray-200 dark:border-[#222222] xl:w-1/2 xl:shrink xl:border-b-0 xl:border-r">
                <Tabs defaultValue="params" className="flex flex-1 min-h-0 flex-col">
                  <TabsList className="hide-scrollbar h-11 w-full shrink-0 justify-start overflow-x-auto rounded-none border-b border-gray-200 dark:border-[#222222] bg-gray-50 dark:bg-[#171717] px-1 py-0">
                    <TabsTrigger
                      className="h-full rounded-none border-b-2 border-transparent px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 data-[state=active]:border-[#5b5bff] data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
                      value="params"
                    >
                      Parameters
                    </TabsTrigger>
                    <TabsTrigger
                      className="h-full rounded-none border-b-2 border-transparent px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 data-[state=active]:border-[#5b5bff] data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
                      value="body"
                    >
                      Body
                    </TabsTrigger>
                    <TabsTrigger
                      className="h-full rounded-none border-b-2 border-transparent px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 data-[state=active]:border-[#5b5bff] data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
                      value="headers"
                    >
                      Headers
                    </TabsTrigger>
                    <TabsTrigger
                      className="h-full rounded-none border-b-2 border-transparent px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 data-[state=active]:border-[#5b5bff] data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
                      value="auth"
                    >
                      Authorization
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-[#171717]">
                    <TabsContent
                      value="params"
                      className="m-0 flex flex-1 min-h-0 flex-col p-4 overflow-y-auto outline-none"
                    >
                      <div className="mb-3 text-[11px] font-bold tracking-wide text-gray-500 dark:text-slate-400">
                        Query Parameters
                      </div>
                      <KeyValueEditor
                        items={activeTab?.params ?? [createKeyValue()]}
                        setItems={(items) => updateTab(activeTabId, (tab) => ({ ...tab, params: items }))}
                        addLabel="Add new parameter"
                      />
                    </TabsContent>

                    <TabsContent
                      value="headers"
                      className="m-0 flex flex-1 min-h-0 flex-col p-4 overflow-hidden outline-none"
                    >
                      <div className="mb-3 text-[11px] font-bold tracking-wide text-gray-500 dark:text-slate-400">
                        Headers
                      </div>
                      <KeyValueEditor
                        items={activeTab?.headers ?? [createKeyValue()]}
                        setItems={(items) => updateTab(activeTabId, (tab) => ({ ...tab, headers: items }))}
                        addLabel="Add new header"
                      />
                    </TabsContent>

                    <TabsContent
                      value="body"
                      className="m-0 flex flex-1 min-h-0 flex-col p-4 overflow-y-auto outline-none"
                    >
                      <div className="flex items-center justify-between rounded-t border border-b-0 border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] p-2 text-[11px] text-gray-700 dark:text-slate-300">
                        <span className="font-semibold text-[#5b5bff]">raw</span>
                        <Select
                          value={activeTab?.bodyType ?? 'none'}
                          onValueChange={(value) => handleBodyTypeChange(activeTabId, value as BodyType)}
                        >
                          <SelectTrigger className="h-8 w-[210px] border-gray-300 dark:border-[#333] bg-gray-200 dark:bg-[#252525] text-xs text-gray-700 dark:text-slate-300 focus:ring-[#5b5bff]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-slate-300">
                            {BODY_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {activeTab?.bodyType === 'none' ? (
                        <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-b border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#141414] text-xs text-gray-400 dark:text-slate-500">
                          This request does not send a body
                        </div>
                      ) : activeTab?.bodyType === 'form-data' || activeTab?.bodyType === 'urlencoded' ? (
                        <div className="rounded-b border border-gray-300 dark:border-[#2a2a2a] border-t-0 bg-white dark:bg-[#141414] p-4">
                          <KeyValueEditor
                            items={deserializeKeyValueBody(activeTab.body)}
                            setItems={(items) =>
                              updateTab(activeTabId, (tab) => ({
                                ...tab,
                                body: serializeKeyValueBody(items),
                              }))
                            }
                            addLabel={activeTab.bodyType === 'form-data' ? 'Add form field' : 'Add encoded field'}
                          />
                        </div>
                      ) : (
                        <Textarea
                          value={activeTab?.body ?? ''}
                          onChange={(event) => updateTab(activeTabId, (tab) => ({ ...tab, body: event.target.value }))}
                          placeholder={activeTab?.bodyType === 'json' ? `{\n  "key": "value"\n}` : 'Request body'}
                          className="min-h-[320px] flex-1 resize-none rounded-b rounded-t-none border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#141414] p-4 font-mono text-xs text-gray-700 dark:text-slate-300 focus:outline-none focus-visible:border-[#5b5bff] focus-visible:ring-0"
                        />
                      )}
                    </TabsContent>

                    <TabsContent
                      value="auth"
                      className="m-0 flex flex-1 min-h-0 flex-col p-4 overflow-y-auto outline-none"
                    >
                      <div className="mb-3 max-w-md space-y-4">
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold tracking-wide text-gray-500 dark:text-slate-400">
                            Authorization
                          </div>
                          <Select
                            value={activeTab?.auth.type ?? 'none'}
                            onValueChange={(value) =>
                              updateTab(activeTabId, (tab) => ({
                                ...tab,
                                auth:
                                  value === 'bearer'
                                    ? { type: 'bearer', token: '' }
                                    : value === 'basic'
                                      ? { type: 'basic', username: '', password: '' }
                                      : value === 'apikey'
                                        ? { type: 'apikey', key: '', value: '', addTo: 'header' }
                                        : EMPTY_AUTH,
                              }))
                            }
                          >
                            <SelectTrigger className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus:ring-[#5b5bff]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-slate-300">
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="bearer">Bearer Token</SelectItem>
                              <SelectItem value="basic">Basic Auth</SelectItem>
                              <SelectItem value="apikey">API Key</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {activeTab?.auth.type === 'none' && (
                          <div className="rounded border border-dashed border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#141414] px-4 py-6 text-sm text-gray-400 dark:text-slate-500">
                            This request does not use any authorization
                          </div>
                        )}

                        {activeTab?.auth.type === 'bearer' && (
                          <Input
                            value={activeTab.auth.token}
                            onChange={(event) =>
                              updateTab(activeTabId, (tab) => ({
                                ...tab,
                                auth: { type: 'bearer', token: event.target.value },
                              }))
                            }
                            placeholder="Bearer token"
                            className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus-visible:ring-[#5b5bff]"
                          />
                        )}

                        {activeTab?.auth.type === 'basic' && (
                          <div className="space-y-3">
                            <Input
                              value={activeTab.auth.username}
                              onChange={(event) =>
                                updateTab(activeTabId, (tab) => ({
                                  ...tab,
                                  auth:
                                    tab.auth.type === 'basic'
                                      ? { ...tab.auth, username: event.target.value }
                                      : { type: 'basic', username: event.target.value, password: '' },
                                }))
                              }
                              placeholder="Username"
                              className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus-visible:ring-[#5b5bff]"
                            />
                            <Input
                              type="password"
                              value={activeTab.auth.password}
                              onChange={(event) =>
                                updateTab(activeTabId, (tab) => ({
                                  ...tab,
                                  auth:
                                    tab.auth.type === 'basic'
                                      ? { ...tab.auth, password: event.target.value }
                                      : { type: 'basic', username: '', password: event.target.value },
                                }))
                              }
                              placeholder="Password"
                              className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus-visible:ring-[#5b5bff]"
                            />
                          </div>
                        )}

                        {activeTab?.auth.type === 'apikey' && (
                          <div className="space-y-3">
                            <Input
                              value={activeTab.auth.key}
                              onChange={(event) =>
                                updateTab(activeTabId, (tab) => ({
                                  ...tab,
                                  auth:
                                    tab.auth.type === 'apikey'
                                      ? { ...tab.auth, key: event.target.value }
                                      : { type: 'apikey', key: event.target.value, value: '', addTo: 'header' },
                                }))
                              }
                              placeholder="API key name"
                              className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus-visible:ring-[#5b5bff]"
                            />
                            <Input
                              value={activeTab.auth.value}
                              onChange={(event) =>
                                updateTab(activeTabId, (tab) => ({
                                  ...tab,
                                  auth:
                                    tab.auth.type === 'apikey'
                                      ? { ...tab.auth, value: event.target.value }
                                      : { type: 'apikey', key: '', value: event.target.value, addTo: 'header' },
                                }))
                              }
                              placeholder="API key value"
                              className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus-visible:ring-[#5b5bff]"
                            />
                            <Select
                              value={activeTab.auth.addTo}
                              onValueChange={(value: 'header' | 'query') =>
                                updateTab(activeTabId, (tab) => ({
                                  ...tab,
                                  auth:
                                    tab.auth.type === 'apikey'
                                      ? { ...tab.auth, addTo: value }
                                      : { type: 'apikey', key: '', value: '', addTo: value },
                                }))
                              }
                            >
                              <SelectTrigger className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus:ring-[#5b5bff]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-slate-300">
                                <SelectItem value="header">Header</SelectItem>
                                <SelectItem value="query">Query Params</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <div className="flex w-full flex-col bg-white dark:bg-[#141414] xl:w-1/2">
                {!activeTab?.response && !activeTab?.loading ? (
                  <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 dark:bg-[#171717] p-8 text-center">
                    <div className="w-full max-w-[280px] select-none space-y-4 font-mono text-[11px] text-gray-400 dark:text-slate-500">
                      <div className="flex justify-between border-b border-gray-200 dark:border-[#222] pb-2 text-gray-500 dark:text-slate-400">
                        <span className="flex items-center gap-2">Send Request</span>
                        <span className="rounded bg-gray-200 dark:bg-[#222] px-1.5 py-0.5 text-[10px]">⌘ ↵</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 dark:border-[#222] pb-2 text-gray-500 dark:text-slate-400">
                        <span className="flex items-center gap-2">Keyboard Shortcuts</span>
                        <span className="rounded bg-gray-200 dark:bg-[#222] px-1.5 py-0.5 text-[10px]">⌘ /</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 dark:border-[#222] pb-2 text-gray-500 dark:text-slate-400">
                        <span className="flex items-center gap-2">Search Menu</span>
                        <span className="rounded bg-gray-200 dark:bg-[#222] px-1.5 py-0.5 text-[10px]">⌘ K</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 dark:border-[#222] pb-2 text-gray-500 dark:text-slate-400">
                        <span className="flex items-center gap-2">Help</span>
                        <span className="rounded bg-gray-200 dark:bg-[#222] px-1.5 py-0.5 text-[10px]">?</span>
                      </div>
                    </div>
                  </div>
                ) : activeTab.loading ? (
                  <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 dark:bg-[#171717] text-gray-400 dark:text-slate-500">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#5b5bff]" />
                    <p className="text-xs animate-pulse">Sending Request...</p>
                  </div>
                ) : (
                  <Tabs defaultValue="response-body" className="flex flex-1 flex-col">
                    <div className="flex flex-col justify-between border-b border-gray-200 dark:border-[#222222] bg-white dark:bg-[#141414] px-1 sm:flex-row sm:items-center">
                      <TabsList className="hide-scrollbar h-11 justify-start overflow-x-auto rounded-none bg-transparent p-0">
                        <TabsTrigger
                          className="h-full rounded-none border-b-2 border-transparent px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 data-[state=active]:border-[#5b5bff] data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
                          value="response-body"
                        >
                          Response
                        </TabsTrigger>
                        <TabsTrigger
                          className="h-full rounded-none border-b-2 border-transparent px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 data-[state=active]:border-[#5b5bff] data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
                          value="response-headers"
                        >
                          Headers
                          <span className="ml-1 opacity-50">
                            ({successfulResponse ? Object.keys(successfulResponse.headers || {}).length : 0})
                          </span>
                        </TabsTrigger>
                      </TabsList>

                      <div className="flex items-center gap-4 whitespace-nowrap px-3 py-2 font-mono text-[11px] sm:py-0">
                        {successfulResponse && (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 dark:text-slate-500">Status:</span>
                              <span className={`font-semibold ${getStatusColor(successfulResponse.status)}`}>
                                {successfulResponse.status}{' '}
                                <span className="font-normal text-gray-700 dark:text-slate-300">
                                  {successfulResponse.statusText}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 dark:text-slate-500">Time:</span>
                              <span className="text-green-400">{successfulResponse.time} ms</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 dark:text-slate-500">Size:</span>
                              <span className="text-gray-700 dark:text-slate-300">
                                {(successfulResponse.size / 1024).toFixed(2)} KB
                              </span>
                            </div>
                          </>
                        )}
                        {successfulResponse && (
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(responsePreview);
                              toast('Copied!', { duration: 1500 });
                            }}
                            className="rounded border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] p-2 text-gray-500 dark:text-slate-400 transition-colors hover:text-gray-900 dark:hover:text-white"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-[#111111]">
                      <TabsContent value="response-body" className="m-0 flex-1 overflow-y-auto p-0 outline-none">
                        {isErrorResponse(activeTab.response) ? (
                          <div className="m-4 flex items-start gap-3 rounded border border-[#ff5b5b]/30 bg-red-50 dark:bg-red-900/20 p-4 text-[#ff5b5b]">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              <h3 className="mb-1 text-xs font-bold">Network Error</h3>
                              <p className="font-mono text-[11px] opacity-80">{activeTab.response.error}</p>
                            </div>
                          </div>
                        ) : (
                          <pre className="h-full overflow-auto bg-gray-50 dark:bg-[#111] p-4 font-mono text-[12px] leading-relaxed text-gray-700 dark:text-[#b5b5b5] selection:bg-[#5b5bff]/30">
                            {responsePreview}
                          </pre>
                        )}
                      </TabsContent>

                      <TabsContent value="response-headers" className="m-0 flex-1 overflow-y-auto p-4 outline-none">
                        {successfulResponse && (
                          <div className="overflow-hidden rounded border border-gray-300 dark:border-[#2a2a2a]">
                            {Object.entries(successfulResponse.headers || {}).map(([key, value]) => (
                              <div
                                key={key}
                                className="group flex border-b border-gray-300 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#181818] font-mono text-[11px] last:border-0 hover:bg-gray-100 dark:hover:bg-[#1f1f1f]"
                              >
                                <span className="w-1/3 border-r border-gray-300 dark:border-[#2a2a2a] p-2 text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300">
                                  {key}
                                </span>
                                <span className="w-2/3 break-all p-2 text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100">
                                  {value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </div>
                  </Tabs>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <DialogContent className="border-gray-300 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#171717] p-0 text-gray-700 dark:text-slate-300 sm:max-w-2xl">
          <DialogHeader className="border-b border-gray-200 dark:border-[#222222] px-4 py-3">
            <DialogTitle className="text-sm text-gray-900 dark:text-slate-100">Command Palette</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 dark:text-slate-500">
              Search saved requests and history
            </DialogDescription>
          </DialogHeader>
          <div className="border-b border-gray-200 dark:border-[#222222] p-4">
            <Input
              ref={commandInputRef}
              value={commandSearch}
              onChange={(event) => setCommandSearch(event.target.value)}
              placeholder="Search requests, URLs, history..."
              className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 placeholder:text-gray-400 dark:placeholder:text-slate-600 focus-visible:ring-[#5b5bff]"
            />
          </div>
          <div className="max-h-[420px] space-y-4 overflow-y-auto p-4">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                Saved Requests
              </div>
              <div className="space-y-2">
                {commandResults.savedRequests.slice(0, 10).map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      loadSavedRequest(result.request);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full rounded border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#141414] p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-[#1d1d1d]"
                  >
                    <div className="text-xs text-gray-800 dark:text-slate-200">{result.title}</div>
                    <div className="mt-1 truncate text-[11px] text-gray-400 dark:text-slate-500">{result.subtitle}</div>
                    <div className="mt-1 text-[10px] text-[#5b5bff]">{result.meta}</div>
                  </button>
                ))}
                {commandResults.savedRequests.length === 0 && (
                  <div className="rounded border border-dashed border-gray-300 dark:border-[#2a2a2a] p-3 text-[11px] text-gray-400 dark:text-slate-500">
                    No saved requests found
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                History
              </div>
              <div className="space-y-2">
                {commandResults.history.slice(0, 10).map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      loadHistoryEntry(result.entry);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full rounded border border-gray-200 dark:border-[#222222] bg-white dark:bg-[#141414] p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-[#1d1d1d]"
                  >
                    <div className="truncate text-xs text-gray-800 dark:text-slate-200">{result.title}</div>
                    <div className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">{result.subtitle}</div>
                    <div className="mt-1 text-[10px] text-gray-400 dark:text-slate-600">{result.meta}</div>
                  </button>
                ))}
                {commandResults.history.length === 0 && (
                  <div className="rounded border border-dashed border-gray-300 dark:border-[#2a2a2a] p-3 text-[11px] text-gray-400 dark:text-slate-500">
                    No history matches found
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={curlImportOpen}
        onOpenChange={(open) => {
          setCurlImportOpen(open);
          if (!open) setCurlImportValue('');
        }}
      >
        <DialogContent className="border-gray-300 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#171717] text-gray-700 dark:text-slate-300 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm text-gray-900 dark:text-slate-100">Import from cURL</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 dark:text-slate-500">
              Paste a cURL command (bash or Windows CMD) to populate the current request tab
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={curlImportValue}
            onChange={(e) => setCurlImportValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) parseCurlIntoTab();
            }}
            placeholder={
              'Bash:\ncurl -X POST https://api.example.com/data \\\n  -H \'Content-Type: application/json\' \\\n  -d \'{"key": "value"}\'\n\nWindows CMD:\ncurl -X POST https://api.example.com/data ^\n  -H "Content-Type: application/json" ^\n  -d "{\\"key\\": \\"value\\"}"'
            }
            rows={8}
            className="w-full rounded border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] p-3 font-mono text-[11px] leading-relaxed text-gray-800 dark:text-slate-200 outline-none resize-none placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:border-[#5b5bff]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setCurlImportOpen(false);
                setCurlImportValue('');
              }}
              className="rounded border border-gray-300 dark:border-[#333] px-4 py-1.5 text-xs text-gray-600 dark:text-slate-400 transition-colors hover:bg-gray-100 dark:hover:bg-[#222]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={parseCurlIntoTab}
              disabled={!curlImportValue.trim()}
              className="rounded bg-[#5b5bff] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#4b4be6] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={codeSnippetOpen} onOpenChange={setCodeSnippetOpen}>
        <DialogContent className="border-gray-300 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#171717] text-gray-700 dark:text-slate-300 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm text-gray-900 dark:text-slate-100">Code Snippet</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 dark:text-slate-500">
              Copy the request as code in your preferred language
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-1 flex-wrap">
            {(['curl', 'http', 'fetch', 'axios', 'python', 'go'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setCodeSnippetLang(lang)}
                className={`rounded px-3 py-1 text-[11px] font-medium transition-colors ${
                  codeSnippetLang === lang
                    ? 'bg-[#5b5bff] text-white'
                    : 'bg-gray-200 dark:bg-[#222] text-gray-600 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-[#2a2a2a]'
                }`}
              >
                {lang === 'curl'
                  ? 'cURL'
                  : lang === 'http'
                    ? 'HTTP'
                    : lang === 'fetch'
                      ? 'JS Fetch'
                      : lang === 'axios'
                        ? 'Axios'
                        : lang === 'python'
                          ? 'Python'
                          : 'Go'}
              </button>
            ))}
          </div>
          <div className="relative">
            <pre className="max-h-96 overflow-auto rounded border border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#0d0d0d] p-4 font-mono text-[11px] leading-relaxed text-gray-800 dark:text-slate-200 whitespace-pre-wrap break-words">
              {generateCodeSnippet(codeSnippetLang)}
            </pre>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(generateCodeSnippet(codeSnippetLang));
                toast('Copied to clipboard');
              }}
              className="absolute right-3 top-3 flex items-center gap-1 rounded bg-gray-200 dark:bg-[#222] px-2 py-1 text-[10px] text-gray-600 dark:text-slate-400 transition-colors hover:bg-gray-300 dark:hover:bg-[#333]"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="border-gray-300 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#171717] text-gray-700 dark:text-slate-300 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-sm text-gray-900 dark:text-slate-100">Keyboard Shortcuts</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 dark:text-slate-500">
              Quick actions for the REST client
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded border border-gray-200 dark:border-[#222222]">
            {[
              ['⌘ + Enter', 'Send current request'],
              ['⌘ + K', 'Open command palette'],
              ['⌘ + /', 'Open shortcuts dialog'],
              ['?', 'Open help dialog'],
            ].map(([shortcut, description]) => (
              <div
                key={shortcut}
                className="flex border-b border-gray-200 dark:border-[#222222] bg-white dark:bg-[#141414] text-sm last:border-0"
              >
                <div className="w-1/3 border-r border-gray-200 dark:border-[#222222] px-3 py-2 font-mono text-gray-700 dark:text-slate-300">
                  {shortcut}
                </div>
                <div className="w-2/3 px-3 py-2 text-gray-500 dark:text-slate-400">{description}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="border-gray-300 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#171717] text-gray-700 dark:text-slate-300 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm text-gray-900 dark:text-slate-100">
              <HelpCircle className="h-4 w-4 text-[#5b5bff]" /> REST Client Help
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 dark:text-slate-500">
              Use collections, environments, and history from the left sidebar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-500 dark:text-slate-400">
            <p>
              Use <span className="text-gray-800 dark:text-slate-200">{'{{variable}}'}</span> anywhere in URLs, headers,
              body, or auth fields.
            </p>
            <p>
              Choose an active environment from the top-right selector to interpolate local variables before sending.
            </p>
            <p>
              Save reusable requests to collections, restore previous runs from history, and copy response payloads with
              one click.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveDialog.open} onOpenChange={(open) => setSaveDialog((current) => ({ ...current, open }))}>
        <DialogContent className="border-gray-300 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#171717] text-gray-700 dark:text-slate-300 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm text-gray-900 dark:text-slate-100">Save Request to Collection</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 dark:text-slate-500">
              Choose a collection and name for this request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-gray-500 dark:text-slate-400">Collection</label>
              <Select
                value={saveDialog.collectionId}
                onValueChange={(value) => setSaveDialog((current) => ({ ...current, collectionId: value }))}
              >
                <SelectTrigger className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus:ring-[#5b5bff]">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-gray-700 dark:text-slate-300">
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">Create new collection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {saveDialog.collectionId === '__new__' && (
              <div className="space-y-2">
                <label className="text-xs text-gray-500 dark:text-slate-400">New collection name</label>
                <Input
                  value={saveDialog.newCollectionName}
                  onChange={(event) =>
                    setSaveDialog((current) => ({ ...current, newCollectionName: event.target.value }))
                  }
                  className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus-visible:ring-[#5b5bff]"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 dark:text-slate-400">Request name</label>
              <Input
                value={saveDialog.requestName}
                onChange={(event) => setSaveDialog((current) => ({ ...current, requestName: event.target.value }))}
                className="border-gray-300 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] text-sm text-gray-700 dark:text-slate-300 focus-visible:ring-[#5b5bff]"
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                if (
                  saveRequestToCollection({
                    collectionId: saveDialog.collectionId,
                    requestName: saveDialog.requestName,
                    newCollectionName: saveDialog.newCollectionName,
                  })
                ) {
                  setSaveDialog({
                    open: false,
                    collectionId: collections[0]?.id ?? '',
                    newCollectionName: '',
                    requestName: '',
                  });
                }
              }}
              className="w-full bg-[#5b5bff] hover:bg-[#4b4be6]"
            >
              Save request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
