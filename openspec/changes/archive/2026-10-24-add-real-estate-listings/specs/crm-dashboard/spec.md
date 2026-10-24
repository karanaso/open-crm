# Spec Delta

## ADDED Requirements

### Requirement: Listings module dashboard

The dashboard MUST provide a listings overview with active inventory split by sale and rent, new listings in the current month, upcoming viewings, aging inventory, and asking sale value and monthly rent roll grouped by currency. Money totals MUST NOT be summed across currencies. Each metric MUST link to the matching filtered listing or viewing view.

#### Scenario: Inventory is split by transaction

- **WHEN** active sale and rent listings exist
- **THEN** the dashboard shows separate active counts for sale and rent

#### Scenario: New listings are counted

- **WHEN** listings became active during the current month
- **THEN** the dashboard counts them as new

#### Scenario: Currency totals are separate

- **WHEN** active listings use EUR and USD
- **THEN** asking sale value and monthly rent roll are shown per currency

#### Scenario: Aging inventory links to a filtered list

- **WHEN** active listings exceed the aging threshold
- **THEN** the dashboard shows the count and links to those listings

## MODIFIED Requirements

### Requirement: Sales dashboard metrics

The dashboard MUST show open deal count and commission value, weighted open commission, deals won in the current calendar month and their commission value, the current-month win rate, and open deals with an expected close date within the next 30 days. Win rate MUST be won deals divided by won plus lost deals closed in the current month, and MUST be zero when no deals closed. Money metrics MUST be grouped by currency and MUST NOT be summed across currencies. Counts and win rate MAY remain aggregate.

#### Scenario: Sales metrics reflect open and closed deals

- **WHEN** the workspace has open deals, won deals, and lost deals
- **THEN** the dashboard shows open count and commission, weighted commission, current-month won count and commission, and win rate

#### Scenario: Currency totals are separate

- **WHEN** open or won deals use more than one currency
- **THEN** each money metric is shown per currency

#### Scenario: Win rate uses current-month closures

- **WHEN** one deal was won and one was lost in the current month
- **THEN** the win rate is 50 percent

#### Scenario: Empty sales data

- **WHEN** no deals exist
- **THEN** sales metrics show zero and a link to create the first deal

### Requirement: Dashboard charts

The dashboard MUST display a chart of open commission by stage for the default pipeline, a chart of ticket counts by status, and a chart of active-campaign recipients by engagement status. Each chart MUST use the same data scope as its corresponding metrics. A pipeline chart with multiple currencies MUST show stage values per currency and MUST NOT sum them.

#### Scenario: Pipeline chart shows stage values

- **WHEN** the default pipeline has open deals in several stages
- **THEN** the chart shows each stage with its open commission

#### Scenario: Pipeline chart separates currencies

- **WHEN** the default pipeline has open deals in EUR and USD
- **THEN** the chart shows separate EUR and USD values rather than one total

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

- **WHEN** a dashboard activity is linked to a deal or a listing
- **THEN** selecting the record link opens the corresponding detail page

#### Scenario: No activities exist

- **WHEN** the workspace has no activities
- **THEN** the dashboard shows an empty state explaining how to log one

### Requirement: Global search

The application MUST provide global search from every authenticated page. A query of at least two characters MUST search companies by name or domain, contacts by name or email, deals by name or contact name, tickets by subject or requester, campaigns by name, and listings by reference, title, address, or seller contact. Results MUST be grouped by type, capped at five per type, and link to the matching record. Shorter queries MUST return no results.

#### Scenario: Search returns grouped results

- **WHEN** a member searches for a term that matches a company, a contact, and a listing
- **THEN** results are shown in separate company, contact, and listing groups

#### Scenario: Listing search matches a reference

- **WHEN** a member searches for a listing reference
- **THEN** the matching listing appears in the listing group

#### Scenario: Results are capped per type

- **WHEN** more than five listings match
- **THEN** the listing group shows at most five results

#### Scenario: Short query returns nothing

- **WHEN** a member enters a single character
- **THEN** no results are shown

#### Scenario: No matches

- **WHEN** a query matches no records
- **THEN** the search shows an empty state

### Requirement: Navigation shell

Authenticated pages MUST use a persistent navigation shell with links to Dashboard, Companies, Contacts, Listings, Deals, Tickets, Campaigns, Tasks, and Settings. The current section MUST be indicated. Team administration and pipeline configuration links MUST be shown only to administrators. The shell MUST remain usable at mobile widths through a collapsible menu.

#### Scenario: Navigation is always available

- **WHEN** a member is on any authenticated page
- **THEN** the navigation shell lists the main sections and indicates the current one

#### Scenario: Listings is available

- **WHEN** a member opens the navigation
- **THEN** the Listings section is available and its nested pages keep it indicated

#### Scenario: Admin-only settings are hidden from members

- **WHEN** a member opens Settings
- **THEN** team administration and pipeline configuration are not offered

#### Scenario: Mobile menu works

- **WHEN** a member uses the application at a mobile width
- **THEN** the navigation collapses into a menu that can be opened and closed
