# Student Inbox Flow Business Rules

## 1. Scope & Intent

- Provide authenticated students with a unified space to view team conversations, respond to project-related messages, and inspect team context without leaving the inbox.
- Respect GradLinq domain constraints around supervisor permissions, team roles, and notifications when interacting with messaging.

## 2. Access & Context Requirements

- **Authentication**: Session validated via `AuthModule`. Invalid sessions return `ERR_3002`.
- **Context**: `ContextModule` must expose `studentId`, `teamIds`, `role`, `universityId`, and `messagingPermissions`. Missing `studentId` triggers `ERR_3000`.
- **Authorization**: Student can fetch only threads linked to teams they belong to. Unauthorized access returns `ERR_5002`.
- **Notifications link**: WebSocket `/notify` namespace handshake requires same session; failures emit `NotificationType.ERROR` "Unauthorized".

## 3. Inbox Layout Components

### 3.1 Sidebar Navigation (From `student_user_dashboard.md`)

- Inherits global sidebar; no additional backend work beyond dashboard rules.

### 3.2 Inbox Header

- **What should happen**: Display inbox title, filter tabs (`All`, `Unread`, `Archived`), search bar, and match request button.
- **How**:
  - Filters call GraphQL query with status parameter.
  - Match request button opens existing project match endpoint (`POST /projects/{projectId}/matches/{matchId}/accept|decline`). No new backend logic.
- **Endpoints**:
  - GraphQL: `studentInbox(studentId: ID!, filter: InboxFilterInput)`.
- **Frontend expects**:

```json
{
  "filters": ["ALL", "UNREAD", "ARCHIVED"],
  "activeFilter": "ALL",
  "unreadCount": 3
}
```

### 3.3 Thread List Panel (Left Column)

- **What should happen**: Render list of team threads with snippet preview, timestamp, unread indicator, and team badge.
- **How**:
  - Fetch via GraphQL resolver `studentInbox.threads` limited to 20 items.
  - Resolver sources data from `TeamThreadService` filtered by `studentId` and `filter` (All/Unread/Archived).
  - Unread indicator based on `lastReadAt` vs `lastMessageAt`.
- **Endpoints**:
  - GraphQL: `threads(limit, filter)` returning `ThreadSummary` objects.
  - REST: `PATCH /teams/{teamId}/threads/{threadId}/read` to mark as read.
- **Frontend expects**:

```json
{
  "id": "thread-uuid",
  "teamId": "team-uuid",
  "teamName": "#team-alpha",
  "preview": "Mkt360 is seeking to expand its client base...",
  "lastMessageAt": "2025-05-24T12:15:00Z",
  "unread": true,
  "lastSenderInitials": "SL"
}
```

- **Business rules**:
  - Archived filter shows threads where `archivedByStudent = true`.
  - Archiving a thread uses `PATCH /teams/{teamId}/threads/{threadId}` body `{ archived: true }` and removes from All/Unread views.

### 3.4 Conversation Panel (Center)

- **What should happen**: Show chronological messages with sender avatar, timestamp, and attachments.
- **How**:
  - GraphQL field `studentInbox.activeThread(threadId)` returns full conversation with pagination (default last 30 messages).
  - Real-time updates via WebSocket channel `thread:{threadId}`.
  - Messages posted through REST `POST /teams/{teamId}/threads/{threadId}/messages`.
- **Frontend expects**:

```json
{
  "id": "message-uuid",
  "sender": {
    "id": "user-uuid",
    "name": "David Ashimolowo",
    "avatarUrl": "/avatars/david.png",
    "role": "STUDENT"
  },
  "body": "Lorem ipsum dolor sit amet...",
  "createdAt": "2025-05-24T12:15:00Z",
  "attachments": [],
  "isSystem": false
}
```

- **Business rules**:
  - Students may send messages only if `TeamAssignment.status = ACTIVE` and not muted by supervisor; otherwise `ERR_5002`.
  - Messaging client/supervisor requires `MessagingPermission.isGranted`. When false, disable send action and return `ERR_5000` on attempt.
  - System messages (e.g., "#team-alpha was created") flagged `isSystem = true` and sourced from `TeamEventService`.
  - Max message length 2000 characters; validation errors return `ERR_2000`.

### 3.5 Composer Bar

- **What should happen**: Allow text input, attachments, and quick status updates (project update toggle from UI hint).
- **How**:
  - Text submission -> REST `POST /teams/{teamId}/threads/{threadId}/messages` with `type: "TEXT"`.
  - Project updates flagged `type: "PROJECT_UPDATE"`, requiring `TeamLead` role.
  - Attachments uploaded via `POST /files` (existing system) returning file IDs attached in message payload.
