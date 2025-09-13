import { DateTime } from "luxon";
import { and, eq, InferSelectModel } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { notificationChannels } from "../../db/postgres/schema.js";
import { createServiceLogger } from "../../lib/logger/logger.js";
import { sendEmail } from "../../lib/resend.js";
import { sendSMS } from "../../lib/twilio.js";

// Type inferred from Drizzle schema
type NotificationChannel = InferSelectModel<typeof notificationChannels>;

interface Monitor {
  id: number;
  organizationId: string;
  name?: string | null;
  monitorType: string;
  httpConfig?: {
    url: string;
  } | null;
  tcpConfig?: {
    host: string;
    port: number;
  } | null;
}

interface Incident {
  id: number;
  region?: string | null;
  startTime: string;
  endTime?: string | null;
  lastError?: string | null;
  lastErrorType?: string | null;
  status: string;
}

export class NotificationService {
  private logger = createServiceLogger("notification-service");

  async sendTestNotification(channel: NotificationChannel, monitor: Monitor, incident: Incident, eventType: "down" | "recovery"): Promise<void> {
    try {
      if (channel.type === "email" && channel.config.email) {
        await this.sendEmailNotification(channel.config.email, monitor, incident, eventType);
      } else if (channel.type === "discord" && channel.config.webhookUrl) {
        await this.sendDiscordNotification(channel.config.webhookUrl, monitor, incident, eventType);
      } else if (channel.type === "slack" && channel.config.slackWebhookUrl) {
        await this.sendSlackNotification(
          channel.config.slackWebhookUrl,
          channel.config.slackChannel,
          monitor,
          incident,
          eventType,
        );
      } else if (channel.type === "sms" && channel.config.phoneNumber) {
        await this.sendSMSNotification(channel.config.phoneNumber, monitor, incident, eventType);
      }
    } catch (error) {
      this.logger.error({ channelType: channel.type, error }, "Failed to send test notification");
      throw error;
    }
  }

  async sendIncidentNotifications(monitor: Monitor, incident: Incident, eventType: "down" | "recovery"): Promise<void> {
    try {
      // Get all enabled notification channels for this organization
      const channels = await db.query.notificationChannels.findMany({
        where: and(
          eq(notificationChannels.organizationId, monitor.organizationId),
          eq(notificationChannels.enabled, true),
        ),
      });

      // Filter channels that should receive notifications for this monitor
      const relevantChannels = channels.filter((channel) => {
        // Check if channel triggers for this event type
        if (!channel.triggerEvents?.includes(eventType)) {
          return false;
        }

        // Check if channel monitors this specific monitor or all monitors
        if (channel.monitorIds === null) {
          // null means all monitors
          return true;
        }

        return channel.monitorIds.includes(monitor.id);
      });

      // Check cooldown for each channel
      const now = new Date();
      const channelsToNotify = relevantChannels.filter((channel) => {
        if (!channel.lastNotifiedAt) return true;

        const lastNotified = new Date(channel.lastNotifiedAt);
        const cooldownMs = (channel.cooldownMinutes || 5) * 60 * 1000;
        return now.getTime() - lastNotified.getTime() > cooldownMs;
      });

      // Send notifications for each channel
      for (const channel of channelsToNotify) {
        try {
          if (channel.type === "email" && channel.config.email) {
            await this.sendEmailNotification(channel.config.email, monitor, incident, eventType);
          } else if (channel.type === "discord" && channel.config.webhookUrl) {
            await this.sendDiscordNotification(channel.config.webhookUrl, monitor, incident, eventType);
          } else if (channel.type === "slack" && channel.config.slackWebhookUrl) {
            await this.sendSlackNotification(
              channel.config.slackWebhookUrl,
              channel.config.slackChannel,
              monitor,
              incident,
              eventType,
            );
          } else if (channel.type === "sms" && channel.config.phoneNumber) {
            await this.sendSMSNotification(channel.config.phoneNumber, monitor, incident, eventType);
          }

          // Update last notified time for successful notifications
          await db
            .update(notificationChannels)
            .set({ lastNotifiedAt: now.toISOString() })
            .where(eq(notificationChannels.id, channel.id));
        } catch (error) {
          this.logger.error({ channelType: channel.type, channelId: channel.id, error }, "Failed to send notification");
        }
      }
    } catch (error) {
      this.logger.error(error, "Failed to send incident notifications");
    }
  }

