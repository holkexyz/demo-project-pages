# Demo Project Pages

A demo app for creating and sharing project pages, built on AT Protocol with the Certified design system.

## Description

Demo Project Pages lets users log in with their AT Protocol identity (via ePDS OAuth), manage a portfolio of projects, and share them publicly via unique URLs. Projects support rich text descriptions with images and video, powered by the Leaflet block format and TipTap editor.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS
- **Auth**: AT Protocol OAuth (`@atproto/oauth-client-browser`)
- **AT Protocol**: `@atproto/api`
- **Editor**: TipTap (with image, link, YouTube extensions)
- **Data fetching**: TanStack React Query
- **Icons**: Lucide React
- **Language**: TypeScript

## Setup

1. Copy the environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **AT Protocol OAuth login** — passwordless login via email or handle (ePDS OTP flow)
- **Profile display** — shows your AT Protocol profile with avatar, display name, and bio
- **Project CRUD** — create, read, update, and delete project pages
- **Rich text editor** — TipTap-powered editor with image uploads and video embeds
- **Public share URLs** — share projects at `/p/{did}/{rkey}` without requiring login

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home — landing page (unauth) or profile + project gallery (auth) |
| `/projects/new` | Create a new project |
| `/projects/[rkey]` | View your project (owner view) |
| `/projects/[rkey]/edit` | Edit an existing project |
| `/p/[did]/[rkey]` | Public project view (no login required) |
| `/oauth/callback` | AT Protocol OAuth callback handler |
| `/.well-known/oauth-client-metadata` | OAuth client metadata endpoint |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |

## Schema Reference

Projects are stored as `org.hypercerts.claim.collection` records on the AT Protocol PDS with `type: "project"`.

See the [org.hypercerts.claim.collection](https://github.com/hypercerts-org/atproto-lexicons) lexicon for the full schema definition.
