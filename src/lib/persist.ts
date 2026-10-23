/**
 * Ask the browser to treat this site's storage as persistent so it isn't
 * evicted under storage pressure or (on Safari) after a period of inactivity.
 * Chrome/Edge grant it silently for engaged sites; Firefox may prompt.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isStoragePersisted(): Promise<boolean | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) return null;
  try {
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}
