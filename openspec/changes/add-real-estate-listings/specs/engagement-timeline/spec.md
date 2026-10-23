# Spec Delta

## MODIFIED Requirements

### Requirement: Activity logging

The system SHALL let active team members log activities of type note, call, email, or meeting. Each activity MUST include a type, subject, occurred-at time, author, and at least one linked company, contact, deal, listing, ticket, or campaign. The occurred-at time MUST NOT be later than the current time. Body text MUST be optional and limited to 10,000 characters.

#### Scenario: Call is logged

- **WHEN** a member logs a call with a subject and links it to a contact
- **THEN** the system saves the activity with the member as author and shows it on the contact timeline

#### Scenario: Future time is rejected

- **WHEN** a member submits an activity with an occurred-at time in the future
- **THEN** the system rejects the activity and shows a time error

#### Scenario: Activity without a link is rejected

- **WHEN** a member submits an activity with no linked record
- **THEN** the system rejects the activity and asks for at least one record

#### Scenario: Activity links to multiple records

- **WHEN** a member logs a meeting linked to a company, a contact, a listing, and a deal
- **THEN** the activity appears on the timeline of all four records

### Requirement: Record timeline

Every company, contact, deal, listing, ticket, and campaign detail page MUST show a combined timeline of its activities and completed tasks in reverse chronological order. The timeline MUST show type, subject, author, timestamp, and related-record links, and MUST support filtering by activity type and loading older entries.

#### Scenario: Newest entries appear first

- **WHEN** a record has activities from several dates
- **THEN** the most recent entry appears at the top of its timeline

#### Scenario: Timeline filters by type

- **WHEN** a member filters a timeline to calls
- **THEN** only call activities are shown and completed tasks are hidden

#### Scenario: Older entries load

- **WHEN** a timeline has more entries than the initial page
- **THEN** the member can load older entries without leaving the record

#### Scenario: Completed task appears on the timeline

- **WHEN** a task linked to a listing is completed
- **THEN** the listing timeline includes the completed task with its completion time

### Requirement: Task creation

The system SHALL let active team members create tasks with a required title and due date, optional description and priority (low, normal, high), an assignee, and at least one linked record. Tasks MUST start in open status with the creator as the default assignee. New tasks MUST NOT have a due date before today.

#### Scenario: Task is created

- **WHEN** a member creates a task with a title, a future due date, and a linked contact
- **THEN** the system saves an open task assigned to the creator

#### Scenario: Task without a link is rejected

- **WHEN** a member submits a task with no linked record
- **THEN** the system rejects it and asks for at least one record

#### Scenario: Task links to a listing

- **WHEN** a member creates a task with a listing link
- **THEN** the task appears on the listing detail page

#### Scenario: Past due date is rejected

- **WHEN** a member creates a task with a due date before today
- **THEN** the system rejects the task and shows a due-date error

#### Scenario: Task is assigned to another member

- **WHEN** a member creates a task and selects an active teammate as assignee
- **THEN** the task is saved with that teammate as assignee

### Requirement: Task views

The system MUST provide a task page with "My tasks" and "All tasks" views. Open tasks MUST be grouped as overdue, due today, upcoming, and later, with completed tasks shown separately. Filters MUST include assignee, priority, status, and linked record type, including listings. Tasks MUST also appear on the detail page of every linked record.

#### Scenario: My tasks are grouped

- **WHEN** a member opens My tasks
- **THEN** their open tasks appear in overdue, due today, upcoming, and later groups

#### Scenario: Filters apply

- **WHEN** a member filters tasks by high priority, assignee, and listing record type
- **THEN** only matching tasks are listed

#### Scenario: Task appears on linked record

- **WHEN** a task is linked to a listing
- **THEN** the task appears on the listing detail page and links back to the task

#### Scenario: Completed tasks are separate

- **WHEN** a member views the task page
- **THEN** completed tasks are listed separately from open tasks

### Requirement: Task editing and deletion

Active team members MUST be able to edit a task's title, description, due date, priority, assignee, and linked records, including adding or removing a listing link, and MUST be able to delete tasks. Deleting a task MUST remove it from all task lists and record timelines.

#### Scenario: Task details are edited

- **WHEN** a member changes a task's due date and priority
- **THEN** the updated values appear in task lists and on linked records

#### Scenario: Linked record is added

- **WHEN** a member links an existing task to a listing
- **THEN** the task appears on the listing detail page

#### Scenario: Linked record is removed

- **WHEN** a member removes the listing link from a task that has another linked record
- **THEN** the task no longer appears on the listing but remains on the other record

#### Scenario: Task is deleted

- **WHEN** a member deletes a task
- **THEN** the task disappears from task lists, record timelines, and the dashboard
