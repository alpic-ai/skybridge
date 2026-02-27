# Deploy

Deploy to Alpic using Alpic CLI.

## Parameters

- {path-to-project} is the path to the project directory. It is relative to the current working directory.
- When executing a command requiring `{path-to-project}`, check that you provided the correct path to the project.

## Steps

1. **Make sure the user is logged in to Alpic**

Execute `npx alpic@latest login` to login to Alpic.

2. **Deploy to Alpic**

If it's a new project, **ask the user for the project name**.
Then, execute `npx alpic@latest deploy --yes --project-name {project-name} {path-to-project}`.

3. **Subsequent deploys**

For existing projects (presence of `.alpic/` folder), execute `npx alpic@latest deploy --yes {path-to-project}`.

4. **Setup GitHub integration**

If it's a new project, ask the user first if they want to setup git.
If yes:

- **Push to GitHub** — Commit and push code
- **Link to Alpic project** - Use `npx alpic@latest git connect --yes {path-to-project}`

Full docs: [docs.alpic.ai/quickstart](https://docs.alpic.ai/quickstart)
