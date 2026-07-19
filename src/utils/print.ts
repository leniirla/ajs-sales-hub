/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Triggers the OS-native print dialog (same as Ctrl/Win+P) scoped to a single
// printable section, using the `body.printing-*` / `#printable-*` rules in
// index.css to hide the rest of the app during printing.
// `onDone` (optional) fires after the dialog closes — used by callers that
// only mount the printable element on demand and need to unmount it again.
export const printViaBrowser = (bodyClass: string, onDone?: () => void): void => {
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove(bodyClass);
    window.removeEventListener('afterprint', cleanup);
    onDone?.();
  };

  window.addEventListener('afterprint', cleanup);
  document.body.classList.add(bodyClass);
  window.print();

  // Safety net in case `afterprint` never fires (seen in some embedded
  // webviews) so the rest of the app doesn't stay hidden indefinitely.
  setTimeout(cleanup, 120000);
};
