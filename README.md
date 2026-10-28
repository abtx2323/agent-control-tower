# Agent Control Tower

A static, no-account canvas for reviewing everything your AI agents are waiting on you for, styled as an air traffic control tower. Every request is a plane: the longer it waits, the more fuel it burns and the closer it drifts to the runway.

![Agent Control Tower: the radar shows six agent requests as planes, with Mila's draft in MAYDAY at 0% fuel and the radar edge glowing red, and the detail card on the right showing its wait, fuel, weather, risk note and the Land it, Send around and Holding pattern buttons](assets/screenshot.png)

## Try it in 60 seconds

**Live demo:** https://abtx2323.github.io/agent-control-tower/

No sign-in or install. Six sample requests from AI agents load automatically, and the sim clock starts at 10x. Follow these steps in order:

1. **Open the page.** The status bar shows **Planes in the air: 6** and **Landed today: 0**. Above the radar you'll see **4 storm cells on approach**, and the **Tower radio** log under the radar starts with "Control Tower online. 6 inbound, runway 27 active." plus one weather call for each storm cell.
2. **Watch for a mayday (about 6 seconds).** Mila's email draft starts at 5% fuel. When it reaches 0%, the plane gets a **MAYDAY** badge, the radar edge pulses red, and the radio logs "MAYDAY MAYDAY MAYDAY, Draft 401, fuel exhausted!"
3. **Review a request.** Click the plane labeled **Mila**. The card on the right shows "Customer wrap-up email for regional launch", **Status: MAYDAY**, "Weather: storm cell, external-facing", the risk note, and three buttons: **Land it**, **Send around** and **Holding pattern**.
4. **Approve it.** Click **Land it**. The radio logs "cleared to land, Draft 401." The plane glides onto the runway, **Planes in the air** drops to 5, **Landed today** goes up to 1, and the red pulse stops. About 3 seconds later, a **Mila · Draft 401** chip appears under **On the ground**, the radio says "Draft 401 on the ground. Welcome home, Mila.", and the weather drops to **3 storm cells on approach**.
5. **Put one on hold.** Click the plane labeled **Dependabot**. Its card shows "Weather: storm cell, security review". Click **Holding pattern**. The plane gets a **HOLD** badge, the radio logs "enter the hold, PR 219.", and the plane flies two small loops. About 6 seconds later, the radio logs "rejoin the approach, PR 219." and the plane returns to the queue.
6. **Change the sim speed.** Next to **Sim speed**, click **60x**. The radar clock now ends in "· 60x", the radio logs "Sim clock set to 60x.", and fuel drains six times faster (one simulated hour per real second). Click **10x** to go back.
7. **Do a keyboard-only landing run.** Press **F** (or click **Clear the skies**). The **Clear the skies** panel opens on the most urgent plane, with a run timer and a streak badge. Its label shows why that plane is first and its place in the queue, for example **LOWEST FUEL · 1 OF 5**, or **MAYDAY · PRIORITY 1 OF 5** if another plane has run out of fuel by then. Now use only the keyboard:
   - Press **L** to land the plane shown. The panel jumps to the next plane.
   - Press **S** to send that one around. The radio logs "go around, … Changes requested." and the plane parks on the outer ring, labeled "with agent". It stays there and no longer counts toward **Planes in the air**.
   - Press **N** to skip to the next plane in the queue without deciding.
   - Press **H** to hold it.

   Decisions made within 15 seconds of each other build the **Streak**, and a mayday resets it. At 3 or more in a row, the radio says "… in a row. Smooth operating."
8. **Clear the skies.** Keep pressing **L** until nothing is left in the air. While a plane is still holding, the panel says "Queue empty. Waiting on 1 holding plane to rejoin…". When it rejoins, press **L** again. A **Skies cleared in m:ss** card then appears with your landed, sent-around and hold counts and your best streak, and the radio logs "All stations, skies are clear." The time and counts cover the whole session since the page loaded: the timer started at your first decision in step 4, and the landing and hold from steps 4 and 5 are included. Press **Esc** to close the card.
9. **Restart.** Press **R** (or click **Run it again**). All six sample requests reload, the radio log starts over, and a new landing run begins in focus mode. Press **Esc** to leave focus mode.

All keys are listed under [Keyboard shortcuts](#keyboard-shortcuts).

### Quick self-test

- [ ] The browser console shows no errors.
- [ ] The Network tab shows only the page's own files (`index.html`, `styles.css`, `app.js` and `assets/favicon.svg`) and no requests to other sites.
- [ ] Steps 1–9 above behave as described.

## Features

- **Live approach radar.** Planes spiral in toward the runway in real time while their fuel burns. Wait times, fuel and stats update live. A sim clock runs at 1x, 10x or 60x (1x = one simulated minute per second).
- **Landing animations.** *Land it* glides the plane onto the runway with a touchdown flash, then parks it in the "On the ground" row. *Send around* loops it back out to the outer ring, where it parks as "with agent" while the agent works on changes. It does not come back and no longer counts as in the air. *Holding pattern* flies it in two small loops over about 6 seconds, then it rejoins the approach.
- **Keyboard landing run.** *Clear the skies* serves the most urgent plane first (maydays, then lowest fuel). Decide with one key and it jumps to the next plane. A streak counter tracks back-to-back decisions, and when the skies are clear a finish card shows your time, landings, send-arounds, holds and best streak. The timer starts at your first decision (or when you press F, if that comes first), and the counts include every decision since the page loaded or restarted.
- **Tower radio.** A scrolling log of call-and-response radio lines for every decision, low-fuel call, mayday, weather change, hold and rejoin, sim speed change and landing run start (last 30 calls).
- **Mayday mode.** A plane that hits 0% fuel declares an emergency. The radar edge pulses red, the plane gets a MAYDAY badge and it jumps to the top of the queue.
- **Agent weather.** Requests that need a security review, or whose approval mentions sending, publishing or sharing, spawn storm cells on the radar. Planes route around them, and the detail card shows the weather.
- **Scenarios.** Choose a themed shift (Classic, Launch Day, Critical Bug, Security Incident or All Hands Review), each with its own queue, urgency, weather and wind. Generated scenarios use a fixed seed, so each replay is identical.
- **Radar layers.** Toggle flight trails, approach vectors and the wind indicator independently from the *Layers* buttons. Wind also affects storm routing.
- **Medals.** Earn six medals for landing performance, fuel, risk, speed, mayday avoidance and streaks. Medals are saved in `localStorage`, and the finish card shows the current scenario, difficulty and previous-run comparison.
- **Undo.** Withdraw the most recent decision once per plane. The plane returns to the radar, stats are restored and the related radio lines are struck through.
- Click any plane for details, risk notes and a decision note. Sample data is included, so it works right away without a connected account. Animations respect `prefers-reduced-motion`.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `F` | Start or exit *Clear the skies* focus mode |
| `L` | Land it |
| `S` | Send around (request changes) |
| `H` | Holding pattern |
| `N` | Next lowest-fuel plane |
| `U` | Undo the last decision |
| `Esc` | Exit focus mode, or close the finish card |
| `R` | Replay the selected scenario (on the finish screen) |

Keys are ignored while you type in the decision note box.

## Run it locally

Everything is static: no build step, no network calls and no external libraries. A strict Content Security Policy is included. The sample data is inline in `index.html`, so you can open the file directly in a browser. To serve it instead:

```sh
git clone https://github.com/abtx2323/agent-control-tower.git
cd agent-control-tower
python3 -m http.server 8000
```

Then open http://localhost:8000/ and follow [Try it in 60 seconds](#try-it-in-60-seconds).

The page reads the sample requests from the inline `seedData` block in `index.html`; `approvals.json` is a reference copy of the same data. `minutesAgo` sets how long each request has been waiting when the page loads.

This repo intentionally does not auto-send or auto-merge anything.

## License

MIT. See [LICENSE](LICENSE).
