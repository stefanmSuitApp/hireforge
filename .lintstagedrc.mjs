// pre-commit (.husky/pre-commit): fix and format only what is staged.
// Each project has its own eslint.config.mjs; look it up per file. ESLint
// runs only where `pnpm lint` does (Nx projects); e2e/ and scripts/ are not
// in a TS project the type-aware rules can load, so they get prettier only.
const quote = (files) => files.map((f) => JSON.stringify(f)).join(' ');
const NOT_LINTED = /\/(e2e|scripts)\//;

export default {
  '*.{ts,tsx,js,mjs,cjs,mts}': (files) => {
    const linted = files.filter((f) => !NOT_LINTED.test(f));
    return [
      ...(linted.length
        ? [
            `eslint --flag v10_config_lookup_from_file --fix --max-warnings=0 --no-warn-ignored ${quote(linted)}`,
          ]
        : []),
      `prettier --write ${quote(files)}`,
    ];
  },
  '*.{json,css,md,yml,yaml}': ['prettier --write'],
};
