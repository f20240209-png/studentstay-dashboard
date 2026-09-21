# Open StudentStay on your laptop

## 1. Extract and open

Extract `StudentStay_Dashboard.zip` to a folder such as `C:\Projects\StudentStay_Dashboard`.

Open VS Code, choose **File → Open Folder**, and select the folder containing `package.json`. Do not open or edit files from inside the ZIP.

Install **Node.js 24** from https://nodejs.org/en/download and **Git** from https://git-scm.com/downloads if they are not installed. Reopen VS Code after installing them.

## 2. Run it

Choose **Terminal → New Terminal** in VS Code. On Windows, Command Prompt is fine; PowerShell is also fine if your script execution policy permits npm/pnpm commands.

Run these commands one at a time:

```powershell
node --version
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm setup:local
pnpm db:local
pnpm dev
```

Use Node version 24 or later. If the local database command asks to apply a migration, answer **yes**; this command always uses the local database.

Open **http://localhost:5173** in your browser. Your terminal must stay open while you work. Press **Ctrl+C** to stop the server. The next time you work on the project, run just `pnpm dev`.

If PowerShell says scripts are disabled, switch the VS Code terminal profile to **Command Prompt** and run the same commands. You do not need to change your machine-wide security policy.

## 3. Make your first change

Open `components/studentstay/dashboard.tsx`. Find the words `Your property shortlist` and change them to your preferred heading. Save the file and check the browser.

Colours, spacing and fonts are in `app/globals.css`. The README contains a fuller file map. The layout and styling have been preserved from the working dashboard.

The downloaded project initially displays a sanitized sample. You can view property details, transcripts and the unsaved preference preview. A saved-snapshot or connection warning is expected until you configure Make. Chat responses, saving preferences, selections and approvals are disabled until a live read succeeds. See **Connect the existing Make workflow** in `README.md` when ready.

## 4. Put the source on GitHub

Create an empty repository in your own GitHub account, for example `studentstay-dashboard`. Do not initialise it with another README. A private repository is a good starting point while connecting your own accounts.

In the project terminal:

```powershell
git init -b main
git add .
git status
git commit -m "Add StudentStay dashboard"
```

If Git asks for your name/email, follow its instructions using your own details, then repeat the commit. Copy the HTTPS URL of the repository you created. Replace `YOUR_GITHUB_USERNAME` in this command with your actual username:

```powershell
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/studentstay-dashboard.git
git push -u origin main
```

Complete GitHub's browser sign-in if prompted. Do not paste passwords or tokens into project files. `.gitignore` excludes `.env`, local storage, `node_modules` and build outputs. Use `git status` to review files before each commit.

For later edits:

```powershell
git add .
git commit -m "Describe the change you made"
git push
```

## 5. Give it a better address

The code on your laptop, its GitHub repository and its live hosting are separate. GitHub stores the code; a host runs it; a domain supplies the address people visit.

The quickest address change is to attach a domain you own to the existing hosted dashboard. A domain purchase/renewal is separate from this source download. If you want everything in your own accounts, Cloudflare is a natural migration target for this code, but we must first set up production sign-in, its database and secrets. Then connect a host-provided address or your own domain. Moving hosting does not require redesigning the dashboard.

GitHub Pages alone cannot run this app's backend. Do not expose the local development server as the production app: its development identity is restricted to your laptop.

## Troubleshooting

- **pnpm not recognised:** close and reopen the terminal after installing it.
- **No package.json found:** open the extracted project folder, not its parent folder.
- **Port 5173 is busy:** stop an earlier StudentStay terminal with Ctrl+C, then try again.
- **No such table:** stop the server, run `pnpm db:local`, then `pnpm dev`.
- **Make connection not configured:** expected with the included blank `.env`. The README explains the four settings.
- **Make action not confirmed:** refresh and inspect the workbook before retrying. Never remove approval guards to get a draft through.
- **A dependency install fails:** keep the lockfile and send the exact error. Do not delete it or change versions at random.

## Export verification

The export is checked in a Linux workspace with the exact locked dependencies. The helper scripts use Node APIs and have no Bash requirement for the Windows quick start. Native Windows execution has not been tested here. The local database setup, local HTTP/sign-in flow, type checks, domain/safety tests and build are checked before handoff. Live Make credentials are intentionally not included or exercised by this exported copy.
