# Spec Delta

## MODIFIED Requirements

### Requirement: Message composition

Active team members SHALL create a draft with a required subject, a required body, and one audience source: a recipient group or a segment. Messages are email-only. The subject MUST be at most 200 characters. The plain-text body MUST be at most 10,000 characters and the HTML body at most 50,000 characters. Drafts MUST remain editable until sent.

#### Scenario: Draft is saved

- **WHEN** a member saves a draft with a subject, a formatted body, and a recipient group
- **THEN** the message is stored in draft status and appears in the message list

#### Scenario: Subject is required

- **WHEN** a member saves a message without a subject
- **THEN** the system rejects it and asks for a subject

#### Scenario: Audience source is required

- **WHEN** a member saves a message without selecting a group or segment
- **THEN** the system rejects it and asks for an audience

#### Scenario: Draft is edited

- **WHEN** a member changes the body of a draft
- **THEN** the updated body is shown the next time the draft is opened

#### Scenario: Body is required

- **WHEN** a member saves a message whose body is empty or contains only whitespace
- **THEN** the system rejects it and asks for a message body

#### Scenario: Body limits are enforced

- **WHEN** the HTML body exceeds 50,000 characters or its plain-text alternative exceeds 10,000 characters
- **THEN** the system rejects the save and reports the applicable limit

#### Scenario: Legacy draft remains editable

- **WHEN** a member opens a draft created before HTML support
- **THEN** its text is shown in the rich-text editor with line breaks preserved and can be saved again

### Requirement: Merge fields

The body MAY contain the placeholders `{{firstName}}`, `{{lastName}}`, and `{{company}}`. Saving MUST reject any other placeholder. At send time each placeholder MUST be replaced with the recipient's value, and a missing value MUST render as an empty string. In HTML content, inserted values MUST be HTML-escaped. A placeholder MUST be plain text and MUST NOT be split by formatting markup.

#### Scenario: Supported placeholders are saved

- **WHEN** a draft body contains `{{firstName}}` and `{{company}}`
- **THEN** the draft is saved unchanged

#### Scenario: Unknown placeholder is rejected

- **WHEN** a draft body contains `{{email}}`
- **THEN** the system rejects the save and identifies the unsupported placeholder

#### Scenario: Missing company renders empty

- **WHEN** a contact without a company receives a body containing `{{company}}`
- **THEN** the sent body contains no value in that position

#### Scenario: HTML characters are escaped

- **WHEN** a contact's company is `Smith & Sons` and the HTML body contains `{{company}}`
- **THEN** the sent HTML contains `Smith &amp; Sons` and the text part contains `Smith & Sons`

#### Scenario: Formatted placeholder is rejected

- **WHEN** a placeholder is broken up by formatting markup in the HTML body
- **THEN** the system rejects the save and identifies the affected placeholder

### Requirement: Message lifecycle

Messages MUST be draft, sending, completed, or cancelled. Sending MUST move a draft to sending, then to completed when every recipient is terminal. An interrupted send MUST remain sending until it is completed or cancelled. Cancelling MUST be allowed only while sending and MUST mark remaining queued recipients as skipped. After a message leaves draft status, its subject, HTML body, plain-text body, and audience MUST be read-only.

#### Scenario: Send advances the status

- **WHEN** a member sends a draft
- **THEN** the message moves to sending and finally to completed

#### Scenario: Interrupted send stays resumable

- **WHEN** the process stops before every recipient is terminal
- **THEN** the message remains in sending status with queued recipients available for retry

#### Scenario: Cancelling closes remaining recipients

- **WHEN** a member cancels a message in sending status
- **THEN** the message becomes cancelled and remaining queued recipients become skipped

#### Scenario: Sent content is read-only

- **WHEN** a message has left draft status
- **THEN** its subject, HTML body, plain-text body, and audience cannot be changed

## ADDED Requirements

### Requirement: Rich HTML composition

