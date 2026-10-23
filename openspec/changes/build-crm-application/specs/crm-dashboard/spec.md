# Spec Delta

## Purpose

Give the team a single operational view of sales, support, marketing, and task workload, plus fast access to any CRM record.

## ADDED Requirements

### Requirement: Sales dashboard metrics

The dashboard MUST show open deal count and value, weighted open value, deals won in the current calendar month and their total value, the current-month win rate, and open deals with an expected close date within the next 30 days. Win rate MUST be won deals divided by won plus lost deals closed in the current month, and MUST be zero when no deals closed.

#### Scenario: Sales metrics reflect open and closed deals

- **WHEN** the workspace has open deals, won deals, and lost deals
- **THEN** the dashboard shows open count and value, weighted value, current-month won count and value, and win rate

#### Scenario: Win rate uses current-month closures

- **WHEN** one deal was won and one was lost in the current month
- **THEN** the win rate is 50 percent

#### Scenario: Empty sales data

- **WHEN** no deals exist
- **THEN** sales metrics show zero and a link to create the first deal

### Requirement: Support dashboard metrics

The dashboard MUST show the number of open tickets in open, in-progress, or pending status, unassigned open tickets, overdue tickets, and average first-response and resolution times for tickets resolved in the last 30 days. Averages MUST be shown as zero when no tickets resolved in that period.

#### Scenario: Support metrics include active tickets

- **WHEN** the workspace has open, pending, resolved, and closed tickets
- **THEN** only open, pending, and in-progress tickets count toward open ticket totals

#### Scenario: Overdue tickets are counted

- **WHEN** a ticket misses its first-response or resolution target and remains active
- **THEN** the dashboard overdue count includes it

#### Scenario: Averages cover resolved tickets

- **WHEN** two tickets were resolved in the last 30 days
- **THEN** the average first-response and resolution times are calculated from those tickets

### Requirement: Marketing dashboard metrics

The dashboard MUST show the number of active campaigns, total audience across active campaigns, overall response rate, and total conversions for active campaigns. Response rate MUST be the number of responded or converted recipients divided by total active-campaign audience, and MUST be zero when the audience is empty.

#### Scenario: Marketing metrics aggregate active campaigns

- **WHEN** multiple campaigns are active with tracked recipients
- **THEN** the dashboard sums their audiences, responses, and conversions

#### Scenario: Inactive campaigns are excluded

- **WHEN** a campaign is completed or archived
- **THEN** its audience and engagement do not count toward active campaign metrics

#### Scenario: Empty marketing data

- **WHEN** no active campaigns exist
- **THEN** marketing metrics show zero and a link to create a campaign

### Requirement: Task dashboard metrics

The dashboard MUST show the signed-in user's open tasks that are overdue, due today, and due within the next seven days. Tasks assigned to other users MUST NOT count toward these personal metrics.

#### Scenario: Overdue personal tasks are counted

- **WHEN** the signed-in user has two open tasks with past due dates
- **THEN** the dashboard shows two overdue tasks for that user

#### Scenario: Other users' tasks are excluded

- **WHEN** a teammate has an overdue task assigned to them
- **THEN** it does not appear in the signed-in user's personal task metrics

#### Scenario: Due-today and upcoming tasks are counted

- **WHEN** the signed-in user has tasks due today and within the next seven days
- **THEN** the dashboard shows separate counts for each group

### Requirement: Dashboard charts

The dashboard MUST display a chart of open deal value by stage for the default pipeline, a chart of ticket counts by status, and a chart of active-campaign recipients by engagement status. Each chart MUST use the same data scope as its corresponding metrics.

#### Scenario: Pipeline chart shows stage values

- **WHEN** the default pipeline has open deals in several stages
- **THEN** the chart shows each stage with its open deal value

#### Scenario: Ticket chart shows status counts

- **WHEN** tickets exist in several statuses
- **THEN** the chart shows a count for each status

#### Scenario: Campaign chart shows engagement breakdown

- **WHEN** active campaign recipients have different engagement statuses
- **THEN** the chart shows counts for each status

### Requirement: Recent activity

The dashboard MUST show the 10 most recent activities across all records with type, subject, author, timestamp, and a link to at least one linked record. Activities linked to multiple records MUST link to each of them on the activity entry.

#### Scenario: Newest activities are shown

- **WHEN** more than 10 activities exist
- **THEN** only the 10 most recent are shown

#### Scenario: Activity links navigate to records

- **WHEN** a dashboard activity is linked to a deal
- **THEN** selecting the deal link opens the deal detail page

#### Scenario: No activities exist

- **WHEN** the workspace has no activities
- **THEN** the dashboard shows an empty state explaining how to log one

### Requirement: Global search

The application MUST provide global search from every authenticated page. A query of at least two characters MUST search companies by name or domain, contacts by name or email, deals by name or company, tickets by subject or requester, and campaigns by name. Results MUST be grouped by type, capped at five per type, and link to the matching record. Shorter queries MUST return no results.

#### Scenario: Search returns grouped results

- **WHEN** a member searches for a term that matches a company, a contact, and a deal
- **THEN** results are shown in separate company, contact, and deal groups

#### Scenario: Results are capped per type

- **WHEN** more than five companies match
- **THEN** the company group shows at most five results

#### Scenario: Short query returns nothing

- **WHEN** a member enters a single character
- **THEN** no results are shown

#### Scenario: No matches

- **WHEN** a query matches no records
- **THEN** the search shows an empty state

### Requirement: Navigation shell

Authenticated pages MUST use a persistent navigation shell with links to Dashboard, Companies, Contacts, Deals, Tickets, Campaigns, Tasks, and Settings. The current section MUST be indicated. Team administration and pipeline configuration links MUST be shown only to administrators. The shell MUST remain usable at mobile widths through a collapsible menu.

#### Scenario: Navigation is always available

- **WHEN** a member is on any authenticated page
- **THEN** the navigation shell lists the main sections and indicates the current one

#### Scenario: Admin-only settings are hidden from members

- **WHEN** a member opens Settings
- **THEN** team administration and pipeline configuration are not offered

#### Scenario: Mobile menu works

- **WHEN** a member uses the application at a mobile width
- **THEN** the navigation collapses into a menu that can be opened and closed
