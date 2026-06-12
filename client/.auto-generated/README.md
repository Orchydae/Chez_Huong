# .auto-generated

Throwaway machine-generated artifacts that should **not** be committed —
Lighthouse reports (`lh-*.json`), profiling dumps, ad-hoc audit output, etc.

Everything in this folder is git-ignored except this README (see the root
`.gitignore`). Drop generated files here so they stay out of version control
and out of `git status`. Anything you want to keep belongs elsewhere.

Example — write a Lighthouse report here:

```bash
# from client/, against a preview build (npm run preview → port 4173)
npx lighthouse http://localhost:4173/ --output=json \
  --output-path=.auto-generated/lh-home.json
```
