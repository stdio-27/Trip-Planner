# Type-checking scope

`npm run typecheck` runs checkJs over shared schemas/parsers, the pure cost model, and server modules. Core TripSetup and cost selections have JSDoc typedefs. Third-party JavaScript is not checked (`maxNodeModuleJsDepth: 0`); installed declaration files supply library types.

The UI is intentionally not part of the blocking check yet. A separate exploratory UI scan found these remaining categories:
- ErrorState's inferred props require `loading`, but its options-error call site omits that optional flag.
- React component `key` typing needs React declarations and explicit component prop types.
- The CSS side-effect import in main.jsx needs a Vite/CSS module declaration.
- The browser packing-list salvage parser needs narrowing before accessing `.text` on an unknown object.

These are a documented next typing step, not suppressed core errors. The UI scan report is in ignored local artifacts/ui-typecheck.txt; it is not represented as passing.
