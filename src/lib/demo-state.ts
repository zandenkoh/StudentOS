function clearStorage(storage: Storage) {
  storage.clear();
}

export function clearStudentOSDemoState() {
  if (typeof window === "undefined") return;

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
}
