import { useEffect, useState } from 'react';
import styles from './App.module.css';

// Shapes returned by the backend (GET /api/columns, GET /api/contacts).
type Column = { id: number; name: string; type: 'text' | 'number' | 'date' | 'phone' };
type Contact = { id: number; values: Record<string, string | number | null> };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

function App() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load once, when the page opens.
  useEffect(() => {
    Promise.all([
      getJson<Column[]>('/api/columns'),
      getJson<Contact[]>('/api/contacts?limit=10'),
    ])
      .then(([columns, contacts]) => {
        setColumns(columns);
        setContacts(contacts);
      })
      .catch((err) => setError(String(err)));
  }, []);

  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <table className={styles.grid}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.id}>{column.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {contacts.map((contact) => (
          <tr key={contact.id}>
            {columns.map((column) => (
              <td key={column.id}>{contact.values[column.id]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default App;
