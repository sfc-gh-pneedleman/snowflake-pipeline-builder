
#Buit with Snowflake Sortex Code
* Snowflake ETL Builder is a visual, no-code/low-code web application that lets users:

  1. Design data pipelines visually — Drag-and-drop ETL nodes (sources, transformations, destinations) onto a canvas and connect them to build Snowflake data workflows
  2. Connect to Snowflake — Authenticate via password or SSO to browse databases, schemas, tables, and stages
  3. Generate SQL automatically — The app produces deployment-ready Snowflake SQL (for tasks, dynamic tables, COPY INTO statements, etc.) from the visual pipeline
  4. Save, load, import/export pipelines — Pipelines persist locally and can be exported as JSON files
  5. Schedule pipelines — A scheduler page lets users configure recurring execution via Snowflake Tasks

---
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
