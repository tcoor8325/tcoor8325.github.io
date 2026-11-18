# Open Source Ecology New York City

Open Source Ecology New York City, or OSE NYC, is a cosmetic mock-up for an open consumer-goods collaboration portal. The project is meant to make contribution paths easier to browse by putting project status, goals, open work, progress history, and collaboration links in one place.

This folder is the source brief and asset stash for the mock-up. The active app itself lives in `../Dumb Apps/apps/ose-nyc-mockup/`.

## Purpose

The mock-up explores a project page structure for community-built appliances and tools. Instead of treating documentation, status, and contribution routes as separate destinations, the interface tries to keep them visible together so a visitor can quickly understand:

- what the project is trying to do
- what has already happened
- what needs help now
- where each discipline collaborates

## App Structure

The active files for the mock-up are:

- `../Dumb Apps/apps/ose-nyc-mockup/index.html` for the landing page
- `../Dumb Apps/apps/ose-nyc-mockup/app.js` for landing-page rendering and shared auth UI
- `../Dumb Apps/apps/ose-nyc-mockup/project.html` for the shared project detail template
- `../Dumb Apps/apps/ose-nyc-mockup/project.js` for project-page rendering and interactions
- `../Dumb Apps/apps/ose-nyc-mockup/data.js` for shared project content
- `../Dumb Apps/apps/ose-nyc-mockup/style.css` for shared styling

## Landing Page Features

The landing page is a project browser for the mock-up.

- Large `Open Source Ecology` / `NYC` title treatment at the top
- Short lede introducing the portal
- Top-right auth control using the shared mock login state
- Navigation banner with placeholder site sections such as `Store`, `About`, `FAQ`, `Blog`, and `How to Contribute`
- Grid of project cards populated from `data.js`
- Card artwork, discipline, progress label, progress bar, and stage text for each project
- Quote block near the bottom of the page
- Card links that open `project.html?project=<slug>`

## Project Page Layout

All project pages share one renderer and one template, with content driven by the selected project data.

The current desktop layout is built as three columns:

- left column for the always-open task panel
- center column for `Project Goals + Features`, the Build Journal, and the Progress Timeline
- right column for collaboration links and project-stage context

The center column currently behaves like this:

- `Project Goals + Features` sits at the very top of the center column
- the goals drawer opens downward and overlays the content below it
- the Build Journal appears directly underneath it
- the Progress Timeline overlaps upward into the Build Journal area so more of the center stack is devoted to the timeline

## Current Project Page Functionality

### Shared Behaviors

- Project title and summary are populated from the selected project record
- Link rows for collaboration are generated from project data rather than handwritten per-page markup
- Timeline content, task content, brief content, and Build Journal entries are rendered from normalized data
- Placeholder `#` links are prevented in JavaScript so they do not jump the page

### Project Goals + Features

- The brief panel is integrated into the top of the center column rather than floating under the hero copy
- The toggle expands a structured goals and features drawer downward
- Brief sections are rendered from data objects instead of page-specific HTML

### Outstanding Tasks

- The task panel is permanently visible on the left side of the project layout
- Task entries render from project data
- hovering an open task reveals `Volunteer for Task`
- volunteering opens an estimate form with a numeric field and unit selector
- confirming an estimate assigns the task to the current mock user
- assigned tasks show the volunteer avatar
- hovering the assignee reveals task actions
- task actions include revising the estimate, unvolunteering, and marking the task complete
- completed tasks move into a completed state for the current project page
- overdue assignments show a red avatar ring and red exclamation mark

Task assignment, task creation, and task completion state are persisted per project page in `localStorage`.

### Progress Timeline

- The Progress Timeline is rendered as separate lanes, typically for software, mechanical, and electrical work
- Entries appear as dated milestone nodes along each vertical track
- Each track keeps its own height instead of forcing all tracks to match
- A square `Project Start` node is added at the bottom using the earliest timeline date available
- each lane shows a `+` button on hover
- clicking `+` prompts for a short user-added progress update
- newly added entries appear as dashed pending items
- seeded and generated timeline nodes display contributor avatars and names
- if the current mock user is `Admin`, pending entries expose an `Approve` button
- approving a pending entry removes the pending state and refreshes its date label

User-added timeline entries and approvals are also persisted per project page in `localStorage`.

### Build Journal

- The Build Journal is rendered from normalized project journal data
- Entries display as large vertically snapped slides
- Each slide can include image media, date metadata, title text, and supporting copy
- The current layout intentionally reduces how much vertical space the Build Journal occupies so the Progress Timeline remains more prominent

### Collaboration Panel

- The right-side panel lists collaboration routes such as Discord, Google Drive, Onshape, and GitHub
- Mechanical, electronics, and software rows can include `How to Collaborate` helper links
- The collaboration panel is intentionally narrower than the main center column

## Shared Mock Auth

The landing page and all current project pages share a simple mock login state stored in `localStorage` under `ose-mock-user`.

Current mock accounts:

- `User1` with the Pikachu avatar
- `User2` with the HeMan avatar
- `User3` with the Lemongrab avatar
- `User4` with the Sonic avatar
- `Admin` with the Snufkin avatar

Current auth behavior:

- clicking the avatar opens the auth menu
- logged-out state offers the five mock accounts
- logged-in state offers `Log Out`
- auth state resyncs on focus, `pageshow`, and `storage`

The shared auth UI is currently visible on the landing page and on all current project pages.

## Data Model

Project content is centralized in `../Dumb Apps/apps/ose-nyc-mockup/data.js`.

The renderer still supports older simple fields, but newer structured fields are the preferred format:

- `brief`
- `taskPanel`
- `timelinePanel`
- `updatesPanel`

The current live projects mostly use `taskPanel` plus older normalized `timeline` fields, while induction stove now uses structured `updatesPanel` journal data.

## Current Styling Direction

The shared styling lives in `style.css` and currently centers on a minimalist base with the shared overlapping project-page layout applied across the remaining pages.

Current styling characteristics include:

- white panel surfaces and restrained linework in the base layout
- integrated center-column drawer for `Project Goals + Features`
- shared overlapping three-zone project layout
- narrower right-side collaboration column
- shorter Build Journal viewport with stronger timeline overlap in the center column
- grey dashed styling for pending timeline entries
- red overdue styling for late task assignments

## Current Project State

- The mock-up is still cosmetic only
- The current live projects are `Induction Stove` and `Water Boiler`
- Both remaining projects use structured task data but still rely on older normalized timeline and journal fields
- Both remaining projects use fallback `Project Goals` content generated in `project.js`

## Collaboration Model

The project assumes a split collaboration structure by discipline.

- Discord for rapid conversation and coordination
- Google Drive for general documentation access
- Onshape for mechanical collaboration
- KiCAD for electronics collaboration context
- GitHub for software collaboration

The imagined Discord server is discipline-based rather than project-based, with channels such as:

- `#Announcements`
- `#General`
- `#Mechanical`
- `#Software`
- `#Electrical`

## Limitations

- The site is still a mock-up, not a production application
- Most links remain placeholders until real URLs are added to `data.js`
- Project-page state is persisted locally in the browser, not synced remotely
- The latest layout changes were code-verified, but the most recent headless screenshot pass did not complete cleanly in this environment

## Practical Editing Notes

- Most copy, links, task entries, timeline items, and journal posts can be updated in `data.js`
- Layout and visual behavior changes generally belong in `style.css`
- Shared project-page behavior belongs in `project.js`
- Shared landing-page behavior belongs in `app.js`
