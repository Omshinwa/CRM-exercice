import { useEffect, useState, type SubmitEvent } from 'react';
import * as api from './api';
import type { CellValue, Column, ColumnType, Sort } from './api';
import { Cell } from './Cell';
import { useInfiniteContacts } from './useInfiniteContacts';

// Choices offered when adding a column.
const TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Texte',
  number: 'Nombre',
  date: 'Date',
  phone: 'Téléphone',
};

function App() {
  const [columns, setColumns] = useState<Column[]>([]);
  const { contacts, setContacts, sort, sortBy, hasMore, loading, loadError, sentinelRef } =
    useInfiniteContacts();
  const [error, setError] = useState<string | null>(null);

  const showError = (err: unknown) => setError(err instanceof Error ? err.message : String(err));

  // Load the columns once, when the page opens.
  useEffect(() => {
    api.getColumns().then(setColumns).catch(showError);
  }, []);

  // Clicking a header cycles: ascending -> descending -> unsorted.
  function changeSort(columnId: number) {
    let next: Sort | null = { columnId, dir: 'asc' };
    if (sort?.columnId === columnId) next = sort.dir === 'asc' ? { columnId, dir: 'desc' } : null;
    sortBy(next);
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
      if (sort?.columnId === column.id) sortBy(null);
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

  // The cell shows the new value once the backend has stored it. If it refuses
  // the value (e.g. an invalid phone number), the old one stays.
  async function saveCell(contactId: number, columnId: number, value: CellValue) {
    try {
      const saved = await api.setContactValue(contactId, columnId, value);
      setContacts((prev) => prev.map((contact) => (contact.id === saved.id ? saved : contact)));
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
      <div className="toolbar">
        <button onClick={addContact}>Ajouter un contact</button>
        <form className="column-form" onSubmit={addColumn}>
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
        <p className="error">
          {error} <button onClick={() => setError(null)}>OK</button>
        </p>
      )}
      <table className="grid">
        <thead>
          <tr>
            <th />
            {columns.map((column) => (
              <th key={column.id}>
                <div className="column-header">
                  <button className="sort-button" onClick={() => changeSort(column.id)}>
                    {column.name}
                    {sort?.columnId === column.id && (sort.dir === 'asc' ? ' ▲' : ' ▼')}
                  </button>
                  <button title="Supprimer cette colonne" onClick={() => deleteColumn(column)}>
                    ✕
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td>
                <button title="Supprimer ce contact" onClick={() => deleteContact(contact.id)}>
                  ✕
                </button>
              </td>
              {columns.map((column) => (
                <Cell
                  key={column.id}
                  column={column}
                  // Contacts loaded before a column was added have no value for it.
                  value={contact.values[column.id] ?? null}
                  onSave={(value) => saveCell(contact.id, column.id, value)}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Also the infinite scroll's sentinel: loads more when it comes on screen. */}
      <div ref={sentinelRef} className="status">
        {loadError ?? (loading ? 'Chargement…' : hasMore ? '' : `${contacts.length} contacts`)}
      </div>
    </>
  );
}

export default App;
