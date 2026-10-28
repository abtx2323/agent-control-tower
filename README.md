# Agent Control Tower

A static, no-account canvas for reviewing everything your AI agents are waiting on you for, styled as an air traffic control tower. Every request is a plane: the longer it waits, the more fuel it burns. Land it, send it around, or hold it—and watch your decisions ripple across the radar in real time.

![Agent Control Tower mid-shift in the Launch Day scenario: seven agent requests circle the radar with the Trails, Vectors and Wind layers on, two low-fuel planes glow red, three planes are on the ground, the detail card shows Dependabot's "Trim CI matrix" pull request waiting on a security review, and the Tower radio logs a Perfect Landing medal and a 3-in-a-row streak.](assets/screenshot.png)

## Try it in 60 seconds

**Live demo:** https://abtx2323.github.io/agent-control-tower/

No sign-in or install. The walkthrough uses the **Classic** scenario, which loads six sample requests from AI agents, and the sim clock starts at 10x. Your scenario choice is remembered between visits, so pick **Classic** in the scenario picker if the page opens on a different one. Follow these steps in order:

1. **Open the page.** The status bar shows **Planes in the air: 6** and **Landed today: 0**. Above the radar you'll see **4 storm cells on approach**, and the **Tower radio** log under the radar shows the latest air traffic calls.
2. **Watch for a mayday (about 6 seconds).** Mila's email draft starts at 5% fuel. When it reaches 0%, the plane gets a **MAYDAY** badge, the radar edge pulses red, and the radio logs "MAYDAY MAYDAY MAYDAY".
3. **Review a request.** Click the plane labeled **Mila**. The card on the right shows "Customer wrap-up email for regional launch", **Status: MAYDAY**, "Weather: storm cell, external-facing", the wait time and fuel, and decision buttons.
4. **Approve it.** Click **Land it**. The radio logs "cleared to land, Draft 401." The plane glides onto the runway, **Planes in the air** drops to 5, **Landed today** goes up to 1, and the red pulsing stops.
5. **Put one on hold.** Click the plane labeled **Dependabot**. Its card shows "Weather: storm cell, security review". Click **Holding pattern**. The plane gets a **HOLD** badge, the radio logs "enter the hold, PR 219." The plane flies two small loops and rejoins the approach about 6 seconds later.
6. **Change the sim speed.** Next to **Sim speed**, click **60x**. The radar clock now ends in "· 60x", the radio logs "Sim clock set to 60x.", and fuel drains six times faster (one simulated hour per second). Click **10x** to go back.
7. **Do a keyboard-only landing run.** Press **F** (or click **Clear the skies**). The **Clear the skies** panel opens on the most urgent plane, with a run timer and a streak badge. Its label shows the plane's priority, like "LOWEST FUEL · 1 OF 5" or "MAYDAY · PRIORITY 1 OF 5".
   - Press **L** to land the plane shown. The panel jumps to the next plane.
   - Press **S** to send that one around. The radio logs "go around, … Changes requested." and the plane parks on the outer ring, labeled "with agent". It stays there and no longer counts toward fuel urgency or **Planes in the air**.
   - Press **N** to skip to the next plane in the queue without deciding.
   - Press **H** to hold it.

   Decisions made within 15 seconds of each other build the **Streak**, and a mayday resets it. At 3 or more in a row, the radio says "… in a row. Smooth operating."
8. **Clear the skies.** Keep pressing **L** until nothing is left in the air. While a plane is still holding, the panel says "Queue empty. Waiting on 1 holding plane to rejoin…". When it rejoins the queue, finish when you land it. A finish card appears:
   - **Skies cleared in m:ss**, followed by your landed, sent-around and hold counts and best streak.
   - The radio logs "All stations, skies are clear."
   - A line with the scenario and difficulty, the medals you earned, and a comparison with your previous run on that scenario.
   - Press **Esc** to close it.
9. **Replay.** Press **R** or click **Replay scenario (R, finish screen only)**. This reloads the current scenario. All six sample requests reload, the radio log starts over, and a new landing run begins in focus mode. Press **Esc** to leave focus mode.

All keys are listed under [Keyboard shortcuts](#keyboard-shortcuts).

### Quick self-test

- [ ] The browser console shows no errors.
- [ ] The Network tab shows only the page's own files (`index.html`, `styles.css`, `app.js` and `assets/favicon.svg`) and no requests to other sites.
- [ ] Steps 1–9 above behave as described.

## Features

- **Live approach radar.** Planes spiral in toward the runway in real time while their fuel burns. Wait times, fuel and stats update live. A sim clock runs at 1x, 10x or 60x (1x = one simulated minute per second). Wind only bends routes around storm cells.
- **Landing animations.** *Land it* glides the plane onto the runway with a touchdown flash, then parks it in the "On the ground" row. *Send around* loops it back out to the outer ring, where it waits for changes to be addressed. *Holding pattern* flies the plane in loops for about 6 seconds and then rejoins the approach.
- **Keyboard landing run.** *Clear the skies* (press **F**) serves the most urgent plane first (maydays, then lowest fuel). Decide with one key (**L** to land, **S** to send around, **H** to hold, **N** to skip) and it jumps to the next plane. A streak counter tracks back-to-back decisions within 15 seconds.
- **Tower radio.** A scrolling log of call-and-response radio lines for every decision, low-fuel call, mayday, weather change, hold and rejoin, sim speed change and landing run start (the log keeps the last 30 calls).
- **Mayday mode.** A plane that hits 0% fuel declares an emergency. The radar edge pulses red, the plane gets a MAYDAY badge and it jumps to the top of the queue.
- **Agent weather.** Requests that need a security review, or whose approval mentions sending, publishing or sharing, spawn storm cells on the radar. Planes route around them, and the detail card notes the weather condition.
- **Scenarios.** Pick a scenario from the picker; the choice is remembered. Each has a difficulty and a fixed seed, so the same requests load every time:
  - **Classic Shift** (Easy): the original six-plane sample queue.
  - **Launch Day** (Medium, seed 1101): heavy PR volume, some risky, moderate weather.
  - **Critical Bug** (Hard, seed 2202): few urgent items, extreme weather, tanks nearly dry.
  - **Security Incident** (Hard, seed 3303): drafts and PRs mixed, elevated risk, lots of outbound comms.
  - **All Hands Review** (Medium, seed 4404): a balanced queue with every kind of agent.
- **Radar layers.** *Layers* is a row of three toggle buttons:
  - **Trails** — short fading tails behind each plane.
  - **Vectors** — approach lines toward the runway.
  - **Wind** — an indicator and drifting streaks showing the wind direction (0° = north). Wind only bends routes around storm cells.
- **Medals.** Earn six medals for landing performance, fuel efficiency, risk mitigation, decision speed, mayday avoidance and streaks. Medals are saved in `localStorage`, and the finish card shows the current scenario, difficulty and which medals you've earned.
- **Undo.** Press **U** to withdraw the most recent decision once per plane. The plane returns to the radar, stats are restored and the related radio lines are struck through.
- **Replay.** After you finish a scenario, press **R** on the finish screen (or click **Replay scenario**) to replay it with the same requests and conditions. Perfect for practicing a tricky shift.
- Click any plane for details, risk notes and a decision note. Sample data is included, so it works right away without a connected account. Animations respect `prefers-reduced-motion`.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `F` | Start or exit *Clear the skies* focus mode |
| `L` | Land it |
| `S` | Send around (request changes) |
| `H` | Holding pattern |
| `N` | Next plane in queue order (turns on focus mode if it's off) |
| `U` | Undo the last decision |
| `R` | Replay the current scenario (finish screen only) |
| `Esc` | Exit focus mode, or close the finish card |

Keys are ignored while you type in the decision note box.

## How Copilot built this

Built with **GitHub Copilot**; the commits and pull requests in this repository show how.

- **Rendering:** only the trails, approach vectors and wind streaks are drawn on a canvas. Planes and storm cells are HTML elements positioned on the radar.
- **Mechanics and UI:** the streak counter, medals, undo, scenarios, radar layers and keyboard shortcuts were added through iterative commits and PRs.
- **Self-test and polish:** the quick self-test checklist, the Content Security Policy and `prefers-reduced-motion` support are part of the same history.

## Run it locally

Everything is static: no build step, no network calls and no external libraries. A strict Content Security Policy is included. The sample data is inline in `index.html`, so you can open the file directly in a browser or run a local server:

```sh
git clone https://github.com/abtx2323/agent-control-tower.git
cd agent-control-tower
python3 -m http.server 8000
```

Then open http://localhost:8000/ and follow [Try it in 60 seconds](#try-it-in-60-seconds).

The page reads the sample requests from the inline `seedData` block in `index.html`; `approvals.json` is a reference copy of the same data. `minutesAgo` sets how long each request has been waiting. Editing `seedData` only changes **Classic**; the other four scenarios are generated in `app.js`.

This repo intentionally does not auto-send or auto-merge anything.

## License

MIT. See [LICENSE](LICENSE).
