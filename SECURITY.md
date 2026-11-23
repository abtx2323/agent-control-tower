# Security

Agent Control Tower is a single static page with sample data. It has no backend, no sign-in, no API keys and no network calls. The only things it saves are your scenario, radar layers, medals and recent run times, in your browser's local storage.

What it does to stay safe:

- The page ships a Content Security Policy that only allows its own script, styles and images and blocks every outgoing request (`connect-src 'none'`), so nothing you do on the page can be sent anywhere.
- A `no-referrer` policy means the page never sends its address to another site.

## Reporting a vulnerability

Please report security problems privately through GitHub's "Report a vulnerability" button on this repository's Security tab, not in a public issue. Include the steps to reproduce and the browser you used.
