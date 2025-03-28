# Task Management API

A RESTful API for a task management application with user authentication. Allows users to create, read, update, and delete tasks, with both email/password and Google authentication.

## Features

- User authentication with JWT
  - Email/password login
  - Google OAuth integration
- Task management
  - Create, read, update, delete tasks
  - Filter tasks based on various criteria
  - User-specific task isolation (users can only see their own tasks)
- MongoDB database for data storage
- RESTful API design

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- Google OAuth for social login

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- Google Developer Console account (for Google OAuth)

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:

   ```
   cp .env.example .env
   ```

4. Edit the `.env` file with your configuration

5. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login with email/password
- `POST /api/users/google` - Login/register with Google
- `GET /api/users/me` - Get current user profile

### Tasks

- `GET /api/tasks/user` - Get all tasks for the authenticated user
- `GET /api/tasks` - Query tasks with filters
- `GET /api/tasks/:id` - Get a specific task by ID
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

## Authentication Flow

### Email/Password Authentication

1. User registers with email/password
2. Backend hashes the password and stores user in the database
3. User logs in with email/password
4. Backend verifies credentials and issues a JWT token
5. Client includes the token in the Authorization header for authenticated requests

### Google Authentication

1. User clicks Google login button in frontend
2. Google OAuth popup/redirect flow occurs
3. Frontend sends Google ID token to backend
4. Backend verifies the token with Google
5. If the user exists, they are logged in; if not, a new account is created
6. Backend issues a JWT token for authenticated requests

## Data Models

### User Model

```javascript
{
  name: String,
  email: String,
  password: String, // Hashed, not required if using Google Auth
  googleId: String, // Only for Google Auth users
  profilePicture: String,
  refreshToken: String,
  createdAt: Number,
  lastLogin: Number,
  active: Boolean
}
```

### Task Model

```javascript
{
  title: String,
  description: String,
  status: String, // 'todo', 'in progress', 'pending', 'done'
  createdAt: Number,
  startTime: Number,
  endTime: Number,
  priority: Number,
  recursion: {
    frequency: String, // 'daily', 'weekly', 'monthly', 'yearly'
    interval: Number,
    endDate: Number
  },
  userId: ObjectId, // Reference to User
  note: String,
  isBacklog: Boolean,
  skipped: Boolean,
  planPeriod: String,
  tag: String
}
```

## Security

- Password hashing with bcrypt
- JWT tokens for API authentication
- Google OAuth integration for secure social login
- User data isolation ensures users can only access their own data

## License

This project is licensed under the ISC License.
