# Tracker

- implement business error filters
- implement validation error filters
- implement custom error filters

## Recommendation for Now

- Since you’re building the foundational Context/Notification/Error system, start without GraphQL.
- Make it REST + WebSocket-ready.
- Later, if you build a GraphQL layer, you can wrap your notification service as a subscription — everything else stays the same.
