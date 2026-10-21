# SAS NIMDTA Event Calendar

A read-only monthly events calendar built with plain HTML, CSS and JavaScript. Events are maintained in `events.csv`; no Airtable, database or external service is required.

## Preview in Visual Studio Code

1. Open this folder in Visual Studio Code.
2. Install Microsoft's **Live Preview** extension.
3. Open `index.html`.
4. Select **Show Preview** or right-click `index.html` and select **Show Preview**.

Do not double-click `index.html` to open it as a `file://` page. Browsers normally block JavaScript from loading a local CSV that way.

## Update events

Open `events.csv` in Excel or a text editor. Keep the header row exactly as supplied:

- Event Name
- Date
- Event Type
- Duration
- Time
- Venue Details
- Status
- Format
- Publish

### Rules

- Enter dates as `dd/mm/yyyy`, for example `28/10/2026`.
- Set `Publish` to `Yes` to show an event.
- Set `Publish` to `No`, or leave it blank, to hide an event while it is being prepared.
- If text contains a comma, Excel will automatically quote that cell when saving as CSV.
- Missing Duration, Time, Venue Details, Status or Format values are omitted from the event window.
- Fully booked events remain on the main calendar and may also appear in Upcoming Events.
- Upcoming Events shows a maximum of six published events taking place from today through the next 28 days.

Accepted Publish values are `Yes`, `Y`, `True`, `1` or `X` (not case-sensitive). Using `Yes` and `No` is recommended for clarity.

## Standard values

### Event Type

- Generic Capabilities
- Course
- Other Event
- QI Course
- Portfolio Pathway
- Development Fund

### Status

- Coming Soon
- Open for Booking
- Fully Booked
- Date to be confirmed

### Format

- Face to Face
- Virtual
- Flagship
- Deadline
- Celebration

Values outside these lists still display, using a neutral fallback colour or icon.

## Replace the logo placeholders

The files in `assets/` are editable SVG placeholders created for the first build:

- `assets/sas-logo.svg`
- `assets/nimdta-logo.svg`

For the best result, replace these with the approved original logo artwork while keeping the same filenames. SVG is preferred, but PNG also works if the `src` paths in `index.html` are updated.

If a logo file contains large transparent margins, crop the image itself. The CSS already uses reduced outer padding and aligns the visible logo area, month heading and calendar closely along the left edge.

## Contact information

The contact information is static in `index.html`. Search for `Contact Information` to update the email address, website or telephone number.

## Publish to GitHub Pages later

The project is fully static and is ready for GitHub Pages. Repository visibility and the final public/private arrangement can be decided separately. Visitors to the published calendar have no editing controls; only people with repository write access can change `events.csv` or the source files.

## Font

The interface uses Open Sans when available, with Arial and Helvetica as fallbacks. No Google Fonts dependency is used because Google services may be blocked on organisational systems. A local Open Sans web-font file can be added later if required.
