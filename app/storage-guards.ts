export function parseStoredArray<T = unknown>(raw: string | null): T[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new TypeError('Stored value must be an array.');
  return value as T[];
}

export function preserveCorruptStorage(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  raw: string | null,
) {
  if (raw === null) return true;
  const backupKey = `${key}:corrupt-backup`;
  try {
    if (storage.getItem(backupKey) === null) storage.setItem(backupKey, raw);
    return true;
  } catch {
    return false;
  }
}
