// Calls to the NestJS backend. Vite forwards /api to it (see vite.config.ts).

// Shapes returned by the backend (GET /api/columns, GET /api/contacts).
// keep in sync with backend/src/db/column-ddl.ts
export type ColumnType = 'text' | 'number' | 'date' | 'phone';
export type Column = { id: number; name: string; type: ColumnType };
export type Contact = { id: number; values: Record<string, string | number | null> };
export type Sort = { columnId: number; dir: 'asc' | 'desc' };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    // NestJS errors look like { statusCode: 400, message: '...' }
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `${url}: HTTP ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export function getColumns() {
  return request<Column[]>('/api/columns');
}

export function createColumn(name: string, type: ColumnType) {
  return request<Column>('/api/columns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type }),
  });
}

export function deleteColumn(id: number) {
  return request<void>(`/api/columns/${id}`, { method: 'DELETE' });
}

// One page of contacts, starting after `after` (the last contact already loaded).
export function getContacts(
  limit: number,
  sort: Sort | null,
  after: Contact | null,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (sort) {
    params.set('sort', String(sort.columnId));
    params.set('dir', sort.dir);
  }
  if (after) {
    params.set('afterId', String(after.id));
    // Left out when the cell is empty: the backend reads that as null.
    const value = sort && after.values[sort.columnId];
    if (value != null) params.set('afterValue', String(value));
  }
  return request<Contact[]>(`/api/contacts?${params}`, { signal });
}

export function createContact() {
  return request<Contact>('/api/contacts', { method: 'POST' });
}

export function deleteContact(id: number) {
  return request<void>(`/api/contacts/${id}`, { method: 'DELETE' });
}
