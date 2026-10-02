import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import * as api from './api';
import type { Column, ColumnType, Contact, Sort } from './api';
import styles from './App.module.css';

const PAGE_SIZE = 50;

// Choices offered when adding a column.
const TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Texte',
  number: 'Nombre',
  date: 'Date',
  phone: 'Téléphone',
};

function App() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [sort, setSort] = useState<Sort | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  // Last contact of the last page received: the next page starts after it.
  const [cursor, setCursor] = useState<Contact | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Empty element under the table; seeing it on screen means "load more".
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Lets a sort change cancel the page request still in flight.
  const pageRequestRef = useRef<AbortController | null>(null);

  const showError = (err: unknown) => setError(err instanceof Error ? err.message : String(err));

  // Load the columns once, when the page opens.
  useEffect(() => {
    api.getColumns().then(setColumns).catch(showError);
  }, []);

  // Infinite scroll: fetch the next page when the sentinel enters the screen.
  // The observer is recreated after each page and reports right away if the
  // sentinel is still visible, so pages keep loading until the screen is full.
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
          if (controller.signal.aborted) return; // cancelled by reloadSortedBy
          showError(err);
          setHasMore(false); // stop retrying
          setLoading(false);
        });
    });
    observer.observe(sentinelRef.current!);
    return () => observer.disconnect();
  }, [sort, cursor, hasMore, loading]);

  // Clicking a header cycles: ascending -> descending -> unsorted.
  function changeSort(columnId: number) {
    let next: Sort | null = { columnId, dir: 'asc' };
    if (sort?.columnId === columnId) next = sort.dir === 'asc' ? { columnId, dir: 'desc' } : null;
    reloadSortedBy(next);
  }

  // Empties the list; the infinite scroll then loads it again from the first
  // page, in the new order. The request still running for the old order is cancelled.
  function reloadSortedBy(next: Sort | null) {
    pageRequestRef.current?.abort();
    setSort(next);
    setContacts([]);
    setCursor(null);
    setHasMore(true);
    setLoading(false);
  }

  async function addColumn(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); // handle the form here instead of reloading the page
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const column = await api.createColumn(
        String(data.get('name')),
        data.get('type') as ColumnType,
      );
      // Loaded contacts have no value for it yet, so its cells show empty.
      setColumns((prev) => [...prev, column]);
      form.reset();
    } catch (err) {
      showError(err);
    }
  }

  async function deleteColumn(column: Column) {
    if (!window.confirm(`Supprimer la colonne « ${column.name} » et toutes ses valeurs ?`)) return;
    try {
      await api.deleteColumn(column.id);
      setColumns((prev) => prev.filter((c) => c.id !== column.id));
      if (sort?.columnId === column.id) reloadSortedBy(null);
    } catch (err) {
      showError(err);
    }
  }

  async function addContact() {
    try {
      const contact = await api.createContact();
      // Put at the top, whatever the sort, so it is visible right away.
      setContacts((prev) => [contact, ...prev]);
      window.scrollTo({ top: 0 });
    } catch (err) {
      showError(err);
    }
  }

  async function deleteContact(id: number) {
    if (!window.confirm('Supprimer ce contact ?')) return;
    try {
      await api.deleteContact(id);
      setContacts((prev) => prev.filter((contact) => contact.id !== id));
    } catch (err) {
      showError(err);
    }
  }

  return (
    <>
      <div className={styles.toolbar}>
        <button onClick={addContact}>Ajouter un contact</button>
        <form className={styles.columnForm} onSubmit={addColumn}>
          <input name="name" placeholder="Nom de la colonne" required />
          <select name="type">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
          <button>Ajouter une colonne</button>
        </form>
      </div>
      {error && (
        <p className={styles.error}>
          {error} <button onClick={() => setError(null)}>OK</button>
        </p>
      )}
      <table className={styles.grid}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id}>
                <div className={styles.header}>
                  <button className={styles.sortButton} onClick={() => changeSort(column.id)}>
                    {column.name}
                    {sort?.columnId === column.id && (sort.dir === 'asc' ? ' ▲' : ' ▼')}
                  </button>
                  <button title="Supprimer cette colonne" onClick={() => deleteColumn(column)}>
                    ✕
                  </button>
                </div>
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id}>
              {columns.map((column) => (
                <td key={column.id}>{contact.values[column.id]}</td>
              ))}
              <td>
                <button title="Supprimer ce contact" onClick={() => deleteContact(contact.id)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div ref={sentinelRef} className={styles.status}>
        {loading ? 'Chargement…' : hasMore ? '' : `${contacts.length} contacts`}
      </div>
    </>
  );
}

export default App;
