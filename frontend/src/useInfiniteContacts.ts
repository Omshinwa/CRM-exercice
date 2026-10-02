import { useEffect, useRef, useState } from 'react';
import * as api from './api';
import type { Contact, Sort } from './api';

const PAGE_SIZE = 50;

// The contacts shown in the grid, loaded one page at a time (infinite scroll).
// - Put `sentinelRef` on an element under the table: when it comes on screen,
//   the next page is loaded.
// - `sortBy` reloads the list from the first page in a new order.
export function useInfiniteContacts() {
  const [sort, setSort] = useState<Sort | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  // Last contact of the last page received: the next page starts after it.
  const [cursor, setCursor] = useState<Contact | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Empty element under the table; seeing it on screen means "load more".
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Lets sortBy cancel the page request still in flight.
  const pageRequestRef = useRef<AbortController | null>(null);

  // Fetch the next page when the sentinel enters the screen. The observer is
  // recreated after each page and reports right away if the sentinel is still
  // visible, so pages keep loading until the screen is full.
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      const controller = new AbortController();
      pageRequestRef.current = controller;
      setLoading(true);
      api
        .getContacts(PAGE_SIZE, sort, cursor, controller.signal)
        .then((page) => {
          // A contact added with the button is already shown at the top.
          setContacts((prev) => {
            const shown = new Set(prev.map((contact) => contact.id));
            return [...prev, ...page.filter((contact) => !shown.has(contact.id))];
          });
          if (page.length > 0) setCursor(page[page.length - 1]);
          setHasMore(page.length === PAGE_SIZE);
          setLoading(false);
        })
        .catch((err) => {
          if (controller.signal.aborted) return; // cancelled by sortBy
          setLoadError(err instanceof Error ? err.message : String(err));
          setHasMore(false); // stop retrying
          setLoading(false);
        });
    });
    observer.observe(sentinelRef.current!);
    return () => observer.disconnect();
  }, [sort, cursor, hasMore, loading]);

  // Empties the list; the effect above then loads it again from the first
  // page, in the new order. The request still running for the old order is cancelled.
  function sortBy(next: Sort | null) {
    pageRequestRef.current?.abort();
    setSort(next);
    setContacts([]);
    setCursor(null);
    setHasMore(true);
    setLoading(false);
    setLoadError(null);
  }

  return { contacts, setContacts, sort, sortBy, hasMore, loading, loadError, sentinelRef };
}
