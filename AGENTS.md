<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the application’s visual identity centralized in `src/styles.css`; shared UI primitives and route shells consume semantic tokens so every lottery screen stays consistent.
- Keep public pool detail screens inside the scoped `bolao-experience` theme, using dark navy surfaces and each lottery’s accent color without affecting lottery workspaces.
- All app code imports backend clients from `src/integrations/backend/*` (central public config in `config.ts`; admin key only from the `LOTOMASTER_TARGET_SERVICE_ROLE_KEY` secret in `client.server.ts`); the generated `src/integrations/supabase/*` clients are kept untouched for rollback and because Cloud regenerates them.
