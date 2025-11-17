# Project Backend - README

## Overview

This backend powers a collaborative platform connecting **Clients (organizations)**, **Supervisors (lecturers)**, **Students**, and **Universities** to manage projects, teams, and skills.
The system supports project creation, team management, skill matching, progress tracking, and messaging while enforcing role-based access and verification.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Roles & Permissions](#roles--permissions)
4. [Database Models](#database-models)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Authorization](#authentication--authorization)
7. [Development Setup](#development-setup)
8. [Testing](#testing)
9. [Future Enhancements](#future-enhancements)

---

## Tech Stack

- **Backend Framework:** NestJS (TypeScript)
- **Database:** Supabase (with Drizzle ORM)
- **Authentication:**
- **Real-time Communication:** WebSockets (for chat)
- **API Documentation:** Swagger / OpenAPI

---

## Architecture

- **Modular Structure:** Each module represents a functional domain (Users, Projects, Teams, Skills, Messaging).
- **Role-based Access Control (RBAC):** Ensures users can only access actions and resources specific to their role.
- **Service Layer:** Contains business logic for reusability and testability.
- **Repository Layer:** Abstracts database queries using Drizzle ORM.
- **Event-driven Communication:** For notifications, project updates, and team alerts.

---

## Roles & Permissions

| Role       | Permissions                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client     | Create/update/delete projects (pre-approval), view project matches, chat with supervisors, accept/decline supervisor interest, make offers, search teams.       |
| Supervisor | Add/edit/view/delete teams, manage team members and roles, view projects matched to teams, grade students, communicate with clients, indicate project interest. |
| Student    | View matched projects, notify supervisor of interest, write weekly reports, team lead messaging privilege (if allowed).                                         |
| University | Superuser access: manage supervisors/students, assign employment/graduation status, handle payments.                                                            |

---

## Database Models

### Core Entities

---

## API Endpoints (Sample Overview)

### Client Routes

### Supervisor Routes

### Student Routes

### University Routes

---

## Authentication & Authorization

---

## Development Setup

1. **Clone repository**

```bash
git clone <repo_url>
cd backend
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Configure environment variables**

```env
DATABASE_URL=postgres://user:password@localhost:5432/dbname
JWT_SECRET=supersecret
```

4. **Run migrations**

```bash
pnpm drizzle-kit migrate
```

5. **Start development server**

```bash
pnpm run start:dev
```
