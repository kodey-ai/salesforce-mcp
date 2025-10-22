# Smithery Quick Deploy Commands

## 1️⃣ Login to Smithery with API Key
```bash
# Interactive login (will prompt for API key)
smithery login
```

## 2️⃣ Build Your Server
```bash
cd packages/mcp

# Build for production
smithery build bin/run.js --out dist/server.cjs --transport stdio
```

## 3️⃣ Test Locally with Smithery
```bash
# Run development server
smithery dev bin/run.js -- --orgs YOUR_ORG --toolsets core,dx

# Or test in playground
smithery playground-stdio node bin/run.js -- --orgs YOUR_ORG --toolsets core,dx
```

## 4️⃣ Publish to NPM (Required for Smithery Registry)
```bash
# Login to NPM
npm login

# Publish your package
npm publish --access public
```

## 5️⃣ Register on Smithery
After publishing to NPM, register your server at:
https://smithery.ai/new

- Click "Publish via URL"
- Enter your NPM package URL: `https://www.npmjs.com/package/@salesforce/mcp`

## 📝 Complete One-Liner Workflow

```bash
# Step 1: Authenticate with Smithery
smithery login

# Step 2: Build and test
cd packages/mcp && npm install && npm run build

# Step 3: Test locally
smithery playground-stdio node bin/run.js -- --orgs YOUR_ORG --toolsets core,dx

# Step 4: Publish to NPM (after npm login)
npm publish --access public

# Step 5: Register on smithery.ai website
```

## 🔑 API Key Notes
- Get your API key from: https://smithery.ai/account
- The API key is used for authentication only
- Actual deployment happens via NPM + Smithery registry

## 💡 Important:
Smithery is a **registry**, not a hosting platform. Your server:
- Gets published to NPM
- Gets indexed on Smithery
- Runs locally on users' machines