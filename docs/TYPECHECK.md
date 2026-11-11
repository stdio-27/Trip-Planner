# Type-checking scope

The blocking `npm run typecheck` now includes all production JSX and JavaScript in src, shared schemas/parsers and server modules, plus the CSS module declaration. Tests remain excluded. Evidence is jsconfig.json and the Stage 3e check output.

The exploratory scan in artifacts/master-pack/ui-diagnostics.log initially contained thirteen diagnostics. They concerned optional component props, an impossible loading/error comparison, inferred reducer dispatch, the form error map, CSS imports and narrowing unknown packing items. Those were resolved through optional defaults, an explicit error-map and reducer action description, the CSS declaration and an object guard. No @ts-ignore or @ts-nocheck suppression was added.

The project retains its existing strict:false checkJs policy. Inferred legacy plan and reducer values still include broad JavaScript types. Passing checkJs does not establish strict TypeScript coverage.
