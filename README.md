# Makerkit - Next.js Supabase SaaS Starter Kit \[Lite version\]

This is the Lite Starter Kit for building SaaS applications using Supabase, Next.js, and Tailwind CSS.

Looking for the full version of this SaaS Starter Kit? [Check out the complete version of this SaaS Starter Kit](https://makerkit.dev).

## Features

This starter kit includes:

1. A Turborepo monorepo including a Next.js application, and a Playwright test suite.
2. Shadcn UI components exported from the UI package
3. Prettier, Eslint, TailwindCSS and Typescript configurations.
4. A Supabase project with a Postgres database.
5. The authentication and authorization features of Supabase already configured.
6. Translations using i18next (in both client and server components)

### Technologies

This starter kit provides core foundations:

✨ **Core Infrastructure**
- Next.js 15 application in a Turborepo monorepo
- Supabase authentication and basic database setup
- Essential Shadcn UI components
- i18next translations (client + server)
- TypeScript, TailwindCSS, and ESLint configs
- Basic test setup with Playwright

🛠️ **Technology Stack**:
- [Next.js 15](https://nextjs.org/): A React-based framework for server-side rendering and static site generation.
- [Tailwind CSS](https://tailwindcss.com/): A utility-first CSS framework for rapidly building custom designs.
- [Supabase](https://supabase.com/): A realtime database for web and mobile applications.
- [i18next](https://www.i18next.com/): A popular internationalization framework for JavaScript.
- [Turborepo](https://turborepo.org/): A monorepo tool for managing multiple packages and applications.
- [Shadcn UI](https://shadcn.com/): A collection of components built using Tailwind CSS.
- [Zod](https://github.com/colinhacks/zod): A TypeScript-first schema validation library.
- [React Query](https://tanstack.com/query/v4): A powerful data fetching and caching library for React.
- [Prettier](https://prettier.io/): An opinionated code formatter for JavaScript, TypeScript, and CSS.
- [Eslint](https://eslint.org/): A powerful linting tool for JavaScript and TypeScript.
- [Playwright](https://playwright.dev/): A framework for end-to-end testing of web applications.

This kit is a trimmed down version of the [full version of this SaaS Starter Kit](https://makerkit.dev). It is a good way to evaluate small part of the full kit, or to simply use it as a base for your own project.

## Comparing Lite vs Full Version

The lite kit is perfect for:
- Evaluating our code architecture and patterns
- Building basic SaaS prototypes
- Learning our tech stack approach

The [full version](https://makerkit.dev) adds production features:
- 💳 Complete billing and subscription system
- 👥 Team accounts and management
- 👤 User profiles and settings
- 📧 Email system and templates
- 📊 Analytics and monitoring
- 🔐 Production database schema
- ✅ Comprehensive test suite
- 🤝 Support
- 🕒 Daily Updates

[View complete feature comparison →](https://makerkit.dev/#pricing)

## Getting Started

### Prerequisites

- Node.js 18.x or later
- Docker
- Pnpm

Please make sure you have a Docker daemon running on your machine. This is required for the Supabase CLI to work.

### Installation

#### 1. Clone this repository

```bash
git clone https://github.com/makerkit/next-supabase-saas-kit-lite.git
```

#### 2. Install dependencies

```bash
pnpm install
```

#### 3. Start Supabase

Please make sure you have a Docker daemon running on your machine.

Then run the following command to start Supabase:

```bash
pnpm run supabase:start
```

Once the Supabase server is running, you can access the Supabase dashboard at http://localhost:54321.

#### 4. Start the Next.js application

```bash
pnpm run dev
```

The application will be available at http://localhost:3000.

### Environment Variables

You can configure the application by setting environment variables in the `.env.local` file.

Here are the available variables:

| Variable Name | Description | Default Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | The URL of your SaaS application | `http://localhost:3000` |
| `NEXT_PUBLIC_PRODUCT_NAME` | The name of your SaaS product | `Makerkit` |
| `NEXT_PUBLIC_SITE_TITLE` | The title of your SaaS product | `Makerkit - The easiest way to build and manage your SaaS` |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | The description of your SaaS product | `Makerkit is the easiest way to build and manage your SaaS. It provides you with the tools you need to build your SaaS, without the hassle of building it from scratch.` |
| `NEXT_PUBLIC_DEFAULT_THEME_MODE` | The default theme mode of your SaaS product | `light` |
| `NEXT_PUBLIC_THEME_COLOR` | The default theme color of your SaaS product | `#ffffff` |
| `NEXT_PUBLIC_THEME_COLOR_DARK` | The default theme color of your SaaS product in dark mode | `#0a0a0a` |
| `NEXT_PUBLIC_SUPABASE_URL` | The URL of your Supabase project | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon key of your Supabase project | ''
| `SUPABASE_SERVICE_ROLE_KEY` | The service role key of your Supabase project | ''

## Architecture

This starter kit uses a monorepo architecture.

1. The `apps/web` directory is the Next.js application.
2. The `packages` directory contains all the packages used by the application.
3. The `packages/features` directory contains all the features of the application.
4. The `packages/ui` directory contains all the UI components.

For more information about the architecture, please refer to the [Makerkit blog post about Next.js Project Structure](https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure).

### Marketing Pages

Marketing pages are located in the `apps/web/app/(marketing)` directory. These pages are used to showcase the features of the SaaS and provide information about the product.

### Authentication

Authenticated is backed by Supabase. The `apps/web/app/auth` directory contains the authentication pages, however, the logic is into its own package `@kit/auth` located in `packages/features/auth`.

This package can be used across multiple applications.

### Gated Pages

Gated pages are located in the `apps/web/app/home` directory. Here is where you can build your SaaS pages that are gated by authentication.

### Database

The Supabase database is located in the `apps/web/supabase` directory. In this directory you will find the database schema, migrations, and seed data.

#### Creating a new migration
To create a new migration, run the following command:

```bash
pnpm --filter web supabase migration new --name <migration-name>
```

This command will create a new migration file in the `apps/web/supabase/migrations` directory. 

#### Applying a migration

Once you have created a migration, you can apply it to the database by running the following command:

```bash
pnpm run supabase:web:reset
```

This command will apply the migration to the database and update the schema. It will also reset the database using the provided seed data.

#### Linking the Supabase database

Linking the local Supabase database to the Supabase project is done by running the following command:

```bash
pnpm --filter web supabase db link
```

This command will link the local Supabase database to the Supabase project.

#### Pushing the migration to the Supabase project

After you have made changes to the migration, you can push the migration to the Supabase project by running the following command:

```bash
pnpm --filter web supabase db push
```

This command will push the migration to the Supabase project. You can now apply the migration to the Supabase database.

#### Supabase Auth URL

When working with a remote Supabase project, you will need to set the Supabase Callback URL.

Please set the callback URL in the Supabase project settings to the following URL:

`<url>/auth/callback`

Where `<url>` is the URL of your application.

## Contributing

Contributions are welcome! However, please open an issue first to discuss your ideas before making a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Support

This lite version has community support through GitHub issues. For dedicated support, priority fixes, and advanced features, check out our full version.
