-- Drops the uptime monitoring tables. Every foreign key into this set comes from
-- another table in the set, and the generated order already lists dependents
-- before their parents, so CASCADE is not needed. Leaving CASCADE off means an
-- undeclared dependent (a view, or a foreign key added outside this schema)
-- aborts the migration instead of being silently dropped along with the table.
DROP TABLE IF EXISTS "agent_regions";--> statement-breakpoint
DROP TABLE IF EXISTS "notification_channels";--> statement-breakpoint
DROP TABLE IF EXISTS "uptime_alert_history";--> statement-breakpoint
DROP TABLE IF EXISTS "uptime_alerts";--> statement-breakpoint
DROP TABLE IF EXISTS "uptime_incidents";--> statement-breakpoint
DROP TABLE IF EXISTS "uptime_monitor_status";--> statement-breakpoint
DROP TABLE IF EXISTS "uptime_monitors";
