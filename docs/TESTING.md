# Stage 1 manual test checklist

Run after setup. Use two browsers (or one private window) for the concurrency and public tests.

**Public vs protected**
- [ ] Signed out: dashboard and inventory load; no Add/Edit/Adjust buttons; no supplier URL or notes; no history.
- [ ] Signed out in the browser console: `await supabase.from('inventory_items').select()` style requests return nothing or an error (base table is not public).
- [ ] Signed out: attempting an insert/update on any table fails.
- [ ] Open signup is off: signing up with a new email through the API is rejected.

**Accounts**
- [ ] First invited user is Administrator; second is Student.
- [ ] Invite link asks for a password; then signs in. Reset password works.
- [ ] Student sees no Add/Edit/Adjust/Archive buttons; forcing the calls fails with a permission error.
- [ ] Trying to delete the last admin's `user_roles` row, or set their `is_active` false, is refused.

**Inventory**
- [ ] Add item with starting quantity: history shows "Created" with that quantity.
- [ ] Duplicate part number is rejected with a clear message.
- [ ] Decimal quantity (e.g. 12.5 ft) saves and displays.
- [ ] Set count, Add, Remove each update quantity and write a history row with before/after/user.
- [ ] Remove more than on hand is rejected; quantity never goes negative.
- [ ] Search by name, part number, material, category, location; each filter works; pagination appears over 50 items.
- [ ] Archive hides the item from signed-out users and totals; Restore brings it back.

**Concurrency**
- [ ] Open the same item's Adjust dialog in two windows. Save "Set count" in window A, then in window B. B must fail with "Quantity changed to … Reload and try again."
- [ ] Add/Remove in two windows at once: both apply (the row is locked), and the history shows both.

**Locations/categories**
- [ ] Create nested locations; filtering by a parent includes its children.
- [ ] Deleting a location or category in use is refused with a clear message.

**Layout**
- [ ] Usable at Chromebook width and on a phone (menu button opens the sidebar).
