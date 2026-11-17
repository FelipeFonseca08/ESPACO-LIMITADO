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

- Arena interface controls use the shared Button with the arena variant; scoped arena tokens keep the game theme independent from global defaults.
- Local game balancing uses a validated browser-local profile applied in place to shared configuration objects before matches; this keeps simulation references and displayed ability values consistent without a hosted service.
