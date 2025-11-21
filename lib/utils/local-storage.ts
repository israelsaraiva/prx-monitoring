import { JsonLogEntry } from '@/lib/types/json-viewer';

const STORAGE_KEY_JSON_DATA = 'splunk-json-viewer-data';
const STORAGE_KEY_FILE_NAME = 'splunk-json-viewer-file-name';

export function saveToLocalStorage(data: JsonLogEntry[], fileName: string): void {
  try {
    const dataString = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY_JSON_DATA, dataString);
    localStorage.setItem(STORAGE_KEY_FILE_NAME, fileName);
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

export function loadFromLocalStorage(): { data: JsonLogEntry[]; fileName: string } | null {
  try {
    const dataString = localStorage.getItem(STORAGE_KEY_JSON_DATA);
    const fileName = localStorage.getItem(STORAGE_KEY_FILE_NAME);

    if (dataString && fileName) {
      const data = JSON.parse(dataString) as JsonLogEntry[];
      return { data, fileName };
    }
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
  }
  return null;
}

export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_JSON_DATA);
    localStorage.removeItem(STORAGE_KEY_FILE_NAME);
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}
