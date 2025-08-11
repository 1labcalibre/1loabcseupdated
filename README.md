# Certificate of Analysis Management System

A comprehensive web application for managing Certificate of Analysis (CoA) generation for Calibre Specialty Elastomers India Pvt. Ltd.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ installed
- npm or pnpm package manager

### Installation & Running

1. **Navigate to project directory:**
```bash
   cd calibreproject
   ```

2. **Install dependencies:**
   ```bash
   npx pnpm install
   # or
   npm install
   ```

3. **Run the development server:**
```bash
   npx pnpm dev
   # or
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Features

### Core Functionality
- **Test Data Entry**: Lab assistants can enter test results for various product parameters
- **Batch Selection**: Group multiple batches and calculate statistical values (Min, Mean, Max)
- **Certificate Generation**: Automatically generate Certificates of Analysis with test results
- **Product Management**: Manage 25+ products with customizable test parameters
- **User Management**: Role-based access control with 4 levels of permissions

### User Roles & Permissions

1. **Level 1 (L1) - MD/RND**
   - Full system access
   - Approve product specification changes
   - Receive email notifications for changes
   - Approve edit requests from L2 users

2. **Level 2 (L2) - Lab In-charge**
   - Input test results
   - Request edits (requires L1 approval)
   - Generate certificates

3. **Level 3 (L3) - Data Input**
   - Basic data entry permissions
   - Limited access to system features

4. **View Only - Accounts/Sales**
   - Read-only access to certificates
   - View reports and analytics

## Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **UI Components**: Custom component library with Radix UI
- **Styling**: Tailwind CSS v4
- **Monorepo**: Turborepo for managing multiple packages
- **Package Manager**: pnpm

## Project Structure

```
calibreproject/
├── apps/
│   └── web/                 # Next.js web application
│       ├── app/             # App router pages
│       ├── components/      # React components
│       └── lib/             # Utility functions
├── packages/
│   ├── ui/                  # Shared UI component library
│   ├── eslint-config/       # Shared ESLint configuration
│   └── typescript-config/   # Shared TypeScript configuration
└── turbo.json              # Turborepo configuration
```

## Getting Started

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Run development server**
   ```bash
   pnpm dev
   ```

3. **Build for production**
   ```bash
   pnpm build
   ```

## Key Pages

- **Dashboard** (`/`): Overview of system statistics and recent activity
- **Test Entry** (`/test-entry`): Enter raw test data for products
- **Batch Selection** (`/batch-selection`): Select batches and view calculated statistics
- **Certificates** (`/certificates`): Generate and manage Certificates of Analysis
- **Products** (`/products`): Manage products and their test parameters
- **Users** (`/users`): User management and access control
- **Settings** (`/settings`): System configuration

## Workflow

1. **Test Data Entry**: Lab assistant enters test results for each specimen
2. **Batch Selection**: Multiple batches are grouped to form a LOT
3. **Statistics Calculation**: System calculates Min, Mean, Max for each parameter
4. **Certificate Generation**: Final Certificate of Analysis is generated with:
   - Customer information
   - Product details
   - Test results (obtained values from statistics)
   - Company information and signatures

## Future Enhancements

- Backend API integration
- Database implementation
- PDF generation for certificates
- Email notification system
- Audit trail and history tracking
- Advanced reporting and analytics
- Mobile responsive design
- Multi-language support

## Development Notes

This is a prototype implementation focusing on the UI/UX and workflow. The next steps would include:
- Setting up a backend API (Node.js/Express or Python/FastAPI)
- Implementing a database (PostgreSQL or MySQL)
- Adding authentication and authorization
- Integrating PDF generation for certificates
- Setting up email notifications
- Adding data validation and error handling
