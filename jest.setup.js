// Mock import.meta for Jest
// This needs to be done before any modules are imported
const originalImportMeta = globalThis.import?.meta;
if (!globalThis.import) {
  Object.defineProperty(globalThis, 'import', {
    value: {
      meta: {
        env: {},
      },
    },
    writable: true,
    configurable: true,
  });
}

