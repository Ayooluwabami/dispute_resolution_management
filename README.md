# Dispute Resolution Microservice

A standalone microservice for handling dispute resolution and arbitration in an escrow system.

## Features

- Complete dispute lifecycle management
- Arbitration workflow with multi-party participation
- Comprehensive transaction history and audit trails
- Advanced filtering and searching
- Role-based access control
- RESTful API endpoints

## Tech Stack

- Restana (lightweight, high-performance REST framework)
- TypeScript
- Knex.js for MySQL migrations and queries
- JWT-based authentication
- Winston for logging

## Prerequisites

- Node.js v16 or later
- MySQL 5.7 or later

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your database and other configuration values
```

4. Run database migrations:

```bash
npm run migrate
```

5. (Optional) Seed the database with sample data:

```bash
npm run seed
```

6. Start the development server:

```bash
npm run dev
```

## API Documentation

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login and get authentication token
- `POST /api/v1/auth/logout` - Logout (client-side token invalidation)

### Transactions

- `GET /api/v1/transactions` - Get all transactions
- `GET /api/v1/transactions/:id` - Get a specific transaction
- `POST /api/v1/transactions` - Create a new transaction
- `PUT /api/v1/transactions/:id` - Update a transaction
- `GET /api/v1/transactions/search` - Search transactions with filters
- `GET /api/v1/transactions/stats` - Get transaction statistics

### Disputes

- `GET /api/v1/disputes` - Get all disputes
- `GET /api/v1/disputes/my` - Get disputes for the current user
- `GET /api/v1/disputes/:id` - Get a specific dispute
- `POST /api/v1/disputes` - Create a new dispute
- `PUT /api/v1/disputes/:id` - Update a dispute
- `POST /api/v1/disputes/:id/evidence` - Add evidence to a dispute
- `POST /api/v1/disputes/:id/comment` - Add a comment to a dispute
- `GET /api/v1/disputes/:id/history` - Get the history of a dispute
- `POST /api/v1/disputes/:id/cancel` - Cancel a dispute
- `GET /api/v1/disputes/stats` - Get dispute statistics

### Arbitration

- `GET /api/v1/arbitration/cases` - Get cases for arbitration
- `GET /api/v1/arbitration/cases/:id` - Get a specific arbitration case
- `POST /api/v1/arbitration/cases/:id/assign` - Assign an arbitrator to a case
- `POST /api/v1/arbitration/cases/:id/review` - Start reviewing a case
- `POST /api/v1/arbitration/cases/:id/resolve` - Resolve a case
- `GET /api/v1/arbitration/stats` - Get arbitration statistics

## Roles and Permissions

- **Admin**: Full access to all resources and actions
- **Arbitrator**: Review and resolve disputes
- **User**: Create and manage their own disputes

## License

[MIT](LICENSE)