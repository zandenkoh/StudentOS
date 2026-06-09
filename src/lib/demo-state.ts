const DEMO_STORAGE_KEYS = [
  "studentos_footprint",
  "agent_log_visited",
  "studentos_commitment_footprint",
  "studentos_extra_source_added",
  "studentos_plan_overrides",
  "studentos_roadmap_added",
  "studentos_resume_step"
];

function clearStorage(storage: Storage) {
  DEMO_STORAGE_KEYS.forEach((key) => storage.removeItem(key));

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (!key) continue;
    if (key.startsWith("studentos_") || key.startsWith("agent_")) {
      storage.removeItem(key);
    }
  }
}

export function clearStudentOSDemoState() {
  if (typeof window === "undefined") return;

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
}
