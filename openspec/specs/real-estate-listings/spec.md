# real-estate-listings Specification

## Purpose

Manage sale and rent property listings, their inventory details, photos, viewings, and listing-level reporting for the agency.

## Requirements

### Requirement: Listing records

The system SHALL let active team members create and edit listings with required reference, title, transaction, price, currency, seller contact, agent, and status, plus optional address, description, facts, and commission. Sale listings MUST NOT define a rent period; rent listings MUST define a monthly period. Price and commission MUST be non-negative with at most two decimals in the listing currency. Rent listings MUST NOT create tenancy, rent-collection, or maintenance records.

#### Scenario: Sale listing is created

- **WHEN** a member submits a sale listing with a reference, title, price, currency, seller, and agent
- **THEN** the system saves it as an active sale listing and opens its detail page

#### Scenario: Rent listing requires a monthly period

- **WHEN** a member saves a rent listing without a monthly period
- **THEN** the system rejects the listing and explains that the rent period is required

#### Scenario: Negative price or commission is rejected

- **WHEN** a member submits a price or commission below zero or with more than two decimals
- **THEN** the system rejects the value

#### Scenario: Rental listing is not a tenancy

- **WHEN** a member creates a rent listing
- **THEN** the system does not create a lease, rent schedule, or maintenance record

### Requirement: Listing property facts and grouped features

Listings MUST retain every supplied feature group: location, construction, exterior, style, roof, yard, home type, home features, rooms, flooring, kitchen, dining, master suite, bath, energy, and accessibility. Boolean feature keys MUST be validated against the catalog and unknown keys rejected. Core numeric facts MUST be typed for filtering and sorting. The interface MUST group features and expose the long tail progressively.

#### Scenario: Grouped features are saved

- **WHEN** a member saves a listing with location, yard, kitchen, and accessibility features
- **THEN** the system stores the selected keys under their groups and returns them on the listing detail

#### Scenario: Unknown feature key is rejected

- **WHEN** a member submits a feature key that is not in the catalog
- **THEN** the system rejects the feature input

#### Scenario: Numeric facts remain numeric

- **WHEN** a member enters bedrooms, bathrooms, size, lot size, year built, floors, and parking
- **THEN** the system stores them as numeric values usable in filters and sorting

#### Scenario: Listing is filtered by a feature

- **WHEN** a member filters listings by a pool and a sea view
- **THEN** only listings containing both selected feature keys are returned

### Requirement: Listing lifecycle

Listings MUST be Active or Inactive. Active listings MUST appear in default lists, search, pickers, and the public API. Inactive listings MUST be excluded from those surfaces but MUST remain directly accessible to signed-in members. Deactivating MUST record the deactivation time, and restoring MUST clear it. Listing status MUST change only through an explicit member action; winning a deal MUST NOT silently change it. Listings MUST NOT be hard-deleted.

#### Scenario: Listing is deactivated

- **WHEN** a member deactivates an active listing
- **THEN** the listing leaves default lists, pickers, search, and the public API and records the deactivation time

#### Scenario: Listing is restored

- **WHEN** a member restores an inactive listing
- **THEN** the listing returns to active surfaces and its deactivation time is cleared

#### Scenario: Inactive listing remains reachable

- **WHEN** a signed-in member opens the detail page of an inactive listing
- **THEN** the listing is shown with an inactive indicator

#### Scenario: Won deal does not change status

- **WHEN** a deal linked to a listing is moved to a won stage
- **THEN** the listing remains active until a member explicitly deactivates it

### Requirement: Seller and agent relationships

Each listing MUST have exactly one seller contact and exactly one responsible agent. The seller MAY be an individual or a company contact and MAY also be a buyer on other listings; no buyer or seller role field is stored on the contact. The agent MUST be an active team member and defaults to the creator. An archived seller MUST remain linked and displayed with an archived indicator.

#### Scenario: Same contact sells and buys

- **WHEN** a contact is the seller on one listing and the buyer on a deal for another listing
- **THEN** both relationships are shown without changing the contact record

#### Scenario: Archived seller remains on the listing

- **WHEN** a listing's seller contact is archived
- **THEN** the listing detail still shows the seller with an archived indicator

#### Scenario: Inactive agent is rejected

- **WHEN** a member assigns a listing to a deactivated user
- **THEN** the system rejects the agent selection

#### Scenario: Listing has one seller