  private async sendEmailNotification(
    email: string,
    monitor: Monitor,
    incident: Incident,
    eventType: "down" | "recovery",
  ): Promise<void> {
    const monitorName =
      monitor.name || monitor.httpConfig?.url || `${monitor.tcpConfig?.host}:${monitor.tcpConfig?.port}`;
    const region = incident.region || "local";
    const incidentTime = DateTime.fromSQL(incident.startTime).toLocaleString(DateTime.DATETIME_FULL);

    let subject: string;
    let html: string;

    if (eventType === "down") {
      subject = `🔴 Monitor Alert: ${monitorName} is DOWN`;
      html = `
        <h2>Monitor Alert: ${monitorName} is DOWN</h2>
        <p>Your monitor has stopped responding.</p>
        <ul>
          <li><strong>Monitor:</strong> ${monitorName}</li>
          <li><strong>Type:</strong> ${monitor.monitorType.toUpperCase()}</li>
          <li><strong>Region:</strong> ${region}</li>
          <li><strong>Time:</strong> ${incidentTime}</li>
          ${incident.lastError ? `<li><strong>Error:</strong> ${incident.lastError}</li>` : ""}
        </ul>
        <p>We'll continue monitoring and notify you when the service recovers.</p>
      `;
    } else {
      const duration = incident.endTime
        ? DateTime.fromSQL(incident.endTime)
            .diff(DateTime.fromSQL(incident.startTime))
            .toFormat("hh 'hours' mm 'minutes'")
        : "Unknown";

      subject = `✅ Monitor Recovery: ${monitorName} is UP`;
      html = `
        <h2>Monitor Recovery: ${monitorName} is UP</h2>
        <p>Your monitor has recovered and is responding normally.</p>
        <ul>
          <li><strong>Monitor:</strong> ${monitorName}</li>
          <li><strong>Type:</strong> ${monitor.monitorType.toUpperCase()}</li>
          <li><strong>Region:</strong> ${region}</li>
          <li><strong>Downtime Duration:</strong> ${duration}</li>
          <li><strong>Recovery Time:</strong> ${DateTime.now().toLocaleString(DateTime.DATETIME_FULL)}</li>
        </ul>
      `;
    }

    await sendEmail(email, subject, html);
    this.logger.info({ eventType, email, monitorId: monitor.id }, "Sent email notification");
  }

  private async sendDiscordNotification(
    webhookUrl: string,
    monitor: Monitor,
    incident: Incident,
    eventType: "down" | "recovery",
  ): Promise<void> {
    const monitorName =
      monitor.name || monitor.httpConfig?.url || `${monitor.tcpConfig?.host}:${monitor.tcpConfig?.port}`;
    const region = incident.region || "local";

    const embed = {
      title:
        eventType === "down" ? `🔴 Monitor Alert: ${monitorName} is DOWN` : `✅ Monitor Recovery: ${monitorName} is UP`,
      color: eventType === "down" ? 0xff0000 : 0x00ff00,
      fields: [
        {
          name: "Monitor",
          value: monitorName,
          inline: true,
        },
        {
          name: "Type",
          value: monitor.monitorType.toUpperCase(),
          inline: true,
        },
        {
          name: "Region",
          value: region,
          inline: true,
        },
        ...(eventType === "down"
          ? [
              {
                name: "Time",
                value: DateTime.fromSQL(incident.startTime).toLocaleString(DateTime.DATETIME_FULL),
                inline: false,
              },
              ...(incident.lastError
                ? [
                    {
                      name: "Error",
                      value: incident.lastError,
                      inline: false,
                    },
                  ]
                : []),
            ]
          : [
              {
                name: "Downtime Duration",
                value: incident.endTime
                  ? DateTime.fromSQL(incident.endTime)
                      .diff(DateTime.fromSQL(incident.startTime))
                      .toFormat("hh 'hours' mm 'minutes'")
                  : "Unknown",
                inline: true,
              },
              {
                name: "Recovery Time",
                value: DateTime.now().toLocaleString(DateTime.DATETIME_FULL),
                inline: true,
              },
            ]),
      ],
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }

    this.logger.info({ eventType, monitorId: monitor.id }, "Sent Discord notification");
  }

