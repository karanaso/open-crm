# Spec Delta

## Purpose

Record customer interactions and follow-up work on any CRM record so the team can see a chronological history and know what needs to happen next.

## ADDED Requirements

### Requirement: Activity logging

The system SHALL let active team members log activities of type note, call, email, or meeting. Each activity MUST include a type, subject, occurred-at time, author, and at least one linked company, contact, deal, ticket, or campaign. The occurred-at time MUST NOT be later than the current time. Body text MUST be optional and limited to 10,000 characters.

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

- **WHEN** a member logs a meeting linked to a company, a contact, and a deal
- **THEN** the activity appears on the timeline of all three records

### Requirement: Record timeline

Every company, contact, deal, ticket, and campaign detail page MUST show a combined timeline of its activities and completed tasks in reverse chronological order. The timeline MUST show type, subject, author, timestamp, and related-record links, and MUST support filtering by activity type and loading older entries.

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

- **WHEN** a task linked to a deal is completed
- **THEN** the deal timeline includes the completed task with its completion time

### Requirement: Activity editing and deletion

Authors MUST be able to edit the subject, body, and occurred-at time of their own activities, and delete their own activities. Administrators MUST be able to delete any activity. Changes MUST be reflected on every linked record timeline immediately.

#### Scenario: Author edits an activity

- **WHEN** an author changes the subject of their activity
- **THEN** the updated subject appears on every linked record timeline

#### Scenario: Other members cannot edit an activity

- **WHEN** a member tries to edit an activity authored by someone else
- **THEN** the system rejects the change

#### Scenario: Administrator deletes an activity

- **WHEN** an administrator deletes another member's activity
- **THEN** the activity disappears from all linked record timelines

### Requirement: Task creation

The system SHALL let active team members create tasks with a required title and due date, optional description and priority (low, normal, high), an assignee, and at least one linked record. Tasks MUST start in open status with the creator as the default assignee. New tasks MUST NOT have a due date before today.

#### Scenario: Task is created

- **WHEN** a member creates a task with a title, a future due date, and a linked contact
- **THEN** the system saves an open task assigned to the creator

#### Scenario: Task without a link is rejected

- **WHEN** a member submits a task with no linked record
- **THEN** the system rejects it and asks for at least one record

#### Scenario: Past due date is rejected

- **WHEN** a member creates a task with a due date before today
- **THEN** the system rejects the task and shows a due-date error

#### Scenario: Task is assigned to another member

- **WHEN** a member creates a task and selects an active teammate as assignee
- **THEN** the task is saved with that teammate as assignee

### Requirement: Task lifecycle

Tasks MUST support open and completed statuses. Completing a task MUST record the completing user and completion time; reopening MUST clear both. Any active team member MUST be able to reassign a task to another active member or leave it unassigned. A task whose due date is before today and remains open MUST be treated as overdue.

#### Scenario: Task is completed

- **WHEN** a member marks an open task complete
- **THEN** the system records the member and completion time and shows the task as completed

#### Scenario: Task is reopened

- **WHEN** a member reopens a completed task
- **THEN** the task returns to open and its completion user and time are cleared

#### Scenario: Task is reassigned

- **WHEN** a member changes a task's assignee to another active teammate
- **THEN** the task appears in the new assignee's task list

#### Scenario: Inactive assignee is rejected

- **WHEN** a member assigns a task to a deactivated user
- **THEN** the system rejects the assignment

#### Scenario: Overdue task is identified

- **WHEN** an open task's due date has passed
- **THEN** the task is shown as overdue in task lists and the dashboard

### Requirement: Task views

The system MUST provide a task page with "My tasks" and "All tasks" views. Open tasks MUST be grouped as overdue, due today, upcoming, and later, with completed tasks shown separately. Filters MUST include assignee, priority, status, and linked record type. Tasks MUST also appear on the detail page of every linked record.

#### Scenario: My tasks are grouped

- **WHEN** a member opens My tasks
- **THEN** their open tasks appear in overdue, due today, upcoming, and later groups

#### Scenario: Filters apply

- **WHEN** a member filters tasks by high priority and assignee
- **THEN** only matching tasks are listed

#### Scenario: Task appears on linked record

- **WHEN** a task is linked to a deal
- **THEN** the task appears on the deal detail page and links back to the task

#### Scenario: Completed tasks are separate

- **WHEN** a member views the task page
- **THEN** completed tasks are listed separately from open tasks

### Requirement: Task editing and deletion

Active team members MUST be able to edit a task's title, description, due date, priority, assignee, and linked records, and MUST be able to delete tasks. Deleting a task MUST remove it from all task lists and record timelines.

#### Scenario: Task details are edited

- **WHEN** a member changes a task's due date and priority
- **THEN** the updated values appear in task lists and on linked records

#### Scenario: Linked record is added

- **WHEN** a member links an existing task to a campaign
- **THEN** the task appears on the campaign detail page

#### Scenario: Task is deleted

- **WHEN** a member deletes a task
- **THEN** the task disappears from task lists, record timelines, and the dashboard
