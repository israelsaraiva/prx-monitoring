import { ParsedMessage } from '@/lib/types/json-viewer';
import { isUnknownLevel } from './message-extractor';

export function filterByUnknownLevel(messages: ParsedMessage[]): ParsedMessage[] {
  return messages.filter((msg) => !isUnknownLevel(msg.level));
}

export function filterByType(
  messages: ParsedMessage[],
  filterType: 'container' | 'level' | 'none',
  filterValue: string
): ParsedMessage[] {
  if (filterType === 'none' || !filterValue) {
    return messages;
  }

  if (filterType === 'container') {
    return messages.filter((msg) => msg.containerName === filterValue);
  }

  if (filterType === 'level') {
    return messages.filter((msg) => msg.level?.toLowerCase() === filterValue.toLowerCase());
  }

  return messages;
}

export function filterBySearchQuery(messages: ParsedMessage[], searchQuery: string): ParsedMessage[] {
  if (!searchQuery.trim()) {
    return messages;
  }

  const query = searchQuery.toLowerCase();
  return messages.filter((msg) => {
    const value = msg.value.toLowerCase();
    const containerName = msg.containerName?.toLowerCase() || '';
    const level = msg.level?.toLowerCase() || '';
    return value.includes(query) || containerName.includes(query) || level.includes(query);
  });
}