- **WHEN** a member saves a listing
- **THEN** the listing stores exactly one seller contact

### Requirement: Listing photos

Active team members MUST be able to upload, reorder, and delete photos for a listing. Uploads MUST accept only image content, be re-encoded, have embedded metadata such as GPS removed, and be stored with a stable photo identity. Display order MUST be stored separately so reordering does not rename files. Listing photos MUST be publicly readable. Uploads MUST be available only for listing photos, not for other record types.

#### Scenario: Listing photo is uploaded

- **WHEN** a member uploads a valid image to a listing
- **THEN** the system stores an optimized public photo and adds it to the listing

#### Scenario: Non-image upload is rejected

- **WHEN** a member uploads a file that is not an accepted image format
- **THEN** the system rejects the file and explains the accepted formats

#### Scenario: Photos are reordered

- **WHEN** a member moves a photo to a new position
- **THEN** the listing displays the new order and the stored file identity does not change

#### Scenario: Photo is deleted

- **WHEN** a member deletes a listing photo
- **THEN** the photo is removed from the listing and is no longer served

#### Scenario: Location metadata is removed

- **WHEN** an uploaded image contains embedded GPS metadata
- **THEN** the stored public image does not contain that metadata

#### Scenario: Other records do not accept uploads

- **WHEN** a member attempts to upload a file to a company, contact, deal, ticket, or campaign
- **THEN** the system does not offer or accept an upload

### Requirement: Listing viewings

The system SHALL let active team members schedule past or future viewings for a listing and contact, with an assigned agent, start time, duration, status (scheduled, completed, cancelled, no_show), and notes. A listing MUST show its upcoming and past viewings in a list and a calendar or grid. A contact MAY have multiple viewings for the same listing. Viewings MUST NOT create tenancy records.

#### Scenario: Future viewing is scheduled

- **WHEN** a member schedules a viewing for a listing and contact
- **THEN** the viewing appears on the listing's upcoming viewings and calendar

#### Scenario: Viewing outcome is recorded

- **WHEN** a member marks a viewing completed, cancelled, or no_show
- **THEN** the viewing keeps the outcome and moves to the listing's past viewings or remains historical

#### Scenario: Same contact views twice

- **WHEN** a contact has two viewings for the same listing
- **THEN** both are stored and shown separately

#### Scenario: Viewing is not a tenancy

- **WHEN** a viewing is scheduled or completed for a rent listing
- **THEN** the system does not create a lease or rent obligation

### Requirement: Listing list, filters, and detail

The listings list MUST support search by reference, title, address, or seller contact; filters by transaction, status, property type, city, bedrooms, features, and price range with currency; sorting; and pagination. Selected filters MUST be preserved in the URL. Listing detail MUST show photos, seller, agent, price, commission, features, linked deals, viewings, and the combined timeline and tasks.

#### Scenario: Price filter requires a currency

- **WHEN** a member filters by minimum or maximum price
- **THEN** the filter applies only within the selected currency

#### Scenario: Feature filter combines keys

- **WHEN** a member selects multiple features
- **THEN** only listings containing all selected feature keys are listed

#### Scenario: Filters survive pagination

- **WHEN** a member moves to another page of a filtered listing list
- **THEN** the same filters and sort order remain applied

#### Scenario: Listing detail shows related records

- **WHEN** a member opens a listing with photos, deals, viewings, activities, and tasks
- **THEN** the page shows each related section and links to the corresponding records

#### Scenario: Inactive listings are excluded by default

- **WHEN** a member opens the listings list without an explicit status filter
- **THEN** inactive listings are not listed

### Requirement: Listings module overview

The listings module MUST provide an overview of active inventory split by sale and rent, new listings in the selected period, upcoming viewings, aging inventory, and asking sale value and monthly rent roll grouped by currency. Money totals MUST NOT be summed across currencies.

#### Scenario: Inventory is split by transaction

- **WHEN** the agency has active sale and rent listings
- **THEN** the overview shows separate active counts for sale and rent

#### Scenario: Money is grouped by currency

- **WHEN** active listings use more than one currency
- **THEN** asking sale value and monthly rent roll are shown per currency

#### Scenario: Aging inventory is shown

- **WHEN** an active listing has been listed longer than the aging threshold
- **THEN** the overview identifies it as aging

#### Scenario: Upcoming viewings are counted

- **WHEN** viewings are scheduled for future dates
- **THEN** the overview shows the upcoming viewing count
