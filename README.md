# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Viewing Production Docs Locally

To view the production SDK documentation locally (e.g., for testing or offline access):

1. **Sync from S3:**
   ```bash
   aws s3 sync s3://helix-sdk-docs-production . --profile helix
   ```

2. **Serve locally:**
   ```bash
   npx serve . -p 3000
   # or
   python -m http.server 3000
   ```

3. **Access at:** http://localhost:3000

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true yarn deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
