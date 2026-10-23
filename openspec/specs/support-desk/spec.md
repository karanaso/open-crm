# support-desk Specification

## Purpose

Track customer support requests from intake to resolution with clear ownership, priority, and response-time expectations.

## Requirements

### Requirement: Ticket creation

The system SHALL let active team members create tickets with a required subject, description, requester contact, and priority, plus an optional assignee. Priority MUST be urgent, high, normal, or low and defaults to normal. New tickets MUST start in open status, record the creator and creation time, and use the requester's current company as the ticket company.

#### Scenario: Ticket is created

- **WHEN** a member submits a subject, description, and requester contact
- **THEN** the system creates an open ticket with normal priority and the creator recorded

#### Scenario: Requester is required

- **WHEN** a member submits a ticket without a requester contact
- **THEN** the system rejects the ticket and asks for a requester

#### Scenario: Company is derived from the requester

- **WHEN** a ticket is created for a contact who belongs to a company
- **THEN** the ticket shows that company without requiring a separate company selection

#### Scenario: Ticket starts unassigned

- **WHEN** a member creates a ticket without choosing an assignee
- **THEN** the ticket is saved as unassigned

### Requirement: Ticket lifecycle

Tickets MUST support open, in_progress, pending, resolved, and closed statuses. Allowed transitions MUST be: open to any other status; in_progress or pending to pending, in_progress, resolved, or closed; resolved to open or closed; closed to open. Other transitions MUST be rejected. Moving to resolved MUST record the resolved time; reopening MUST clear the resolved time and any closed time.

#### Scenario: Ticket starts work

- **WHEN** a member changes an open ticket to in_progress
- **THEN** the status is saved and the change time is recorded

#### Scenario: Ticket is resolved

- **WHEN** a member changes an in-progress ticket to resolved
- **THEN** the resolved time is recorded and the ticket leaves the default open list

#### Scenario: Resolved ticket is reopened

- **WHEN** a member reopens a resolved ticket
- **THEN** the ticket returns to open and its resolved time is cleared

#### Scenario: Invalid transition is rejected

- **WHEN** a member attempts to move a closed ticket directly to in_progress
- **THEN** the system rejects the transition and keeps the ticket closed

### Requirement: Ticket assignment

Tickets MUST be assignable to active team members, MUST support remaining unassigned, and MUST be reassignable. The assignee MUST be visible in ticket lists and detail views. Deactivated users MUST NOT be assignable.

#### Scenario: Ticket is assigned

- **WHEN** a member assigns an unassigned ticket to an active teammate
- **THEN** the ticket shows that teammate as assignee in list and detail views

#### Scenario: Ticket is unassigned

- **WHEN** a member removes the assignee from a ticket
- **THEN** the ticket becomes unassigned and appears in the unassigned filter

#### Scenario: Inactive assignee is rejected

- **WHEN** a member assigns a ticket to a deactivated user
- **THEN** the system rejects the assignment

### Requirement: Ticket comments

Tickets MUST support reply and internal-note comments. Replies MUST be visible to all active team members. Internal notes MUST be visible only to administrators and the currently assigned member. Every comment MUST record its author and creation time and MUST reject an empty body.

#### Scenario: Reply is added

- **WHEN** a member adds a reply to a ticket
- **THEN** the reply appears in the ticket conversation for all active members

#### Scenario: Internal note is restricted

- **WHEN** an administrator adds an internal note and a member who is not assigned views the ticket
- **THEN** the internal note is not shown to that member

#### Scenario: Empty comment is rejected

- **WHEN** a member submits a comment with only whitespace
- **THEN** the system rejects the comment

#### Scenario: Comment order is chronological

- **WHEN** a ticket has several comments
- **THEN** they are shown oldest first with author and timestamp

### Requirement: Response and resolution SLA

The system MUST track first response and resolution against fixed targets measured in calendar hours from ticket creation. First-response targets MUST be 1 hour for urgent, 4 hours for high, 8 hours for normal, and 24 hours for low. Resolution targets MUST be 8 hours for urgent, 24 hours for high, 48 hours for normal, and 72 hours for low. The first reply added by a team member MUST set the first-response time. Moving a ticket to resolved MUST set the resolution time; reopening MUST clear it.

#### Scenario: First response is recorded

- **WHEN** a team member adds the first reply to an urgent ticket within one hour
- **THEN** the first-response time is recorded and the first-response target is met

#### Scenario: First response is overdue

- **WHEN** an urgent ticket has no reply one hour after creation
- **THEN** the ticket is marked overdue for first response

#### Scenario: Resolution target is breached

- **WHEN** a normal ticket is resolved after 48 hours
- **THEN** the ticket is recorded as resolved with a breached resolution target

#### Scenario: Reopening reactivates resolution tracking

- **WHEN** a resolved ticket is reopened
- **THEN** its resolution time is cleared and the resolution target is evaluated again from the original creation time

### Requirement: Priority changes and SLA recalculation

When a ticket's priority changes, the system MUST recalculate the first-response and resolution due times from the original creation time using the new targets. If a first response already exists, only the resolution target MUST be recalculated. The overdue state MUST update immediately.

#### Scenario: Priority is raised

- **WHEN** a normal ticket with no response is changed to urgent after two hours
- **THEN** its first-response target becomes overdue immediately

#### Scenario: Priority is lowered after first response

- **WHEN** a high ticket that already received a reply is changed to low
- **THEN** only its resolution target is recalculated and the first-response time is unchanged

### Requirement: Ticket list and filtering

The ticket list MUST support filtering by status, priority, assignee including unassigned, requester or company, and overdue state, plus text search on subject and requester name or email. The default view MUST show open, in-progress, and pending tickets. Results MUST be sortable by creation time, priority, and SLA due time and MUST be paginated. Filters MUST be preserved in the URL.

#### Scenario: Default view hides resolved tickets

- **WHEN** a member opens the ticket list without filters
- **THEN** open, in-progress, and pending tickets are shown and resolved or closed tickets are excluded

#### Scenario: Overdue filter is applied

- **WHEN** a member filters tickets to overdue
- **THEN** tickets with a missed first-response or resolution target are listed

#### Scenario: Requester search works

- **WHEN** a member searches for a requester's email
- **THEN** tickets for that requester are listed

#### Scenario: Unassigned filter works

- **WHEN** a member filters by unassigned
- **THEN** only tickets without an assignee are listed

### Requirement: Ticket detail and related views

The ticket detail page MUST show the requester and company, assignee, priority, status, SLA state, chronological comments, and linked activities and tasks. It MUST allow status changes, assignment, priority changes, and comment creation under the rules above. Contact and company detail pages MUST list their related tickets.

#### Scenario: Ticket detail shows SLA state

- **WHEN** a member opens a ticket with an overdue first response
- **THEN** the detail page shows the target, due time, and overdue state

#### Scenario: Ticket appears on contact detail

- **WHEN** a ticket is created for a contact
- **THEN** the contact detail page lists that ticket with its status

#### Scenario: Ticket appears on company detail

- **WHEN** a ticket's requester belongs to a company
- **THEN** the company detail page lists the ticket

#### Scenario: Linked task is visible

- **WHEN** a task is linked to a ticket
- **THEN** the task appears on the ticket detail page
