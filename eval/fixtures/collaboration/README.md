# handoff

An asynchronous decision log for product and design reviews. Handoff keeps the
question, the chosen option, and the final asset together so launch context does
not disappear into chat.

## Launch review

- Empty state copy — resolved
- Mobile breakpoint — resolved
- Launch illustration — approved

Reviewers choose **Resolve decision** on an open thread. When every blocking
decision is resolved, the project shows **Handoff approved** and generates a
read-only review link.

Handoff is a small desktop web app with local SQLite storage. It exports a
portable Markdown decision log for the repository.
