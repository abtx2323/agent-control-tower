# Agent Approval Desk

A static, no-account canvas for reviewing everything your AI agents are waiting on you for, styled as an air traffic control tower. Every request is a plane: the longer it waits, the more fuel it burns and the closer it drifts to the runway.

## Features

- **Live approach radar.** Planes spiral in toward the runway in real time while their fuel burns. Wait times, fuel and stats update live. A sim clock runs at 1x, 10x or 60x (1x = one simulated minute per second).
- **Landing animations.** *Land it* glides the plane onto the runway with a touchdown flash, then parks it in the "On the ground" row. *Send around* loops it back out to the outer ring and refuels it while the agent works on changes. *Holding pattern* flies it in a circle for a few seconds, then it rejoins the approach.
- **Keyboard landing run.** *Clear the skies* starts a timed run that always serves the most urgent plane. Decide with one key and it jumps to the next plane. A streak counter tracks back-to-back decisions, and a finish screen shows your time, landings and best streak.
- **Tower radio.** A scrolling log of call-and-response radio lines for every decision, low-fuel call, mayday and weather change (last 30 calls).
- **Mayday mode.** A plane that hits 0% fuel declares an emergency. The radar edge pulses red, the plane gets a MAYDAY badge and it jumps to the top of the queue.
- **Agent weather.** Risky requests (security reviews and anything that sends, publishes or shares externally) spawn storm cells on the radar. Planes route around them, and the detail card shows the weather.
- Click any plane for details, risk notes and a decision note. Sample data is included, so it works right away without a connected account. Animations respect `prefers-reduced-motion`.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `F` | Start or exit *Clear the skies* focus mode |
| `L` | Land it |
| `S` | Send around (request changes) |
| `H` | Holding pattern |
| `N` | Next low-fuel plane |
| `Esc` | Exit focus mode |
| `R` | Run it again (on the finish screen) |

Keys are ignored while you type in the decision note box.

## Run it

Open `index.html` in a browser. Everything is static: no build step, no network calls and no external libraries. A strict Content Security Policy is included.

Sample requests live in `approvals.json` (mirrored inline in `index.html`). `minutesAgo` sets how long each request has been waiting when the page loads.

This repo intentionally does not auto-send or auto-merge anything.
