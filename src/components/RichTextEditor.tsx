import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight,
  Smile, Type, Strikethrough, ListOrdered, Minus
} from 'lucide-react';

const USER_NAMES = [
  'Lucila', 'Tobi', 'Max', 'Maxi', 'Negra',
  'Juano', 'Romina', 'Matias', 'Tobias', 'MaxUx', 'Colo', 'Mato',
  'Ro', 'Romilandia', 'Romilandia35', 'Romulado', 'Romulando', 'Matute', 'Locofierro',
  'Tripero', 'Lucilera', 'Toto', 'Totonets', 'Totonet22',
  'Totonets22', 'Toto22', 'Ale', 'Alexis'
];

const EMOJI_LIST = [
  '😀','😂','😍','😎','🤔','😅','👍','👎','❤️','🔥',
  '✅','❌','⚠️','🚀','💡','📌','📋','🎯','🐛','🔧',
  '💬','📝','🕐','⏳','✨','🎉','👀','💯','🔴','🟢',
  '🟡','⚡','🙌','👋','🤝','🙏','💪','✍️','📊','🔍',
];

const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32'];

const COLORS = [
  '#1f2937', '#dc2626', '#16a34a', '#2563eb', '#d97706',
  '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#ea580c',
];

const USER_NAMES_PATTERN = new RegExp(`\\b(${USER_NAMES.join('|')})\\b`, 'gi');

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|edu|gov|io|ar|cl|mx|co|es|br|uy|py|bo|pe|ec|ve|info|biz|app|dev|online|store|shop|tech|digital|media|news|blog|web|site|page|link|cloud|host|server|software|systems|solutions|services|agency|studio|group|team|works)(?:[/?#][^\s<>"{}|\\^`[\]]*)?/gi;

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

function getNodeOffset(): { node: Node; offset: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return { node: sel.getRangeAt(0).startContainer, offset: sel.getRangeAt(0).startOffset };
}

function restoreNodeOffset(saved: { node: Node; offset: number } | null) {
  if (!saved) return;
  const sel = window.getSelection();
  if (!sel) return;
  try {
    const range = document.createRange();
    range.setStart(saved.node, saved.offset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {
    // ignore
  }
}

function normalizeUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  return 'https://' + raw;
}

function linkifyUrlsInNode(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    URL_PATTERN.lastIndex = 0;
    if (!URL_PATTERN.test(text)) return false;

    URL_PATTERN.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = URL_PATTERN.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const anchor = document.createElement('a');
      anchor.href = normalizeUrl(match[0]);
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.style.cssText = 'color:#dc2626;text-decoration:underline;cursor:pointer;';
      anchor.setAttribute('data-url', 'true');
      anchor.textContent = match[0];
      fragment.appendChild(anchor);
      lastIndex = URL_PATTERN.lastIndex;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode?.replaceChild(fragment, node);
    return true;
  }

  if (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).getAttribute('data-url') !== 'true' &&
    (node as Element).getAttribute('data-mention') !== 'true' &&
    (node as Element).tagName !== 'A'
  ) {
    const children = Array.from(node.childNodes);
    let changed = false;
    for (const child of children) {
      if (linkifyUrlsInNode(child)) changed = true;
    }
    return changed;
  }

  return false;
}

function highlightMentionsInNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    USER_NAMES_PATTERN.lastIndex = 0;
    if (!USER_NAMES_PATTERN.test(text)) return false;

    USER_NAMES_PATTERN.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = USER_NAMES_PATTERN.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const matchedLower = match[0].toLowerCase();
      const canonical = USER_NAMES.find(n => n.toLowerCase() === matchedLower) || match[0];
      const span = document.createElement('span');
      span.className = 'user-mention';
      span.style.cssText = 'color:#dc2626;font-weight:bold;';
      span.setAttribute('data-mention', 'true');
      span.textContent = canonical;
      fragment.appendChild(span);
      lastIndex = USER_NAMES_PATTERN.lastIndex;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode?.replaceChild(fragment, node);
    return true;
  }

  if (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).getAttribute('data-mention') !== 'true'
  ) {
    const children = Array.from(node.childNodes);
    let changed = false;
    for (const child of children) {
      if (highlightMentionsInNode(child)) changed = true;
    }
    return changed;
  }

  return false;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  minHeight = 120,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [fontSize, setFontSize] = useState('14');
  const [textColor, setTextColor] = useState('#1f2937');
  const isInitialized = useRef(false);
  const savedSelection = useRef<Range | null>(null);
  const suppressChange = useRef(false);
  const isHighlighting = useRef(false);
  const suppressNextInput = useRef(false);
  const spaceAfterMentionUntil = useRef<number>(0);
  const spaceAfterMentionCursor = useRef<{node: Node; offset: number} | null>(null);

  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      isInitialized.current = true;
      if (value) {
        editorRef.current.innerHTML = value;
        setTimeout(() => {
          applyMentionHighlights(true);
          if (editorRef.current) {
            suppressChange.current = true;
            onChange(editorRef.current.innerHTML);
            setTimeout(() => { suppressChange.current = false; }, 0);
          }
        }, 0);
      }
    }
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const onBeforeInput = (ev: Event) => {
      const inputEvent = ev as InputEvent;

      if (inputEvent.data === ' ' && Date.now() < spaceAfterMentionUntil.current) {
        ev.preventDefault();
        const saved = spaceAfterMentionCursor.current;
        if (saved) {
          const sel2 = window.getSelection();
          if (sel2) {
            try {
              const r = document.createRange();
              r.setStart(saved.node, saved.offset);
              r.collapse(true);
              sel2.removeAllRanges();
              sel2.addRange(r);
            } catch { /* ignore */ }
          }
        }
        console.log(`%c[BEFORE_INPUT] -> blocked duplicate space after mention`, 'color:#16a085;font-weight:bold');
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      let node: Node | null = range.startContainer;
      let insideMention = false;

      while (node && node !== el) {
        if (
          (node.nodeType === Node.ELEMENT_NODE && (node as Element).getAttribute('data-mention') === 'true') ||
          (node.nodeType === Node.TEXT_NODE && node.parentElement?.getAttribute('data-mention') === 'true')
        ) {
          insideMention = true;
          break;
        }
        node = node.parentNode;
      }

      const containerDesc = range.startContainer.nodeType === Node.TEXT_NODE
        ? `TEXT("${range.startContainer.textContent?.slice(0,20)}")@${range.startOffset}`
        : `ELEM(${(range.startContainer as Element).tagName || 'unknown'})@${range.startOffset}`;

      console.log(`%c[BEFORE_INPUT] data="${inputEvent.data}" insideMention=${insideMention} container=${containerDesc}`, 'color:#e67e22;font-weight:bold');

      if (!insideMention) return;

      let mentionEl: HTMLElement | null = null;
      node = range.startContainer;
      while (node && node !== el) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).getAttribute('data-mention') === 'true') {
          mentionEl = node as HTMLElement;
          break;
        }
        if (node.nodeType === Node.TEXT_NODE && node.parentElement?.getAttribute('data-mention') === 'true') {
          mentionEl = node.parentElement as HTMLElement;
          break;
        }
        node = node.parentNode;
      }

      if (!mentionEl) return;

      const parent = mentionEl.parentNode;
      if (!parent) return;

      const afterMention = mentionEl.nextSibling;
      let textAfter: Text;
      if (afterMention && afterMention.nodeType === Node.TEXT_NODE) {
        textAfter = afterMention as Text;
        console.log(`%c[BEFORE_INPUT] -> reusing existing textAfter="${textAfter.textContent}"`, 'color:#e67e22');
      } else {
        textAfter = document.createTextNode('');
        parent.insertBefore(textAfter, afterMention || null);
        console.log(`%c[BEFORE_INPUT] -> created new empty textAfter`, 'color:#e67e22');
      }

      const newRange = document.createRange();
      newRange.setStart(textAfter, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      console.log(`%c[BEFORE_INPUT] -> cursor moved to textAfter offset=0`, 'color:#e67e22');
    };

    const onClickUrl = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[data-url="true"]') as HTMLAnchorElement | null;
      if (anchor) {
        e.preventDefault();
        e.stopPropagation();
        window.open(anchor.href, '_blank', 'noopener,noreferrer');
      }
    };

    const onKeyDownNative = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      let node: Node | null = range.startContainer;
      let mentionEl: HTMLElement | null = null;
      while (node && node !== el) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).getAttribute('data-mention') === 'true') {
          mentionEl = node as HTMLElement; break;
        }
        if (node.nodeType === Node.TEXT_NODE && node.parentElement?.getAttribute('data-mention') === 'true') {
          mentionEl = node.parentElement as HTMLElement; break;
        }
        node = node.parentNode;
      }
      if (mentionEl) {
        e.preventDefault();
        const parent = mentionEl.parentNode;
        if (!parent) return;
        const afterMention = mentionEl.nextSibling;
        let textAfter: Text;
        if (afterMention && afterMention.nodeType === Node.TEXT_NODE) {
          textAfter = afterMention as Text;
          textAfter.insertData(0, ' ');
        } else {
          textAfter = document.createTextNode(' ');
          parent.insertBefore(textAfter, afterMention || null);
        }
        const newRange = document.createRange();
        newRange.setStart(textAfter, 1);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        spaceAfterMentionUntil.current = Date.now() + 300;
        spaceAfterMentionCursor.current = { node: textAfter, offset: 1 };
        setTimeout(() => { spaceAfterMentionCursor.current = null; }, 300);
      }
    };

    el.addEventListener('keydown', onKeyDownNative, true);
    el.addEventListener('beforeinput', onBeforeInput);
    el.addEventListener('click', onClickUrl);
    return () => {
      el.removeEventListener('keydown', onKeyDownNative, true);
      el.removeEventListener('beforeinput', onBeforeInput);
      el.removeEventListener('click', onClickUrl);
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && !suppressChange.current) {
      const current = editorRef.current.innerHTML;
      if (current !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && savedSelection.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelection.current);
    }
  }, []);

  const isCursorInsideOrAdjacentToMention = useCallback((): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;

    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).getAttribute('data-mention') === 'true') return true;
      if (node.nodeType === Node.TEXT_NODE && node.parentElement?.getAttribute('data-mention') === 'true') return true;
      node = node.parentNode;
    }
    return false;
  }, []);

  const moveCursorOutOfMention = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;

    let mentionEl: HTMLElement | null = null;

    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).getAttribute('data-mention') === 'true') {
        mentionEl = node as HTMLElement;
        break;
      }
      if (node.nodeType === Node.TEXT_NODE && node.parentElement?.getAttribute('data-mention') === 'true') {
        mentionEl = node.parentElement as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (!mentionEl) return;

    const parent = mentionEl.parentNode;
    if (!parent) return;

    const afterMention = mentionEl.nextSibling;
    let textAfter: Text;

    if (afterMention && afterMention.nodeType === Node.TEXT_NODE) {
      textAfter = afterMention as Text;
    } else {
      textAfter = document.createTextNode('');
      parent.insertBefore(textAfter, afterMention || null);
    }

    const newRange = document.createRange();
    newRange.setStart(textAfter, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

  }, []);

  const cleanMentionSpans = useCallback(() => {
    if (!editorRef.current) return false;
    const spans = Array.from(editorRef.current.querySelectorAll('[data-mention="true"]'));
    let changed = false;

    for (const span of spans) {
      const el = span as HTMLElement;
      const fullText = el.textContent || '';
      USER_NAMES_PATTERN.lastIndex = 0;
      const match = USER_NAMES_PATTERN.exec(fullText);

      if (!match) {
        const textNode = document.createTextNode(fullText);
        el.parentNode?.replaceChild(textNode, el);
        changed = true;
        continue;
      }

      const namePart = match[0];
      const rest = fullText.slice(match.index + namePart.length);

      if (rest.length > 0 || fullText !== namePart) {
        el.textContent = namePart;
        if (rest.length > 0) {
          const textNode = document.createTextNode(rest);
          el.parentNode?.insertBefore(textNode, el.nextSibling || null);
        }
        changed = true;
      }
    }

    return changed;
  }, []);

  const applyMentionHighlights = useCallback((linkify = false) => {
    if (!editorRef.current || isHighlighting.current) return;
    isHighlighting.current = true;

    const el = editorRef.current;
    const sel = window.getSelection();

    const getCharOffset = (): number => {
      if (!sel || sel.rangeCount === 0) return -1;
      const range = sel.getRangeAt(0);
      const pre = document.createRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.startContainer, range.startOffset);
      return pre.toString().length;
    };

    const charOffset = getCharOffset();

    const containerBefore = sel && sel.rangeCount > 0
      ? (sel.getRangeAt(0).startContainer.nodeType === Node.TEXT_NODE
        ? `TEXT("${sel.getRangeAt(0).startContainer.textContent?.slice(0,20)}")@${sel.getRangeAt(0).startOffset}`
        : `ELEM`)
      : 'none';

    const mentionChanged = highlightMentionsInNode(el);
    cleanMentionSpans();
    const urlChanged = linkify ? linkifyUrlsInNode(el) : false;

    console.log(`%c[APPLY_HIGHLIGHTS] charOffset=${charOffset} mentionChanged=${mentionChanged} urlChanged=${urlChanged} before=${containerBefore} innerHTML="${el.innerHTML.slice(0,60)}"`, 'color:#2980b9;font-weight:bold');

    const needsRestore = (mentionChanged || urlChanged) ||
      (sel && sel.rangeCount > 0 && sel.getRangeAt(0).startContainer.nodeType !== Node.TEXT_NODE && charOffset >= 0);

    if (needsRestore && sel && charOffset >= 0) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let remaining = charOffset;
      let placed = false;
      const textNodes: {t:string,len:number}[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const len = node.textContent?.length ?? 0;
        textNodes.push({t: node.textContent?.slice(0,15) ?? '', len});
        if (!placed) {
          if (remaining <= len) {
            try {
              let targetNode: Node = node;
              let targetOffset: number = remaining;
              const inMention = node.parentElement?.getAttribute('data-mention') === 'true';
              const inUrl = node.parentElement?.getAttribute('data-url') === 'true' ||
                node.parentElement?.tagName === 'A';
              if (inMention && remaining === len) {
                const mentionSpan = node.parentElement!;
                const nextSibling = mentionSpan.nextSibling;
                if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                  targetNode = nextSibling;
                  targetOffset = 0;
                } else {
                  const newText = document.createTextNode('');
                  mentionSpan.parentNode?.insertBefore(newText, nextSibling || null);
                  targetNode = newText;
                  targetOffset = 0;
                }
              } else if (inUrl && remaining === len) {
                const anchorEl = node.parentElement!;
                const nextSibling = anchorEl.nextSibling;
                if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                  targetNode = nextSibling;
                  targetOffset = 0;
                } else {
                  const newText = document.createTextNode('');
                  anchorEl.parentNode?.insertBefore(newText, nextSibling || null);
                  targetNode = newText;
                  targetOffset = 0;
                }
              }
              const range = document.createRange();
              range.setStart(targetNode, targetOffset);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              const wasMoved = targetNode !== node || targetOffset !== remaining;
              if (wasMoved) {
                if (document.queryCommandState('bold')) {
                  document.execCommand('bold', false, undefined);
                }
                if (document.queryCommandState('underline')) {
                  document.execCommand('underline', false, undefined);
                }
                document.execCommand('foreColor', false, '#1f2937');
              }
              placed = true;
              console.log(`%c[APPLY_HIGHLIGHTS] -> placed cursor in TEXT("${targetNode.textContent?.slice(0,20)}")@${targetOffset}`, 'color:#27ae60;font-weight:bold');
            } catch (err) {
              console.log(`%c[APPLY_HIGHLIGHTS] -> tryPlace FAILED: ${err}`, 'color:#e74c3c');
            }
          } else {
            remaining -= len;
          }
        }
      }
      console.log(`%c[APPLY_HIGHLIGHTS] textNodes=[${textNodes.map(n=>`"${n.t}"(${n.len})`).join(', ')}] placed=${placed}`, 'color:#2980b9');
      if (!placed && sel) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        console.log(`%c[APPLY_HIGHLIGHTS] -> fallback: cursor at END`, 'color:#e74c3c;font-weight:bold');
      }
    } else {
      console.log(`%c[APPLY_HIGHLIGHTS] -> no DOM change, cursor NOT moved`, 'color:#95a5a6');
    }

    const containerAfter = sel && sel.rangeCount > 0
      ? (sel.getRangeAt(0).startContainer.nodeType === Node.TEXT_NODE
        ? `TEXT("${sel.getRangeAt(0).startContainer.textContent?.slice(0,20)}")@${sel.getRangeAt(0).startOffset}`
        : `ELEM`)
      : 'none';
    console.log(`%c[APPLY_HIGHLIGHTS] FINAL cursor: ${containerAfter}`, 'color:#8e44ad;font-weight:bold');

    isHighlighting.current = false;
  }, [cleanMentionSpans]);

  const exec = useCallback((command: string, value?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveFormats();
    const html = editorRef.current?.innerHTML || '';
    suppressChange.current = true;
    onChange(html);
    setTimeout(() => { suppressChange.current = false; }, 0);
  }, [disabled, onChange]);

  const updateActiveFormats = useCallback(() => {
    const sel = window.getSelection();
    let boldActive = document.queryCommandState('bold');
    if (boldActive && sel && sel.rangeCount > 0) {
      const container = sel.getRangeAt(0).startContainer;
      const inMention = container.nodeType === Node.TEXT_NODE
        ? container.parentElement?.getAttribute('data-mention') === 'true'
        : (container as Element).getAttribute?.('data-mention') === 'true';
      if (!inMention) {
        boldActive = false;
      }
    }
    setActiveFormats({
      bold: boldActive,
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    });
  }, []);

  const cleanEmptyTextNodes = useCallback(() => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    const cursorNode = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startContainer : null;
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    const toRemove: Node[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node === cursorNode) continue;
      if (node.textContent === '' && node.parentElement?.getAttribute('data-mention') !== 'true') {
        const prevSibling = node.previousSibling as Element | null;
        if (prevSibling?.getAttribute?.('data-mention') === 'true') continue;
        toRemove.push(node);
      }
    }
    toRemove.forEach(n => n.parentNode?.removeChild(n));
  }, []);

  const handleInput = useCallback((e?: React.FormEvent) => {
    if (!editorRef.current) return;
    if (suppressNextInput.current) {
      suppressNextInput.current = false;
      return;
    }
    const nativeEvent = (e?.nativeEvent as InputEvent);
    const data = nativeEvent?.data;
    const shouldLinkify = data === ' ' || data === ',' || data === ';' || data === '.' || !data;
    applyMentionHighlights(shouldLinkify);
    cleanEmptyTextNodes();
    suppressChange.current = true;
    onChange(editorRef.current.innerHTML);
    setTimeout(() => { suppressChange.current = false; }, 0);
    updateActiveFormats();
  }, [onChange, updateActiveFormats, applyMentionHighlights, cleanEmptyTextNodes]);

  const resetColorIfInMention = useCallback(() => {
    if (!isCursorInsideOrAdjacentToMention()) return;
    moveCursorOutOfMention();
    editorRef.current?.focus();
    document.execCommand('foreColor', false, '#1f2937');
    if (document.queryCommandState('bold')) {
      document.execCommand('bold', false, undefined);
    }
  }, [isCursorInsideOrAdjacentToMention, moveCursorOutOfMention]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      exec('bold');
    } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      exec('italic');
    } else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      exec('underline');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      suppressNextInput.current = true;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();

        let container: Node = range.startContainer;
        let offset: number = range.startOffset;

        let anchorEl: HTMLElement | null = null;
        let n: Node | null = container;
        while (n && n !== editorRef.current) {
          if ((n as Element).tagName === 'A' || (n as Element).getAttribute?.('data-url') === 'true') {
            anchorEl = n as HTMLElement;
            break;
          }
          n = n.parentNode;
        }

        const insertBr = (insertionParent: Node, beforeNode: Node | null): Text => {
          const br = document.createElement('br');
          insertionParent.insertBefore(br, beforeNode);
          const afterNode = document.createTextNode('');
          insertionParent.insertBefore(afterNode, br.nextSibling || null);
          const hasContentAfter = afterNode.nextSibling &&
            !(afterNode.nextSibling.nodeType === Node.TEXT_NODE && afterNode.nextSibling.textContent === '');
          if (!hasContentAfter) {
            const trailingBr = document.createElement('br');
            insertionParent.insertBefore(trailingBr, afterNode.nextSibling || null);
          }
          return afterNode;
        };

        if (anchorEl) {
          const afterNode = insertBr(anchorEl.parentNode!, anchorEl.nextSibling || null);
          container = afterNode;
          offset = 0;
        } else {
          const br = document.createElement('br');
          range.insertNode(br);
          const insertionParent = br.parentNode!;
          const afterBr = br.nextSibling || null;
          const afterNode = document.createTextNode('');
          insertionParent.insertBefore(afterNode, afterBr);
          const hasContentAfter = afterNode.nextSibling &&
            !(afterNode.nextSibling.nodeType === Node.TEXT_NODE && afterNode.nextSibling.textContent === '');
          if (!hasContentAfter) {
            const trailingBr = document.createElement('br');
            insertionParent.insertBefore(trailingBr, afterNode.nextSibling || null);
          }
          container = afterNode;
          offset = 0;
        }

        const newRange = document.createRange();
        newRange.setStart(container, offset);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        if (document.queryCommandState('underline')) {
          document.execCommand('underline', false, undefined);
        }
        document.execCommand('foreColor', false, '#1f2937');
      }
      if (editorRef.current) {
        suppressChange.current = true;
        onChange(editorRef.current.innerHTML);
        setTimeout(() => { suppressChange.current = false; }, 0);
      }
      updateActiveFormats();
    }
  }, [exec, applyMentionHighlights, onChange, updateActiveFormats]);

  const insertEmoji = useCallback((emoji: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('insertText', false, emoji);
    setShowEmojiPicker(false);
    const html = editorRef.current?.innerHTML || '';
    suppressChange.current = true;
    onChange(html);
    setTimeout(() => { suppressChange.current = false; }, 0);
  }, [disabled, onChange, restoreSelection]);

  const handleFontSize = useCallback((size: string) => {
    setFontSize(size);
    editorRef.current?.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      try {
        const span = document.createElement('span');
        span.style.fontSize = `${size}px`;
        range.surroundContents(span);
      } catch {
        document.execCommand('fontSize', false, '7');
        const fontEls = editorRef.current?.querySelectorAll('font[size="7"]');
        fontEls?.forEach(el => {
          const span = document.createElement('span');
          span.style.fontSize = `${size}px`;
          span.innerHTML = (el as HTMLElement).innerHTML;
          el.parentNode?.replaceChild(span, el);
        });
      }
    } else {
      document.execCommand('fontSize', false, '7');
      const fontEls = editorRef.current?.querySelectorAll('font[size="7"]');
      fontEls?.forEach(el => {
        const span = document.createElement('span');
        span.style.fontSize = `${size}px`;
        span.innerHTML = (el as HTMLElement).innerHTML;
        el.parentNode?.replaceChild(span, el);
      });
    }
    const html = editorRef.current?.innerHTML || '';
    suppressChange.current = true;
    onChange(html);
    setTimeout(() => { suppressChange.current = false; }, 0);
  }, [onChange, restoreSelection]);

  const handleColor = useCallback((color: string) => {
    setTextColor(color);
    editorRef.current?.focus();
    restoreSelection();
    exec('foreColor', color);
  }, [exec, restoreSelection]);

  const insertHorizontalRule = useCallback(() => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, '<hr style="border:none;border-top:2px solid #e5e7eb;margin:8px 0;"/>');
    const html = editorRef.current?.innerHTML || '';
    suppressChange.current = true;
    onChange(html);
    setTimeout(() => { suppressChange.current = false; }, 0);
  }, [disabled, onChange]);

  const btnBase = 'p-1.5 rounded transition-colors text-gray-600 hover:bg-gray-100 disabled:opacity-40';
  const btnActive = 'bg-gray-200 text-gray-900';

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-gray-50 border-b border-gray-200">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}
          className={`${btnBase} ${activeFormats.bold ? btnActive : ''}`} title="Negrita (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}
          className={`${btnBase} ${activeFormats.italic ? btnActive : ''}`} title="Cursiva (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }}
          className={`${btnBase} ${activeFormats.underline ? btnActive : ''}`} title="Subrayado (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('strikeThrough'); }}
          className={`${btnBase} ${activeFormats.strikeThrough ? btnActive : ''}`} title="Tachado">
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('justifyLeft'); }}
          className={`${btnBase} ${activeFormats.justifyLeft ? btnActive : ''}`} title="Alinear izquierda">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('justifyCenter'); }}
          className={`${btnBase} ${activeFormats.justifyCenter ? btnActive : ''}`} title="Centrar">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('justifyRight'); }}
          className={`${btnBase} ${activeFormats.justifyRight ? btnActive : ''}`} title="Alinear derecha">
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }}
          className={`${btnBase} ${activeFormats.insertUnorderedList ? btnActive : ''}`} title="Lista">
          <List className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }}
          className={`${btnBase} ${activeFormats.insertOrderedList ? btnActive : ''}`} title="Lista numerada">
          <ListOrdered className="w-4 h-4" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertHorizontalRule(); }}
          className={btnBase} title="Línea separadora">
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <div className="flex items-center gap-1">
          <Type className="w-3.5 h-3.5 text-gray-500" />
          <select
            value={fontSize}
            onChange={(e) => handleFontSize(e.target.value)}
            onMouseDown={() => { saveSelection(); }}
            className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
          >
            {FONT_SIZES.map(s => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <div className="flex items-center gap-0.5 flex-wrap">
          {COLORS.map(color => (
            <button
              key={color}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleColor(color); }}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${textColor === color ? 'border-gray-700 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              setShowEmojiPicker(prev => !prev);
            }}
            className={`${btnBase} ${showEmojiPicker ? btnActive : ''}`}
            title="Emojis"
          >
            <Smile className="w-4 h-4" />
          </button>
          {showEmojiPicker && (
            <div className="absolute top-8 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-2 w-64">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertEmoji(emoji);
                    }}
                    className="text-lg hover:bg-gray-100 rounded p-0.5 transition-colors leading-none"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onFocus={updateActiveFormats}
        onBlur={() => setShowEmojiPicker(false)}
        data-placeholder={placeholder}
        className="px-3 py-2 text-gray-800 text-sm leading-relaxed focus:outline-none rich-content"
        style={{ minHeight: `${minHeight}px`, wordBreak: 'break-word' }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
