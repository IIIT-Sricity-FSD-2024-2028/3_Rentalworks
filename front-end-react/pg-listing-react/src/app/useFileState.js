import { useCallback, useEffect, useMemo, useRef } from 'react';
import useScreenState from './useScreenState';
import { referencedIds, releaseFile, resolveFiles, toFileRefs } from '../features/ui/fileRegistry';

/**
 * useState for picked files, kept in Redux. The value can be a File, null, an
 * array of Files or an object of Files. Redux stores serializable references
 * ({ __fileRef, name, size, type, lastModified }); the component receives the
 * real File objects back, so previews, validation and FormData uploads work as before.
 */
export default function useFileState(initialValue) {
  const owned = useRef(new Set());
  // Initial values are empty ([], {} or null), so nothing is registered yet.
  const [refs, setRefs] = useScreenState(() => toFileRefs(initialValue));
  const value = useMemo(() => resolveFiles(refs), [refs]);

  const setValue = useCallback((update) => {
    setRefs((prevRefs) => {
      const next = typeof update === 'function' ? update(resolveFiles(prevRefs)) : update;
      const nextRefs = toFileRefs(next, owned.current);
      // Free files this field picked earlier and no longer uses.
      const keep = referencedIds(nextRefs);
      owned.current.forEach((id) => {
        if (!keep.has(id)) {
          releaseFile(id);
          owned.current.delete(id);
        }
      });
      return nextRefs;
    });
  }, [setRefs]);

  // The form is gone: free every file it picked.
  useEffect(() => {
    const mine = owned.current;
    return () => {
      mine.forEach(releaseFile);
      mine.clear();
    };
  }, []);

  return [value, setValue];
}
