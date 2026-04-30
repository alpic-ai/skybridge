# Architecture Workflow

## Concepts

A **tool** is a backend action with no UI. It takes input and returns structured output. It can CRUD data and perform operations (checkout, submit, etc.).

A **view** is a tool with a UI. It renders the tool output visually. The UI is a React app that can:
- navigate multiple views (search → detail → confirmation)
- manage its own state
- call other tools to fetch data absent from the view output schema or trigger actions.

## Step 1: Identify the UX Flows

A **flow** is an end-to-end user journey that accomplishes one goal (e.g., "book a flight" = search → select → checkout).
Extract flows from the SPEC's value proposition. **Stick to the spec**: don't invent flows or infer intermediate steps.

**Example:**

Input (SPEC):
> Book flights by destination and dates, and cancel existing bookings by booking ID.

✅ Good output:
```
Book flight:
1. Search flights
2. Select flight
3. Checkout
Cancel booking:
1. Cancel booking
```

❌ Bad output:
```
Search flights:
1. Search flights
2. View results
Book flight: ← wrong: split booking into separate flow
1. Select flight
2. Enter passenger details
3. Checkout
Cancel booking:
1. List bookings ← wrong: invented step
2. Cancel booking
```

**Do not proceed to Step 2 yet**: validate with user, adjust based on feedback.

## Step 2: Does the flow need UI?

Based on the UX flow:

**YES if:**
- Browsing/comparing multiple items
- Visual data improves understanding (maps, charts, images)
- Selections are easier in a visual layout

**NO if:**
- Inputs are naturally conversational (amounts, dates, descriptions)
- Output is simple enough as text
- No visual element would meaningfully improve the experience

## Step 3: Design the API

### Best Practices

**Naming:** Both views and tools start with a verb: `search_flights`, `get_details`, `create_checkout`.

**One view per flow/intent:** Different flows can have separate views
❌ `search_flights` view + `view_flight` view (same flow → merge into one view)
✅ `search_flights` view + `manage_bookings` view (different flows)

**Don't duplicate:** View output is returned to the LLM for conversation. View can be re-invoked. Don't create a tool that duplicates what the view fetches.
❌ `search_flights` view + `get_flights` tool (same data → view already fetches this)
✅ unique `search_flights` view that can be re-invoked by LLM or user

**View UI handles its own state:** Cart, selections, and form inputs live in the view - not as tools.
❌ `add_to_cart` tool (cart is view state)
❌ `select_seat` tool (selection is view state)
❌ `update_quantity` tool (form input is view state)
✅ Tools are for backend operations only: `create_checkout`, `submit_order`, `make_reservation`

**Don't lazy-load:** Tool calls are expensive. Return all needed data upfront.
❌ `search_flights` view + `get_flight_details` tool (lazy-loading details)
✅ `search_flights` view returns full flight data including details

--- 

For each identified flow:

### If NEEDS UI → View + Optional Tool(s)

**Example: Flight Booking**

UX Flow:
1. Search flights by dates, destination
2. Browse results, select flight
3. View flight details
4. Click checkout → redirect to payment

API:

**View: search_flights**
- Input: `{ dates, destination }`
- Output: `{ flights }` → rendered as list
- Views: search results, flight detail + passenger form
- Calls `create_checkout` tool → redirects to payment

**Tool: create_checkout**
- Input: `{ flightId, passengers[] }`
- Output: `{ checkoutUrl }` → view redirects to Stripe

### If DOES NOT NEED UI → Tool(s) Only

**Example: Manage Bookings**

UX Flow:
1. User: "Cancel my flight to Paris"
2. LLM asks for email, fetches bookings, asks clarifying questions if needed
3. LLM confirms and cancels

API:

**Tool: list_bookings**
- Input: `{ email }`
- Output: `{ booking[] }` → LLM says "You have two upcoming flights for Paris, which one do you want to cancel?"

**Tool: cancel_booking**
- Input: `{ bookingId }`
- Output: `{ booking }` → LLM summarizes: "Your booking for Paris on Jan 1 has been canceled."

## Step 4: Review

Present the final architecture to the user, adjust based on feedback.

## Step 5: Update SPEC.md

Update SPEC.md with the UX flows and API design.

**Example:**

```markdown
...

## UX Flows

Book a flight:
1. Search flights by destination and dates
2. Browse results, select flight
3. Enter passenger details
4. Checkout (redirect to Stripe)

Cancel booking:
1. Provide email
2. Select booking to cancel

## Tools and Views

**View: search_flights**
- **Input**: `{ destination, dates }`
- **Output**: `{ flights[] }`
- **Views**: results list, flight detail, passenger form
- **Behavior**: manages passenger state locally, calls `create_checkout` tool

**Tool: create_checkout**
- **Input**: `{ flightId, passengers[] }`
- **Output**: `{ checkoutUrl }`

**Tool: list_bookings**
- **Input**: `{ email }`
- **Output**: `{ bookings[] }`

**Tool: cancel_booking**
- **Input**: `{ bookingId }`
- **Output**: `{ success, booking }`
```
