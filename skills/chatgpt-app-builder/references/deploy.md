# Deploy

Push code to a GitHub repo, then deploy via Alpic.

Guide user through these steps:

1. **Push to GitHub** — commit and push code

2. **Login to Alpic** — go to [app.alpic.ai](https://app.alpic.ai), authenticate with GitHub

3. **Import repo** — select organization and repository, import it

4. **Configure**:
   - **Branch**: pick the branch to deploy from (pushes trigger redeploys)
   - **Environment variables**
   - **Build settings**: Alpic auto-detects, verify build command and output directory

5. **Deploy** — click Deploy, get production URL

Updates deploy automatically on push to the configured branch.

Full docs: [docs.alpic.ai/quickstart](https://docs.alpic.ai/quickstart)