- **Frontend expects**:

```json
{
  "body": "Type your message or send project update...",
  "allowedTypes": ["TEXT", "PROJECT_UPDATE"],
  "maxAttachments": 3,
  "maxSizeMb": 10
}
```

- **Business rules**:
  - `PROJECT_UPDATE` messages auto-post summary to project overview via internal event.
  - Non-leads attempting `PROJECT_UPDATE` get `ERR_5000`.
  - Attachments scanned for viruses; failures return `ERR_6001`.

### 3.6 Team Context Drawer (Right Panel)

- **What should happen**: Provide tabs `About`, `Members`, `Experience` with relevant project and team metadata.
- **How**:
  - GraphQL field `studentInbox.teamContext(teamId)` returning subfields per tab.
  - Data sources: `ProjectService` (title, overview), `TeamAssignmentService` (members), `ExperienceService` (linked school experience).
- **Endpoints**:
  - GraphQL: `teamContext` returning

```graphql
{
  about {
    projectTitle
    projectOverview
  }
  members {
    id
    name
    email
    role
    onlineStatus
  }
  experience {
    universityName
    programName
    createdBy
    createdAt
  }
}
```

- REST (actions): `POST /teams/{teamId}/leave` for "Leave team" button (visible to non-leads when allowed).
- **Frontend expects**:

```json
{
  "teamName": "#team-alpha",
  "university": "Mountain Top University",
  "about": {
    "projectTitle": "It Depends Project",
    "projectOverview": "Lorem ipsum..."
  },
  "members": [
    {
      "id": "student-uuid",
      "name": "David Ashimolowo",
      "email": "isrealibk@mtu.edu.ng",
      "role": "STUDENT",
      "onlineStatus": "ONLINE"
    }
  ],
  "experience": {
    "programName": "Artificial Intelligence Core",
    "createdBy": "Professor Chinwe Peace",
    "createdAt": "2026-05-24T00:00:00Z"
  }
}
```

- **Business rules**:
  - Member list limited to active participants; inactive members flagged `role = "ALUMNI"` and hidden by default.
  - "Invite member" button visible only to supervisors or leads with invite permission; clicking triggers `POST /teams/{teamId}/invites` (existing).
  - "Leave team" disabled for leads unless supervisor approves; backend returns `ERR_5001` otherwise.

### 3.7 Search Function

- **What should happen**: Filter thread list by team or organization name.
- **How**: GraphQL `studentInbox.search(term)` returning thread IDs; client applies filter locally.
- **Frontend expects**: `{ threadIds: ["thread-1", "thread-2"] }`.

## 4. Real-time & Notifications

- Incoming messages broadcast through WebSocket channel `thread:{threadId}` using `NotificationModule` `NotificationType.UPDATE`.
- Unread badge increments on client; backend updates `StudentNotification` store.
- Supervisor mentions (`@Dr. Peace`) convert to targeted notifications via `NotificationModule.broadcast('user:{userId}')`.

## 5. Error Handling

- Use `ErrorModule` response format with `correlationId`.
- Common codes:
  - `ERR_3000` Unauthorized student.
  - `ERR_4000` Thread not found or not accessible.
  - `ERR_5000` Permission denied for action (project update, messaging client).
  - `ERR_2000` Validation (message length, empty body).

## 6. Data Contracts & Limits

- All timestamps ISO8601 UTC.
- Message pagination uses cursor (`beforeMessageId`) to fetch older history via `GET /teams/{teamId}/threads/{threadId}/messages?before=`.
- Unread limit: list surfaces max 99; client shows "99+" beyond.
- Message attachments accept file types: PDF, PNG, JPG, DOCX.

## 7. Derivations & Automations

- System-generated banner messages (e.g., creation info) stored with `type: SYSTEM_EVENT` and non-editable.
- Marking thread as read automatically syncs `unreadCount` in dashboard (`student_user_dashboard.md`).
- Leaving a team archives thread for that student and emits `NotificationType.INFO` to remaining members.

## 8. Dependencies & Navigation

- Selecting "Match request" navigates to `discover projects` as per sitemap; reuse existing `ProjectMatch` endpoints.
- "Learn more" link in About tab opens project overview page (`/projects/{projectId}`) using same GraphQL fragments as dashboard.
- Sidebar navigation consistent with dashboard; no additional backend integration required.
