# ShopSense: Vendor Hub

Build a full-stack web application called "ShopSense", a modern Vendor Management System.

UI/UX

 The first page should be a premium Login / Sign Up page with a clean, modern SaaS design (must look handcrafted, not AI-generated).

 After successful authentication, redirect the user to a Dashboard matching the attached reference images as closely as possible (layout, sidebar, cards, colors, spacing, navbar, and responsiveness).

 The left sidebar must contain fully functional pages:

 Dashboard

 Vendors

 Products

 Analytics

 Reports

 Approvals

 Settings

 Every page should have a complete UI with real CRUD functionality, loading states, search, filters, pagination, responsive design, and smooth animations.

Backend Requirements

 Design a normalized database schema for:

 Vendors

 Products

 Customers

 Transactions

 Build REST APIs for:

 Vendor Registration & Profile Management

 Product CRUD

 Customer CRUD

 Transaction CRUD

 Dashboard Statistics

 Create endpoints to calculate:

 Total Sales

 Revenue by Vendor

 Product Count

 Vendor Count

 Add proper input validation and error handling.

Authentication & Authorization

 Implement secure JWT Authentication.

 Use Role-Based Access Control (RBAC):

Admin: Full access.

Vendor: Can manage only their own profile, products, and transactions.

 Protect all private routes.

AI Features

 When a vendor uploads a product, use an LLM (OpenAI/Gemini) to automatically generate:

 SEO-friendly product description

 Product tags

 Product keywords

 On image upload, use a Vision API to automatically:

 Categorize the product

 Generate image tags

Tech Stack

 Frontend: React + Tailwind CSS

 Backend: Node.js + Express.js

 Database: MongoDB (Mongoose)

 Authentication: JWT + bcrypt

 Charts: Recharts/Chart.js

 State Management: Context API or Redux Toolkit

Final Goal

Create a production-ready, enterprise-grade Vendor Management SaaS with clean architecture, reusable components, responsive UI, professional code structure, and a polished user experience that closely matches the attached dashboard design.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b8417954-d45e-461c-8c04-8df75f92882f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
