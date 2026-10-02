import { useState } from 'react';
import type { CellValue, Column, ColumnType } from './api';

// The <input> used to edit each column type.
const INPUT_TYPES: Record<ColumnType, string> = {
  text: 'text',
  number: 'number',
  date: 'date',
  phone: 'tel',
};

// One cell of the grid. Clicking it turns it into an input; Enter or clicking
// elsewhere saves, Escape cancels.
export function Cell({
  column,
  value,
  onSave,
}: {
  column: Column;
  value: CellValue;
  onSave: (value: CellValue) => void;
}) {
  const [editing, setEditing] = useState(false);
  const text = value === null ? '' : String(value);

  function save(input: HTMLInputElement) {
    setEditing(false);
    // Unchanged (or reset by Escape), or an unfinished number or date: keep the old value.
    if (input.value === text || input.validity.badInput) return;
    if (input.value === '') onSave(null);
    else onSave(column.type === 'number' ? Number(input.value) : input.value);
  }

  if (!editing) {
    return (
      <td className="cell" onClick={() => setEditing(true)}>
        {text}
      </td>
    );
  }

  return (
    <td className="cell editing">
      <input
        type={INPUT_TYPES[column.type]}
        defaultValue={text}
        autoFocus
        onBlur={(event) => save(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            event.currentTarget.value = text; // so save() sees no change
            event.currentTarget.blur();
          }
        }}
      />
    </td>
  );
}
