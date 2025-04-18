## Apr 16, 2025

-

Initial thoughts:

First off, this is a very neatly organized codebase, and I'm actually pretty impressed with the components, code style, and cleanliness of the files here. Very nice job, this is the kind of repo I like working in!

-

Notable Git commits:

- #001: Added user name and ID to the `app` dashboard, to clarify a little bit where we're at in the UI.
- #002: Fixed an issue with the nav bar; hovering over the "Admin" option triggers the :hover state when the user is hovering the broader nav link box (beyond the nav link label), but only activates the link when the text itself is clicked.
- #004: Added placeholder state and UI elements for instant, scheduled, and recurring payments on the `app` dashboard Move Money modal.
- #005: Added form logic for `setScheduledPaymentDate` and `setScheduledPaymentTime` fields. Added validation mechanism for `setScheduledPaymentDate`, since it allows arbitrary user date input via the <input type="date"> field. Added various datetime formatting functions. Clear scheduled payment fields when Transfer Payment drawer is closed. Finally, update `scheduledPaymentTime` options when the `scheduledPaymentDate` field is changed to reflect valid available scheduling times.
- #006: Added recurring payments section, including UI and functionality for the `recurringPaymentPeriod` field

-

Notes, and Assumptions:

- For the `<input type="datepicker">` element on the schedule payment date field, we're setting an arbitrary 1-year limit on how far out payments can be scheduled.
  - Obviously, payments cannot be scheduled before the current date and time.
- We've added an element that lets you specify the time of delivery as well, within the date selected.
  - One note here that represents a hairy problem; **What is the timezone in which these scheduled payments get executed?**
    - From a system POV, the easiest thing will be to standardized all payment schedules.
    - But from the user's POV, the user is likely expecting the date/time they submit in the schedule payment form will represent _their_ timezone.
    - So, a future implementation might translate the user-supplied time from that user's timezone into universal (UTC) time.
- I spent too much time on validation...
  - Still could be improved!
  - Definitely something you want a whole-of-app solution for; I just figured not having validation here made this too painful to use, so I hacked together a solution that does it somewhat well...
    - Things to add later; should trigger validation functions on form submit, as well as form input changed & form input blur events.
- Page.tsx should be refactored into multiple files, absolutely...

TODO:

- [ ] Add `time` field to scheduled payments UI
- [ ] When today's day is selected in the scheduled payments date field, update the `time` field to be the next 30 minute increment after the current time.
