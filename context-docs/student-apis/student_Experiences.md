# Student Experiences Page Business Rules

## 1. Page Intent & Scope

- Present students’ experiential learning catalog (created by them or shared) and detailed view for each experience, aligning with GradLinq’s portfolio-building goals.
- Support lifecycle management (draft vs published), visibility controls, and mapping to recommended projects.

## 2. Access & Context Requirements

- **Authentication**: Validate Appwrite sessionId via `AuthModule`. Invalid sessions return `ERR_3002`.
- **Context**: `ContextModule` must expose `studentId`, `universityId`, `program`, and `role`. Missing `studentId` raises `ERR_3000`.
- **Authorization**: Students can view/edit only experiences where they are owner or have shared access. Cross-student access returns `ERR_5002`.

## 3. Top-Level Layout

### 3.1 Header & Controls

- **What should happen**: Display page title "Experiences", helper text, filter tabs (`Created by me`, `Shared with me`, `All Experiences`), search input, view toggle (grid/list), and `+ Create experience` button.
- **How**:
  - Tabs translate into filter parameters on GraphQL query.
  - Search triggers filtered query by title/creator.
  - Create button opens new experience flow (modal/page) using REST `POST /students/{studentId}/experiences`.
- **Frontend expects**:

```json
{
  "filters": ["CREATED", "SHARED", "ALL"],
  "activeFilter": "CREATED",
  "canCreate": true
}
```

- **Business rules**:
  - Creation limited to students with `role = STUDENT` and within draft cap (max 5 drafts). Exceeding returns `ERR_5003`.

### 3.2 Experiences Grid View (Card Layout)

- **What should happen**: Show cards with title, course code, university, summary, skill tags, status badge (`Draft`/`Published`), and date range.
- **How**: GraphQL `studentExperiences(studentId, filter, view)` returns card data.
- **Frontend expects**:

```json
{
  "id": "exp-uuid",
  "title": "Applied Machine Learning and AI Solutions",
  "courseCode": "BSE 291",
  "university": "Mountain Top University",
  "summary": "Mrkt360 is seeking to expand its client base...",
  "skills": ["UX Design", "Figma", "Design System"],
  "status": "DRAFT",
  "startDate": "2025-05-12",
  "endDate": "2025-05-12",
  "matchesCount": 3,
  "tags": ["Placeholder", "+3"]
}
```

- **Business rules**:
  - Status badge color-coded by state: `DRAFT` (gray) vs `PUBLISHED` (blue/purple as per design).
  - `matchesCount` shown only when >0; precomputed by `ProjectMatchService` linking experiences to project recommendations.

### 3.3 Experiences List View (Table Layout)

- **What should happen**: Provide table with columns Name, Status, Created By, Date Created, End Date, Matches (link to detail).
- **How**: Same GraphQL query with `view = LIST`; backend returns minimal dataset.
- **Frontend expects**:

```json
{
  "rows": [
    {
      "id": "exp-uuid",
      "name": "Applied Machine Learning and AI Solutions",
      "status": "DRAFT",
      "createdBy": "Dr. Chioma",
      "createdAt": "2025-04-24",
      "endDate": "2025-09-30",
      "matchesUrl": "/experiences/exp-uuid/matches"
    }
  ]
}
```

- **Business rules**:
  - Rows default sorted by `createdAt desc`; allow sort toggles via request parameter `sort`.

## 4. Experience Detail View (Overview Tab)

- **What should happen**: Show hero section with title, code, duration, tags, navigation tabs (`Overview`, `Members`, `Match request`, `About institution`), Experience overview text, Learner requirements, Expected outcomes, Requirements, Project examples, Main contact card, Recommended projects.
- **How**:
  - GraphQL `studentExperienceDetail(experienceId, studentId)` returns structured data.
  - Tabs map to nested resolvers (e.g., `members`, `matchRequest`, `institution`).
- **Frontend expects**:

```json
{
  "experience": {
    "id": "exp-uuid",
    "title": "Data Analysis with Illustration",
    "code": "CSC 202",
    "duration": {
      "start": "2024-02-01",
      "end": "2024-05-10",
      "weeks": 10
    },
    "tags": ["Placeholder", "Placeholder"],
    "status": "PUBLISHED",
    "overview": "This comprehensive experience combines ...",
    "learners": [
      { "label": "Team lead", "value": "Yes" },
      { "label": "Skill level", "value": "Intermediate" },
      { "label": "Total Students", "value": 50 }
    ],
    "requirements": {
      "companyPreferences": {
        "location": "Lagos",
        "industry": "Finance"
      },
      "prerequisites": ["Statistics", "Introduction to Programming"]
    },
    "expectedOutcomes": ["Code repository", "Business Plan"],
    "projectExamples": ["data science", "business strategy"],
    "mainContact": {
      "name": "David Ashimolowo",
      "role": "Senior Lecturer",
      "email": "david@mtu.edu.ng",
      "institution": "Mountain Top University",
      "location": "Paiko, Ogun State"
    },
    "recommendedProjects": [
      /* project card schema from `student_Project_Feed.md` */
    ]
  }
}
```

