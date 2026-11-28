// An in-memory stand-in for server/services/r2.ts. Tests put CVE records in `r2.records`, or set
// `r2.failing` to make reads fail the way fetchCveFromR2 does (it returns null on any error).

export const r2 = {
  records: new Map<string, any>(),
  failing: false,
  reset() { this.records.clear(); this.failing = false; },
};

const notInTests = (name: string) => async () => { throw new Error(`R2 ${name} is not available in tests`); };

export const fakeR2Module = {
  fetchCveFromR2: async (cveId: string) => (r2.failing ? null : r2.records.get(cveId) ?? null),
  checkCveInR2: async (cveId: string) => !r2.failing && r2.records.has(cveId),
  getCveHistory: async () => [],
  uploadCveToR2: notInTests('upload'),
  saveCveHistory: notInTests('saveCveHistory'),
  getNvdSyncState: async () => null,
  saveNvdSyncState: notInTests('saveNvdSyncState'),
  getEpssSyncState: async () => null,
  saveEpssSyncState: notInTests('saveEpssSyncState'),
  getCvelistSyncState: async () => null,
  saveCvelistSyncState: notInTests('saveCvelistSyncState'),
};
