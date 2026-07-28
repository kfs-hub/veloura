# VELOURA DOTS 🎨✨
> **Hand-Painted Mandala Studio Website & Bespoke Commission Platform**

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=flat&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.19-000000?style=flat&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v8.22-4169E1?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)

**Veloura Dots** is a full-stack boutique art studio web application designed for artisanal hand-painted dot mandalas. The application features a client-facing interactive commission builder, real-time reference ID tracking, showcase product catalog, automated transactional email alerts, and a password-protected studio admin portal with multi-format storage (PostgreSQL with local JSON fallback).

---

## 🌟 Key Features

- 🎨 **Interactive Custom Commission Portal**: Allows clients to select surface materials (gallery canvas, ceramic mugs, stainless steel flasks, wooden keepsake boxes, custom objects), dimension sizes, curated color palettes, vision text, and upload up to 5 reference moodboard images.
- 🔍 **Real-Time Ref ID Lookup**: Client lookup system using unique reference numbers (`VEL-XXXXXX`) to instantly check order status and details.
- 📦 **Dynamic Showcase Catalog**: Categorized product gallery showcasing ready-to-ship and custom mandala art objects.
- 🛡️ **Studio Admin Portal**: Password-protected admin dashboard (`admin.html`) with passcode verification (`x-admin-passcode`), allowing studio artists to review pending inquiries, inspect reference attachments, update status workflows (`PENDING_REVIEW` → `IN_PROGRESS` → `COMPLETED`), and filter/search clients.
- 🗄️ **Hybrid Database Architecture**: Built with native PostgreSQL persistence and automatic local JSON database fallback (`data/db.json`) if PostgreSQL is offline or unconfigured.
- 📧 **Automated Transactional Emails**: Asynchronous dual notification system (client receipt + studio alert) powered by Nodemailer.

---

## 🏗️ Project Architecture

```
veloura/
├── admin.html              # Studio Admin Portal Interface
├── index.html              # Main Client Portfolio & Commission Portal
├── server.js               # Main Express HTTP & REST API Server
├── db.js                   # PostgreSQL & JSON Fallback Database Layer
├── .env.example            # Environment Configuration Template
├── .gitignore              # Git Ignore Rules
├── LICENSE                 # MIT License
├── package.json            # Node Dependencies & Package Scripts
├── css/                    # Modular Stylesheets
├── js/                     # Client-side Interactive Logic & API Integration
├── services/
│   └── email.js            # Nodemailer Email Service Module
├── scripts/
│   ├── setup-db.js         # Database Table Initialization & Seed Script
│   └── migrate-json-to-pg.js # JSON DB to PostgreSQL Migration Utility
├── showcase images/        # Catalog Showcase High-Res Media
├── uploads/                # Dynamic Storage for Client Reference Images
└── data/                   # Local Dev JSON DB Fallback Storage
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes bundled with Node.js)
- **PostgreSQL** (optional; server defaults to local `data/db.json` if PostgreSQL is not running)

### 1. Installation
Clone the repository and install npm dependencies:

```bash
git clone https://github.com/your-username/veloura.git
cd veloura
npm install
```

### 2. Environment Configuration
Copy `.env.example` to create your local `.env` configuration file:

```bash
cp .env.example .env
```

Open `.env` and set your desired configuration:
```env
PORT=5500
ADMIN_PASSCODE=veloura2026
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/veloura_dots
```

### 3. Database Setup (Optional for PostgreSQL)
If using PostgreSQL, initialize the database tables and seed sample showcase products:

```bash
npm run db:setup
```

*(If PostgreSQL is not configured, the app will auto-create and run seamlessly on `data/db.json`.)*

### 4. Run Development Server
Start the Express server with live reload:

```bash
npm run dev
```

Or run standard production start:

```bash
npm start
```

Open your browser and navigate to:
- **Client App**: [http://localhost:5500](http://localhost:5500)
- **Admin Portal**: [http://localhost:5500/admin.html](http://localhost:5500/admin.html)

---

## 📑 API Endpoints Summary

### Public Client Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/commissions` | Submit a custom commission inquiry with optional image uploads |
| `GET` | `/api/commissions/:refId` | Fetch commission details by unique Reference ID |
| `GET` | `/api/products` | Get showcase product catalog (optional `?category=canvas`) |

### Admin Endpoints (Passcode Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/admin/verify` | Authenticate admin passcode |
| `GET` | `/api/admin/commissions` | Fetch all commissions with status counts |
| `PATCH` | `/api/admin/commissions/:id/status` | Update commission status (`PENDING_REVIEW`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) |
| `DELETE` | `/api/admin/commissions/:id` | Delete commission record |

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom design system, glassmorphism, responsive grid), Modern JavaScript (ES6+ async/await, Fetch API)
- **Backend**: Node.js, Express.js, Multer (file upload handling), Cors, Dotenv
- **Database**: PostgreSQL (`pg` driver) with auto-detecting JSON DB fallback
- **Email Service**: Nodemailer (SMTP integration with HTML templates)

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.
