/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcut functionality for CFP pages.
 */

import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: KeyHandler;
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' ||
                     target.tagName === 'TEXTAREA' ||
                     target.isContentEditable;

      for (const shortcut of shortcuts) {
        // Check if shortcut is enabled (default true)
        if (shortcut.enabled === false) continue;

        // Check if modifiers match
        const ctrlOrMeta = shortcut.ctrlKey || shortcut.metaKey;
        const hasCtrlOrMeta = event.ctrlKey || event.metaKey;

        if (ctrlOrMeta && !hasCtrlOrMeta) continue;
        if (!ctrlOrMeta && hasCtrlOrMeta) continue;
        if (shortcut.shiftKey && !event.shiftKey) continue;
        if (shortcut.altKey && !event.altKey) continue;

        // Check key match
        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;

        // For Escape, always allow. For other shortcuts, skip if in input
        if (shortcut.key.toLowerCase() !== 'escape' && isInput) continue;

        event.preventDefault();
        shortcut.handler(event);
        return;
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook specifically for form submission with Cmd/Ctrl + Enter
 */
export function useSubmitShortcut(onSubmit: () => void, enabled = true) {
  useKeyboardShortcuts([
    {
      key: 'Enter',
      metaKey: true,
      handler: onSubmit,
      enabled,
    },
    {
      key: 'Enter',
      ctrlKey: true,
      handler: onSubmit,
      enabled,
    },
  ]);
}

/**
 * Hook for Escape key to close modals/dialogs
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useKeyboardShortcuts([
    {
      key: 'Escape',
      handler: onEscape,
      enabled,
    },
  ]);
}

/**
 * Hook for arrow key navigation
 */
export function useArrowNavigation(
  onNext: () => void,
  onPrevious: () => void,
  enabled = true
) {
  useKeyboardShortcuts([
    {
      key: 'ArrowRight',
      handler: onNext,
      enabled,
    },
    {
      key: 'ArrowDown',
      handler: onNext,
      enabled,
    },
    {
      key: 'ArrowLeft',
      handler: onPrevious,
      enabled,
    },
    {
      key: 'ArrowUp',
      handler: onPrevious,
      enabled,
    },
  ]);
}

export default useKeyboardShortcuts;
