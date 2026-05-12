export interface CurlParseResult {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  error?: string;
}

export function parseCurlCommand(curlCommand: string): CurlParseResult {
  const result: CurlParseResult = {
    method: 'GET',
    url: '',
    headers: {},
  };

  if (!curlCommand.trim()) {
    return result;
  }

  try {
    let normalized = curlCommand.trim();

    if (!normalized.toLowerCase().startsWith('curl')) {
      result.error = 'Not a valid curl command';
      return result;
    }

    normalized = normalized
      .replace(/\\\s*\n\s*/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const methodMatch = normalized.match(/-X\s+['"]?(\w+)['"]?/i);
    if (methodMatch) {
      result.method = methodMatch[1].toUpperCase();
    }

    // Before URL extraction, decode %27 (URL-encoded single quote) so it acts as a proper
    // shell close-quote. Some browser devtools emit %27 instead of ' when URL contains quotes.
    normalized = normalized.replace(/%27/gi, "'").replace(/%22/gi, '"');

    const urlQuotedMatch = normalized.match(/curl\s+['"]([^'"]+)['"]/i);
    if (urlQuotedMatch) {
      let url = urlQuotedMatch[1];
      // Strip any trailing curl flags that leaked in (e.g. " -H " captured before the real close-quote)
      const flagLeakIndex = url.search(/\s+-[A-Za-z-]/);
      if (flagLeakIndex > 0) {
        url = url.substring(0, flagLeakIndex);
      }
      result.url = url.trimEnd();
    } else {
      const parts = normalized.split(/\s+/);
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith('http://') || part.startsWith('https://')) {
          result.url = part;
          break;
        }
        if (!part.startsWith('-') && !part.startsWith("'") && !part.startsWith('"')) {
          const nextPart = parts[i + 1];
          if (nextPart && (nextPart.startsWith('http://') || nextPart.startsWith('https://'))) {
            result.url = nextPart;
            break;
          }
        }
      }
    }

    const extractQuotedValue = (str: string, startIndex: number): string | null => {
      const quoteChar = str[startIndex];
      if (quoteChar !== "'" && quoteChar !== '"') {
        return null;
      }
      let endIndex = startIndex + 1;
      while (endIndex < str.length) {
        if (str[endIndex] === quoteChar && str[endIndex - 1] !== '\\') {
          return str.substring(startIndex + 1, endIndex);
        }
        endIndex++;
      }
      return null;
    };

    const headerPatterns = [/-H\s+['"]([^'"]+)['"]/gi, /--header\s+['"]([^'"]+)['"]/gi];

    for (const pattern of headerPatterns) {
      const headerMatches = normalized.matchAll(pattern);
      for (const match of headerMatches) {
        const headerLine = match[1];
        const colonIndex = headerLine.indexOf(':');
        if (colonIndex > 0) {
          const key = headerLine.substring(0, colonIndex).trim();
          const value = headerLine.substring(colonIndex + 1).trim();
          result.headers[key] = value;
        }
      }
    }

    const cookieFlags = [
      { pattern: /-b\s+/i, name: '-b' },
      { pattern: /--cookie\s+/i, name: '--cookie' },
    ];

    for (const flag of cookieFlags) {
      const match = normalized.match(flag.pattern);
      if (match) {
        const startIndex = match.index! + match[0].length;
        if (startIndex < normalized.length) {
          const firstChar = normalized[startIndex];
          if (firstChar === "'" || firstChar === '"') {
            const value = extractQuotedValue(normalized, startIndex);
            if (value !== null) {
              if (result.headers['Cookie']) {
                result.headers['Cookie'] += `; ${value}`;
              } else {
                result.headers['Cookie'] = value;
              }
              break;
            }
          } else {
            const spaceIndex = normalized.indexOf(' ', startIndex);
            if (spaceIndex > startIndex) {
              const cookieValue = normalized.substring(startIndex, spaceIndex);
              if (result.headers['Cookie']) {
                result.headers['Cookie'] += `; ${cookieValue}`;
              } else {
                result.headers['Cookie'] = cookieValue;
              }
              break;
            } else {
              const cookieValue = normalized.substring(startIndex);
              if (result.headers['Cookie']) {
                result.headers['Cookie'] += `; ${cookieValue}`;
              } else {
                result.headers['Cookie'] = cookieValue;
              }
              break;
            }
          }
        }
      }
    }

    const dataFlags = [
      { pattern: /--data-raw\s+/i, name: '--data-raw' },
      { pattern: /--data\s+/i, name: '--data' },
      { pattern: /-d\s+/i, name: '-d' },
    ];

    for (const flag of dataFlags) {
      const match = normalized.match(flag.pattern);
      if (match) {
        const startIndex = match.index! + match[0].length;
        if (startIndex < normalized.length) {
          const firstChar = normalized[startIndex];
          if (firstChar === "'" || firstChar === '"') {
            const value = extractQuotedValue(normalized, startIndex);
            if (value !== null) {
              result.body = value;
              if (!result.method || result.method === 'GET') {
                result.method = 'POST';
              }
              break;
            }
          } else {
            const spaceIndex = normalized.indexOf(' ', startIndex);
            if (spaceIndex > startIndex) {
              result.body = normalized.substring(startIndex, spaceIndex);
              if (!result.method || result.method === 'GET') {
                result.method = 'POST';
              }
              break;
            } else {
              result.body = normalized.substring(startIndex);
              if (!result.method || result.method === 'GET') {
                result.method = 'POST';
              }
              break;
            }
          }
        }
      }
    }

    if (!result.url) {
      result.error = 'Could not extract URL from curl command';
    }
  } catch (error) {
    result.error = `Error parsing curl command: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return result;
}

export function convertToRestClient(curlCommand: string): string {
  const parsed = parseCurlCommand(curlCommand);

  if (parsed.error || !parsed.url) {
    return parsed.error || 'Invalid curl command';
  }

  const lines: string[] = [];

  lines.push(`${parsed.method} ${parsed.url}`);

  Object.entries(parsed.headers).forEach(([key, value]) => {
    lines.push(`${key}: ${value}`);
  });

  if (parsed.body) {
    lines.push('');
    lines.push(parsed.body);
  }

  return lines.join('\n');
}
