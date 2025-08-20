# Overview

Allplay is a revolutionary TV homescreen application that replaces traditional streaming interfaces with a unified entertainment hub. The platform consolidates Netflix, Hulu, Disney+, Spotify, and other streaming services into one seamless experience. The application supports three types of service integrations:

## Recent Changes
- **August 8, 2025 (Final Update)**: Complete Live TV Deep Linking and Programming Fix
- **✅ Deep Linking Working**: Fixed "whoops something went wrong" errors - all channels now properly redirect
- **✅ CBS Direct Streaming**: CBS programs link directly to live streams (https://tv.youtube.com/watch/2OGfFsEyTU8?vp=0gEEEgIwAQ%3D%3D)
- **✅ Safe Fallbacks**: Non-CBS programs safely redirect to YouTube TV guide (https://tv.youtube.com/browse/live-tv)
- **✅ Current-Time Programming**: Fixed timing issue - shows realistic current programming based on actual time
- **✅ Afternoon Content**: Displays appropriate afternoon shows ("The Price is Right", "General Hospital", "NFL Live")
- **✅ Anonymous Access**: Deep linking works without login requirements for live TV content
- **✅ Enhanced User Experience**: Improved search functionality, content organization, and UI refinements
- **✅ Header Search Integration**: Moved search from separate tab to top-right header search bar for better accessibility
- **✅ Music Platform Branding**: Added authentic Apple Music and Spotify platform logos from official Wikimedia Commons sources
- **✅ Comedy Sub-sections**: Organized comedy content into specific categories: Comedy Movies, Comedy & Sitcoms, Reality Comedy Shows, and Stand-up Specials
- **Smart Fallback System**: When TV Media API rate limited, generates realistic programming instead of cached evening shows
- **Professional TV Guide Data**: TV Media API integration (developer.tvmedia.ca) with intelligent fallback
- **YouTube TV Integration**: Connected to YouTube TV Los Angeles lineup with real-time program data
- **August 7, 2025**: Implemented TMDB API integration for automatic authentic poster assignment
- **Smart Deep Linking**: Automatic poster pulling from streaming services via TMDB database matching
- **Comprehensive Poster Coverage**: 34/55 YouTube TV shows now have authentic TMDB artwork
- **TV Show Organization**: Categorized shows into 7 curated categories ordered by content density
- **Movie Categories**: Organized into prescriptive categories: "Critically Acclaimed", "90%+ on Rotten Tomatoes", "Action & Adventure", "Award Winners", "Comedy Collection"  
- **Streaming Integration**: Added 27 authentic movies from Netflix, Hulu, Prime, HBO Max, Apple TV+, Paramount+, Disney+
- **Tab Reordering**: Moved "Live TV" to second position after "All" for prominent placement
- **Enhanced Content**: Updated TBS and TNT with comprehensive programming (Friends, American Dad, Animal Kingdom, AEW Wrestling)
- **Data Protection**: Comprehensive backup system prevents content loss with automated sync capabilities
- **Live TV Guide Enhancement**: Integrated real YouTube TV programming data with authentic scheduling and channel-specific deep linking
- **LOCKED: Live TV Guide Formatting**: Aesthetic formatting of Live TV guide is locked (compact view, genre placement next to time, poster sizes). Requires explicit unlock instruction to modify visual layout.

1. **Real OAuth Authentication** (Spotify, YouTube, Apple Music) - Full API integration with secure credential storage
2. **App Integration/Deep Linking** (Netflix, Amazon Prime, Disney+, etc.) - Links to content that opens in the service's native app using existing device logins
3. **Demo Connections** (Other services) - Simulated connections for demonstration purposes

Key features include service connection management, unified content discovery, cross-platform recommendations, and seamless content launching through native apps.

# User Preferences

- Preferred communication style: Simple, everyday language
- Brand messaging: "TV was broken. We fixed it." as primary tagline
- Focus: TV homescreen application that becomes the default interface when turning on TV
- Core value proposition: Single UI for all streaming services - users never leave Allplay to watch content
- Target experience: Always logged in, seamless switching between all connected services
- Music integration: Direct integration with native Apple Music and Spotify apps rather than recreating music interfaces
- Data protection priority: Critical requirement to prevent content loss through comprehensive backup systems
- Automated workflow: All backup and sync operations handled automatically during development
- **Automated data protection**: Agent should automatically implement backup best practices without manual user intervention
- **Live TV Guide Format Lock**: The Live TV guide aesthetic formatting is permanently locked in compact view with genre badges positioned next to time slots. No aesthetic changes to this component unless explicitly unlocked by user instruction. Technical/functional updates (deep linking, data sources) remain unrestricted.

# System Architecture

## Frontend Architecture
The client-side application is built with React 18 and TypeScript, utilizing a modern component-based architecture with functional components and hooks. The application uses Wouter for lightweight routing and TanStack Query for efficient server state management and caching. The UI is constructed with shadcn/ui components, providing a consistent design system built on top of Radix UI primitives and styled with Tailwind CSS.

The frontend follows a modular structure with clear separation of concerns:
- **Components**: Reusable UI components including content cards, navigation, and specialized components for different content types
- **Pages**: Route-level components for landing, home, search, and favorites views
- **Hooks**: Custom React hooks for authentication and other shared logic
- **Utilities**: Helper functions and type definitions

## Backend Architecture
The server is built with Express.js and TypeScript, implementing a RESTful API architecture. The application uses a session-based authentication system integrated with Replit's OpenID Connect (OIDC) authentication service. The server handles content management, user preferences, favorites tracking, and watch history.

Key server components include:
- **Route handlers**: Organized API endpoints for content, authentication, and user data
- **Storage layer**: Abstracted database operations through a storage interface
- **Authentication middleware**: Replit OIDC integration with session management
- **Database connection**: PostgreSQL integration using Neon serverless

## Data Storage Solutions
The application uses PostgreSQL as the primary database, accessed through Drizzle ORM for type-safe database operations. The database schema includes:
- **User management**: User profiles with OAuth integration
- **Content catalog**: Movies, shows, music, and live content with metadata
- **User interactions**: Favorites, watch history with progress tracking
- **Session storage**: Secure session management for authentication

Database operations are abstracted through a storage interface, allowing for easy testing and potential future database migrations.

### Data Protection & Backup System
A comprehensive backup system prevents content loss:
- **Automated backups**: JSON-based timestamped backups of all content
- **Database-to-seed synchronization**: Real-time sync between database and seed files
- **Restore capabilities**: Full restoration from backup files
- **Multi-layered protection**: File system backups + Replit SQL Database rollback feature
- **Command-line tools**: Scripts for creating, listing, and restoring backups

## Authentication and Authorization
The application implements multiple authentication strategies:

### Platform Authentication (Replit OIDC)
- **OIDC integration**: Secure authentication through Replit's identity provider
- **Session management**: Persistent sessions with PostgreSQL storage
- **User profile management**: Automatic user creation and profile updates
- **Protected routes**: Middleware-based route protection for authenticated endpoints

### Service Integration Types
1. **OAuth Services** (Spotify, YouTube, Apple Music):
   - Full OAuth2 flow with secure token storage
   - Real API integration for content discovery
   - Encrypted credential storage in database

2. **App Integration Services** (Netflix, Amazon Prime, Disney+, etc.):
   - Deep link integration without credential storage
   - Subscription verification flow
   - Content launches in native service apps
   - Uses existing device logins (no password storage required)

3. **Demo Services**: 
   - Simulated connections for demonstration
   - No real authentication or API calls

# External Dependencies

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database for primary data storage
- **Drizzle ORM**: Type-safe database operations and migrations

## Authentication Services
- **Replit OIDC**: Primary authentication provider using OpenID Connect
- **Passport.js**: Authentication middleware for Express integration

## Frontend Libraries
- **React 18**: Core frontend framework with hooks and modern features
- **TypeScript**: Type safety and enhanced developer experience
- **Vite**: Fast development server and build tool
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight client-side routing
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Component library built on Radix UI primitives

## Development Tools
- **ESBuild**: Fast bundling for production builds
- **PostCSS**: CSS processing with Tailwind integration
- **Drizzle Kit**: Database schema management and migrations