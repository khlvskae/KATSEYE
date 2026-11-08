import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase';
import { TABLES } from '../lib/tables';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const DataContext = createContext(null);
const EMPTY = Object.fromEntries(Object.keys(TABLES).map(k => [k, []]));


async function fetchTable(name) {
  const T = TABLES[name], rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(T.table).select('*').range(from, from + 999);
    if (error) throw new Error(`${T.table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows.map(T.fromDb);
}

function matchKeys(query, name, dbRow) {
  TABLES[name].keys.forEach(k => { query = query.eq(k, dbRow[k]); });
  return query;
}

export function DataProvider({ children }) {
  const { status } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const reload = useCallback(async name => {
    const rows = await fetchTable(name);
    setData(d => ({ ...d, [name]: rows }));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const names = Object.keys(TABLES);
      const results = await Promise.all(names.map(fetchTable));
      setData(Object.fromEntries(names.map((n, i) => [n, results[i]])));
    } catch (err) {
      setLoadError(friendlyError(err));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (status === 'signedIn') loadAll();
    if (status === 'signedOut') setData(EMPTY);
  }, [status, loadAll]);

  
  const saveRow = useCallback(async (name, row, original = null) => {
    const T = TABLES[name];
    const payload = T.toDb(row);
    const { error } = original
      ? await matchKeys(supabase.from(T.table).update(payload), name, T.toDb(original))
      : await supabase.from(T.table).insert(payload);
    if (error) return friendlyError(error);
    await reload(name);                       // pulls back the stamp written by the triggers
    toast('Saved to database');
    return null;
  }, [reload, toast]);

  
  const setDeleted = useCallback(async (name, row, deleted) => {
    const T = TABLES[name];
    const { error } = await matchKeys(supabase.from(T.table).update({ is_deleted: deleted }), name, T.toDb(row));
    if (error) { toast('Not saved: ' + friendlyError(error), true); return false; }
    await reload(name);
    toast(deleted ? 'Deleted. You can restore it from the Deleted tab.' : 'Restored');
    return true;
  }, [reload, toast]);

  return (
    <DataContext.Provider value={{ ...data, loading, loadError, loadAll, reload, saveRow, setDeleted }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