Active team members SHALL compose the body with a rich-text editor that supports bold, italic, underline, bulleted and numbered lists, links, and remote images. Images MUST use an HTTPS URL. Uploads and attachments MUST NOT be offered. Formatting MUST be retained when a draft is reopened.

#### Scenario: Formatting is retained

- **WHEN** a member saves a draft containing bold, italic, and underlined text
- **THEN** the formatting is shown when the draft is reopened

#### Scenario: Lists and links are retained

- **WHEN** a member saves a draft containing a bulleted list, a numbered list, and a link
- **THEN** the lists and link are shown when the draft is reopened

#### Scenario: Remote image is retained

- **WHEN** a member inserts an image using an HTTPS URL
- **THEN** the image is stored and shown when the draft is reopened

#### Scenario: Upload is unavailable

- **WHEN** a member opens the rich-text editor
- **THEN** no image upload or attachment control is offered

### Requirement: HTML sanitization

The system MUST sanitize message HTML on the server before storing it and before delivery. Only formatting, lists, links, and images MAY be stored. Scripts, styles, iframes, forms, event handlers, and unsupported attributes MUST be removed. Links MAY use `http`, `https`, or `mailto`; image sources MUST use `https`. Unsafe content MUST NOT be stored in a draft, retained on a sent message, or passed to the transport.

#### Scenario: Scripts and event handlers are removed

- **WHEN** a drafted body contains a script element or an event-handler attribute
- **THEN** the stored HTML contains neither

#### Scenario: Embedded content is removed

- **WHEN** a drafted body contains a style element, an iframe, or a form
- **THEN** the stored HTML contains none of them

#### Scenario: Unsafe link schemes are removed

- **WHEN** a drafted body contains a link using a `javascript:` or `data:` URL
- **THEN** the stored HTML contains no active link for that URL

#### Scenario: Non-HTTPS images are removed

- **WHEN** a drafted body contains an image using an `http:`, `data:`, or `cid:` URL
- **THEN** the stored HTML contains no image for that URL

#### Scenario: Formatting is preserved

- **WHEN** a drafted body contains allowed formatting, lists, links, and an HTTPS image
- **THEN** the sanitized HTML retains them

#### Scenario: Unsafe stored content is not sent

- **WHEN** HTML containing unsafe markup is present in a message at delivery time
- **THEN** the transport receives only sanitized HTML

### Requirement: Plain-text alternative

Every message with HTML content MUST have a non-empty plain-text alternative derived on the server from the sanitized HTML. The alternative MUST be at most 10,000 characters. HTML MUST NOT be delivered without its text part.

#### Scenario: HTML message gains a text alternative

- **WHEN** a member saves a valid HTML body
- **THEN** the message stores a plain-text alternative derived from that HTML

#### Scenario: Entities render as text

- **WHEN** the HTML body contains `&amp;` or a link
- **THEN** the plain-text alternative contains readable text without HTML tags

#### Scenario: Content-free HTML is rejected

- **WHEN** the sanitized HTML has no readable text content
- **THEN** the system rejects the save and asks for a message body

#### Scenario: Overlong alternative is rejected

- **WHEN** the derived plain-text alternative would exceed 10,000 characters
- **THEN** the system rejects the save and reports the text limit

### Requirement: HTML delivery

When a message has HTML content, delivery MUST send both the rendered HTML and the rendered plain-text alternative. Legacy messages without HTML MUST remain text-only. Merge fields MUST be rendered in both parts with the recipient's values.

#### Scenario: HTML message includes both parts

- **WHEN** an HTML message is delivered
- **THEN** the recipient's transport attempt contains both the rendered HTML and a non-empty text part

#### Scenario: Legacy message stays text-only

- **WHEN** a message created before HTML support is delivered
- **THEN** the transport attempt contains a text part and no HTML part

#### Scenario: Recipient merge values apply to both parts

- **WHEN** an HTML message is delivered to a contact
- **THEN** both the HTML and text parts contain that contact's merge values
