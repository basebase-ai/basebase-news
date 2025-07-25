# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Core Development

- `npm run dev` - Start Next.js development server (http://localhost:3000)
- `npm run build` - Build the production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Migration Scripts

- `npm run migrate-stories` - Migrate story data using TypeScript migration script
- `npm run migrate-users` - Run user migration (located in scripts/migrate-users.ts)
- `npm run introspect-schema` - Introspect database schema
- `npm run build-source-mapping` - Build source ID mapping file
- `npm run list-sources` - List all news sources
- `npm run list-stories` - List all stories

## Architecture Overview

### Technology Stack

- **Framework**: Next.js 14 with TypeScript
- **Authentication**: BaseBase SDK with SMS verification
- **Database**: MongoDB via BaseBase backend API
- **Styling**: TailwindCSS with dark mode support
- **Icons**: FontAwesome and Remix Icons
- **State Management**: React Context (AppContext)
- **Content Processing**: LangChain + Anthropic Claude for NLP
- **Web Scraping**: Cheerio and ScrapingBee API

### Key Architectural Patterns

#### State Management

- Global app state managed through `AppContext` in `lib/state/AppContext.tsx`
- Centralized state includes user data, sources, friends, UI preferences (dark/dense mode)
- Authentication state managed by BaseBase SDK

#### Service Layer

Services in `/services/` handle external integrations:

- `basebase.service.ts` - BaseBase SDK authentication wrapper
- `user.service.ts` - User management operations
- `source.service.ts` - News source management
- `story.service.ts` - Article/story operations
- `scraper.service.ts` - Web scraping functionality
- `langchain.service.ts` - AI content analysis

#### Component Structure

- `components/` - Reusable UI components
- `app/` - Next.js App Router pages and layouts
- Authentication wrapper (`AuthWrapper`) protects routes
- Responsive design with mobile-first approach

#### Data Flow

1. User authentication via SMS through BaseBase SDK
2. Sources fetched and managed per user preferences
3. Stories scraped and processed with AI analysis
4. Real-time updates through React state management

### Key Files

- `app/layout.tsx` - Root layout with global providers
- `lib/state/AppContext.tsx` - Global state management
- `types/index.ts` - TypeScript type definitions (User, Source, Story)
- `services/basebase.service.ts` - Authentication service wrapper

## Development Guidelines

### Environment Setup

- Environment variables managed via `.env` files (not visible in repository)
- Required: `BASEBASE_API_KEY`, `JWT_SECRET`, SMTP configuration

### Code Conventions

- Never create inline SVGs - use FontAwesome icons instead
- TypeScript strict mode enabled
- Path aliases configured: `@/*` maps to project root
- ESLint + Prettier for code formatting

### Migration Scripts

- Located in `/scripts/` directory with separate tsconfig.json
- Use `npx ts-node` to run TypeScript scripts directly
- Handle data migration between BaseBase backend versions
