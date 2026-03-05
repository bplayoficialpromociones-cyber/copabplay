import React from 'react';

interface HighlightedTextProps {
  text: string;
  className?: string;
}

export function HighlightedText({ text, className = '' }: HighlightedTextProps) {
  // Check if text contains HTML tags
  const hasHtml = /<[^>]*>/.test(text);

  if (hasHtml) {
    // Process text with HTML tags
    const processTextWithHtml = (html: string) => {
      // Split by HTML tags while preserving them
      const parts = html.split(/(<a[^>]*>.*?<\/a>)/g);

      return parts.map((part, index) => {
        // If it's an HTML tag, render it as-is
        if (part.startsWith('<a')) {
          return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
        }

        // Otherwise, apply the uppercase highlighting logic
        const textParts = part.split(/(\b[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+\b)/);
        return textParts.map((textPart, textIndex) => {
          const isUppercase = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+$/.test(textPart.trim());
          return (
            <span
              key={`${index}-${textIndex}`}
              className={isUppercase ? 'text-green-400 font-bold' : ''}
            >
              {textPart}
            </span>
          );
        });
      });
    };

    return <span className={className}>{processTextWithHtml(text)}</span>;
  }

  // Original logic for plain text
  const parts = text.split(/(\b[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+\b)/);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isUppercase = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+$/.test(part.trim());
        return (
          <span
            key={index}
            className={isUppercase ? 'text-green-400 font-bold' : ''}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}
