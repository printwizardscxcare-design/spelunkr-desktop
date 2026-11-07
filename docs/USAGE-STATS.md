# Optional usage statistics

Spelunkr Desktop can report a small activity signal to PostHog so the maintainer can see how many participating installations are active and their approximate countries. Reporting is **off until you choose Enable reporting**. Declining is remembered. You can change the choice under **Settings → Usage statistics**.

## What is sent

When enabled in a configured release build, the app sends `app_active` at most once every 30 minutes while the player window has focus or video is playing:

- A randomly generated installation ID, unrelated to your name or accounts
- App version and operating system (Windows, Mac, or Linux)
- Event time and the activity signal itself

There is no reporting of channel names, videos watched, browsing URLs, audio, subtitles, names, email addresses, screen recordings, clicks, or errors. The analytics client runs in the app's main process. No analytics API or SDK is added to the live website.

PostHog necessarily receives the connection IP address to receive an event and estimate the country. The configured project discards raw IPs. A transformation after GeoIP keeps country name/code and the allowlisted app fields, removing city, subdivisions, coordinates, timezone, postal code, and person-profile updates before storage. No GPS or location permission is requested. The live Spelunkr website and media hosts make their own requests independently of this setting.

Turning reporting off cancels an in-flight request, stops future reports, and deletes the local reporting ID. Already received events are not remotely deleted by this switch. A later opt-in creates a fresh ID. If a request fails, playback continues; there is no backlog of usage events to upload later. Unconfigured builds and development/test builds do not report.

## Viewing the dashboard

The maintainer's [Spelunkr Desktop usage dashboard](https://us.posthog.com/project/718678/dashboard/2319399) contains:

- Unique active installations in the past hour
- Unique active installations over seven days
- Daily active installations over 30 days
- A country map for the past seven days

These are counts of **opted-in installations, not individual people**. Two computers may be the same person, shared computers may have several viewers, and a new reporting ID can count separately. Opted-out and offline installations are absent. Countries are approximate and can reflect a VPN, proxy, or network provider. One installation can appear under multiple countries if it travels. Daily charts use the PostHog project's timezone (currently UTC); the recent and seven-day summaries use explicit rolling time filters.

The dashboard filters on `app_active`. Maintainer checks use `app_analytics_test` and never count as real app activity. Synthetic verification confirmed that two events on different days from the same test ID count as one installation across the period. Stored test events kept country and had no raw IP, city, coordinates, or person-update fields.

## Build configuration

Only PostHog's **public project ingestion token** belongs in the app. Never package a personal/secret API key. Configuration comes from these environment variables:

```text
POSTHOG_PROJECT_TOKEN=your_public_project_ingestion_token
POSTHOG_HOST=your_project_ingestion_host
POSTHOG_PRIVACY_CONFIGURED=1
```

The host must match the project's US or EU ingestion host. For local packaging, these values may be stored in ignored `.env.stats.local`. `scripts/build-usage-config.cjs`, called by the preload build, generates ignored `src/usage-config.json` for packaging. Missing or invalid configuration disables reporting. GitHub installer workflows read the same values from repository variables. The privacy flag must stay off until the backend's IP-discard and country-only rules are verified.

The current connected project is 718678. It has IP discard on, automatic capture and recordings off, and the [country-only usage transformation](https://us.posthog.com/project/718678/functions/01a1b806-c5d0-0000-e1f1-26f03d32ebdc) after GeoIP. The transformation only applies to the two Spelunkr event names.

Tests cover no requests before consent, no development reporting, exact event fields, inactive windows, throttling across restarts, opting out, fresh IDs on re-opt-in, failed persistence, and native consent defaults. Run `node scripts/check-usage-ingestion.cjs` only for an intentional maintainer ingestion test; it sends two synthetic test events.

PostHog references: [IP data and location enrichment](https://posthog.com/docs/privacy/data-collection#ip-data-capture), [processing before storage](https://posthog.com/docs/privacy/data-storage), and [event capture API](https://posthog.com/docs/api/capture).
