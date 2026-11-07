# Pause job processing

Use this when a task spikes and not-yet-started jobs for that task should stop, so the worker spends less CPU on the backlog.

The worker skips any `queued_job` whose `taskName` is in `paused_task`. The task name today is `new_ride_request`. Replace `<task_name>` with the task that is spiking.

## Pause

```sql
INSERT INTO "paused_task" ("taskName")
VALUES ('<task_name>');
```

Pending and future jobs for that task stay in `queued_job` and are no longer claimed. Jobs already `RUNNING` finish their current attempt.

## Resume

When the spike has passed:

```sql
DELETE FROM "paused_task"
WHERE "taskName" = '<task_name>';
```
