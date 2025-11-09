# Project Viewer

A Next.js application that pulls live project documentation from your GitHub account and presents it in a sorted gallery. It reads from a companion repository named `projects`, so you can keep project write-ups in one place and showcase them anywhere the app is deployed.

---

## How It Works

- Fetches directories from `https://github.com/<GITHUB_USER>/projects`.
- Treats top-level folders named `Completed`, `In Progress`, and `Incomplete` as status buckets; everything else is grouped as “Uncategorized”.
- Each project card shows a short description (line 3) and technology tags (line 5) parsed from the project’s Markdown file.
- Visiting a project page renders every Markdown file in that project folder with images and links rewritten to point at GitHub.

---

## Fork & Personalize the Viewer

1. **Fork this repository** to your own GitHub account so you can deploy and customize it.
2. **Create your projects repo**:
   - Fork [`rileybarshak/projects`](https://github.com/rileybarshak/projects) **or** create a new repository called `projects` under your account.
   - Keep (or create) the following structure so the viewer can infer statuses and tags:

     ```
     projects/
       Completed/
         Finished Project Name/
           finsihedproject.md
       In Progress/
         Building Right Now/
           buildingnow.md
       Incomplete/
         Not Started/
           notstarted.md
       Uncategorized Example/
         nostatus.md
     ```

   - Markdown template:

     ```markdown
     # My Project
     > **Project Type:** Personal project
     > **Project Description:** Quick description that appears on the card.
	 > **Project Goal:** Goal of the project
     > **Languages & Technologies:** TypeScript, React, Next.js, Tailwind CSS
     ```
	 If you'd like the card to redirect to another page instead of opening the markdown file, change line 1 to `[My Project](https://example.com/demo)`

     The viewer uses:
     - Line 1: project name for the project card.
     - Line 3: (`**Project Description:** …`) for the card blurb.
     - Line 5: (`**Languages & Technologies:** …`) for tags (comma-separated, case-insensitive).
3. **Point the viewer at your GitHub account**:
   - Update `config.yaml` and set `githubUser` (plus tweak any `tagCategories` you want to expose in the UI).

---

## Local Development

1. Clone your fork and enter the directory.
2. Install dependencies (`npm install`, `pnpm install`, or `yarn install`).
3. Ensure `config.yaml` has the correct `githubUser`
4. Start the dev server:

   ```bash
   pnpm run dev
   ```

5. Open `http://localhost:3000` to verify your project cards render correctly.

---

## Deployment Checklist

- **Environment variable**: set values in `config.yaml` 
- **Cold starts / caching**: API responses are cached for 60 seconds; refresh after a minute if you just pushed new Markdown.
- **CORS and tokens**: Public repos work anonymously. If you hit GitHub’s rate limit, add a server-side proxy or inject a token in `github.ts`.

---

## Customization Notes

- Edit `config.yaml` to update the default GitHub user and the tag categories surfaced in the UI.
- In the same file you can tweak `statusStyles` to change the folder color swatches per status (and add new statuses if your repo uses them).
- To change status buckets or the source repo name, update `src/lib/github.ts`.
- Badge colors are mapped in `src/lib/utils.ts`; extend the lists to highlight new technologies.
- Styling lives in `src/app/globals.css` and the UI components under `src/components/ui`.

---

## Troubleshooting

- **Blank page / “No projects found”**: `projects` repo is empty or `GITHUB_USER` is unset.
- **404 in project view**: Folder names must match exactly (including status subfolders); ensure at least one Markdown file exists.
- **Images not loading**: Use relative paths in Markdown (`./img/screenshot.png`) so the viewer can resolve them against GitHub.

---

Need inspiration? Fork both repos, swap in your username, and you’ll have a personalized project hub in minutes. Happy showcasing!
