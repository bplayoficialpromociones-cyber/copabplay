import React from 'react';

interface LinkifiedTextProps {
  text: string;
  className?: string;
  isEditing?: boolean;
}

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

const USER_NAMES = [
  'Lucila', 'Tobi', 'Max', 'Maxi', 'Negra',
  'Juano', 'Romina', 'Matias', 'Tobias', 'MaxUx', 'Colo', 'Mato',
  'Ro', 'Romilandia', 'Romulado', 'Matute', 'Locofierro',
  'Tripero', 'Lucilera', 'Toto', 'Totonets', 'Totonet22',
  'Totonets22', 'Toto22', 'Ale', 'Alexis'
];

const USER_NAMES_REGEX = new RegExp(
  `\\b(${USER_NAMES.join('|')})\\b`,
  'gi'
);

type TextSegment = {
  type: 'text' | 'url' | 'username';
  value: string;
};

function parseSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const combinedRegex = new RegExp(
    `(${URL_REGEX.source})|(\\b(?:${USER_NAMES.join('|')})\\b)`,
    'gi'
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }

    if (match[1]) {
      segments.push({ type: 'url', value: match[1] });
    } else if (match[match.length - 1]) {
      segments.push({ type: 'username', value: match[match.length - 1] });
    }

    lastIndex = combinedRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.substring(lastIndex) });
  }

  return segments;
}

export default function LinkifiedText({ text, className = '', isEditing = false }: LinkifiedTextProps) {
  const segments = parseSegments(text);

  if (segments.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const parts = segments.map((segment, index) => {
    if (segment.type === 'username') {
      return (
        <span
          key={index}
          className="font-bold text-red-600"
        >
          {segment.value}
        </span>
      );
    }

    if (segment.type === 'url') {
      if (isEditing) {
        return (
          <span key={index} className="text-blue-600 underline font-medium">
            {segment.value}
          </span>
        );
      }
      return (
        <a
          key={index}
          href={segment.value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline font-medium hover:bg-blue-50 px-1 rounded transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {segment.value}
        </a>
      );
    }

    return <span key={index}>{segment.value}</span>;
  });

  return <span className={className}>{parts}</span>;
}
