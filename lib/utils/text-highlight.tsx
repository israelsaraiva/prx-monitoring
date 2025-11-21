import React from 'react';

export function highlightKeywords(text: string): React.ReactNode {
  const regex = /(fail|flowId|commandId)/gi;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const lowerPart = part.toLowerCase();
    if (lowerPart === 'fail') {
      return (
        <span key={index} className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-1 rounded">
          {part}
        </span>
      );
    }
    if (lowerPart === 'flowid') {
      return (
        <span key={index} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1 rounded">
          {part}
        </span>
      );
    }
    if (lowerPart === 'commandid') {
      return (
        <span key={index} className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-1 rounded">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