  private async sendSlackNotification(
    webhookUrl: string,
    slackChannel: string | undefined,
    monitor: Monitor,
    incident: Incident,
    eventType: "down" | "recovery",
  ): Promise<void> {
    const monitorName =
      monitor.name || monitor.httpConfig?.url || `${monitor.tcpConfig?.host}:${monitor.tcpConfig?.port}`;
    const region = incident.region || "local";
    const emoji = eventType === "down" ? ":red_circle:" : ":white_check_mark:";

    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text:
            eventType === "down"
              ? `${emoji} Monitor Alert: ${monitorName} is DOWN`
              : `${emoji} Monitor Recovery: ${monitorName} is UP`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Monitor:*\n${monitorName}`,
          },
          {
            type: "mrkdwn",
            text: `*Type:*\n${monitor.monitorType.toUpperCase()}`,
          },
          {
            type: "mrkdwn",
            text: `*Region:*\n${region}`,
          },
          ...(eventType === "down"
            ? [
                {
                  type: "mrkdwn",
                  text: `*Time:*\n${DateTime.fromSQL(incident.startTime).toLocaleString(DateTime.DATETIME_FULL)}`,
                },
              ]
            : [
                {
                  type: "mrkdwn",
                  text: `*Duration:*\n${
                    incident.endTime
                      ? DateTime.fromSQL(incident.endTime)
                          .diff(DateTime.fromSQL(incident.startTime))
                          .toFormat("hh 'hours' mm 'minutes'")
                      : "Unknown"
                  }`,
                },
              ]),
        ],
      },
    ];

    if (eventType === "down" && incident.lastError) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Error:* ${incident.lastError}`,
        },
      });
    }

    const payload: any = {
      blocks,
      text: eventType === "down" ? `Monitor Alert: ${monitorName} is DOWN` : `Monitor Recovery: ${monitorName} is UP`,
    };

    if (slackChannel) {
      payload.channel = slackChannel;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }

    this.logger.info({ eventType, monitorId: monitor.id }, "Sent Slack notification");
  }

  private async sendSMSNotification(
    phoneNumber: string,
    monitor: Monitor,
    incident: Incident,
    eventType: "down" | "recovery",
  ): Promise<void> {
    const monitorName =
      monitor.name || monitor.httpConfig?.url || `${monitor.tcpConfig?.host}:${monitor.tcpConfig?.port}`;
    const region = incident.region || "local";

    let message: string;
    if (eventType === "down") {
      message = `🔴 ALERT: ${monitorName} is DOWN in ${region}`;
      if (incident.lastError) {
        // Truncate error to fit SMS limits
        const truncatedError = incident.lastError.length > 50 
          ? incident.lastError.substring(0, 47) + "..."
          : incident.lastError;
        message += ` - ${truncatedError}`;
      }
    } else {
      const duration = incident.endTime
        ? DateTime.fromSQL(incident.endTime)
            .diff(DateTime.fromSQL(incident.startTime))
            .toFormat("h'h' m'm'")
        : "Unknown";
      message = `✅ RECOVERY: ${monitorName} is UP in ${region} after ${duration} downtime`;
    }

    // SMS messages should be concise - limit to 160 chars for single SMS
    if (message.length > 160) {
      message = message.substring(0, 157) + "...";
    }

    const result = await sendSMS(phoneNumber, message);
    
    if (!result.success) {
      throw new Error(result.error || "Failed to send SMS");
    }

    this.logger.info({ eventType, phoneNumber, monitorId: monitor.id }, "Sent SMS notification");
  }
}