- **Business rules**:
  - Only published experiences include `recommendedProjects`; drafts display empty state with guidance to publish first.
  - `Match request` tab uses existing project-match workflow; when clicked, make REST `POST /experiences/{experienceId}/match-request` to notify supervisors.
  - Duration automatically computed; manual edits allowed only on draft.

## 5. Members Tab

- **What should happen**: Display list/grid of members with avatar, name, email, role (e.g., Student, Supervisor).
- **How**: GraphQL `experience.members` retrieving `StudentExperienceParticipant` records.
- **Frontend expects**:

```json
{
  "members": [
    {
      "id": "student-uuid",
      "name": "David Ashimolowo",
      "email": "isrealibk@mtu.edu.ng",
      "role": "STUDENT",
      "status": "ACTIVE"
    }
  ]
}
```

- **Business rules**:
  - Invite action available only to supervisors/leads with permission; triggers `POST /experiences/{experienceId}/invites`.
  - Students can leave only if experience status `DRAFT` or `PUBLISHED` with supervisor approval; otherwise return `ERR_5001`.

## 6. Match Request Tab

- **What should happen**: Provide controls to submit match request connecting experience to projects (per UI hint).
- **How**:
  - Display current request status (Pending/Approved/Denied) from `ExperienceMatchRequest` entity.
  - Submit button posts to existing `ProjectMatchService` endpoint `POST /experiences/{experienceId}/matches`.
- **Frontend expects**:

```json
{
  "matchRequest": {
    "status": "PENDING",
    "submittedAt": "2025-05-01T12:00:00Z",
    "requestedBy": "David Ashimolowo"
  }
}
```

- **Business rules**:
  - Only published experiences can send match requests; attempt from draft returns `ERR_5000`.
  - Status changes trigger notifications via `NotificationModule` to student and supervisor.

## 7. About Institution Tab

- **What should happen**: Summarize institution details (name, department, location, description) tied to experience.
- **How**: GraphQL `experience.institution` referencing university records.
- **Frontend expects**:

```json
{
  "institution": {
    "name": "Mountain Top University",
    "department": "Computer Science",
    "location": "Ogun State",
    "description": "Institution overview copy"
  }
}
```

- **Business rules**:
  - Data read-only; any updates go through university admin flows, not student UI.

## 8. Mutations & Lifecycle

- **Create Experience**: `POST /students/{studentId}/experiences` body includes title, overview, dates, tags, prerequisites. Returns `status: DRAFT`.
- **Update Experience**: `PATCH /students/{studentId}/experiences/{experienceId}` for drafts or authorized edits.
- **Publish Experience**: `POST /students/{studentId}/experiences/{experienceId}/publish`. Validations ensure required fields (overview, outcomes, contacts) filled; missing fields return `ERR_2000`.
- **Archive Experience**: `POST /students/{studentId}/experiences/{experienceId}/archive` sets status `ARCHIVED`, removing from default lists.
- **Delete Draft**: `DELETE /students/{studentId}/experiences/{experienceId}` permitted for drafts only.

## 9. Frontend Data Contracts & Limits

- Status enums: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- Dates ISO8601 (YYYY-MM-DD). Durations computed server-side (weeks as integer).
- `skills` maximum 6 tags; additional aggregated as `+n` label.
- `projectExamples` limited to 6 bullet points.
- `recommendedProjects` reuse schema from `student_Project_Feed.md` limited to 3 items.

## 10. Business Constraints & Validation

- Students cannot publish more than 10 experiences. Attempt returns `ERR_5003`.
- Experiences must align with university program; backend verifies `experience.programId === context.programId` unless shared externally.
- Editing shared experiences limited to owners and supervisors with permission flag; other viewers have read-only access.
- Notifications:
  - Publish success emits `NotificationType.SUCCESS` to student.
  - Match request submitted emits `NotificationType.UPDATE` to supervisors.
  - Status changes propagate to dashboard experiences widget.
- Error responses follow `ErrorModule` format with `correlationId`.

## 11. Empty States & Feedback

- When no experiences match filters, API returns empty array and `counts.total = 0`; front end shows empty illustration with CTA to create or request shared access.
- Create action should guide to form capturing overview, learners, outcomes, requirements per design; backend stores in `StudentExperience` schema.

## 12. Dependencies & Navigation

- Sidebar navigation consistent with `student_user_dashboard.md`.
- Recommended projects link uses route `/projects/recommended?source=experience&experienceId=...` leveraging same GraphQL fragments defined in `student_Project_Feed.md`.
- Breadcrumb `Experiences` > `Experience detail` uses existing routing conventions.
