# Agent Control Tower

A static, no-account canvas for reviewing everything your AI agents are waiting on you for, styled as an air traffic control tower. Every request is a plane: the longer it waits, the more fuel it burns. Land it, send it around, or hold it—and watch your decisions ripple across the radar in real time.

![Agent Control Tower mid-shift in the Launch Day scenario: seven agent requests circle the radar with the Trails, Vectors and Wind layers on, two low-fuel planes glow red, three planes are on the ground, the detail card shows Dependabot's "Trim CI matrix" pull request waiting on a security review, and the Tower radio logs a Perfect Landing medal and a 3-in-a-row streak.](assets/screenshot.png)

## Try it in 60 seconds

**Live demo:** https://abtx2323.github.io/agent-control-tower/

No sign-in or install. Six sample requests from AI agents load automatically, and the sim clock starts at 10x. Follow these steps in order:

1. **Open the page.** The status bar shows **Planes in the air: 6** and **Landed today: 0**. Above the radar you'll see **4 storm cells on approach**, and the **Tower radio** log under the radar shows the latest air traffic calls.
2. **Watch for a mayday (about 6 seconds).** Mila's email draft starts at 5% fuel. When it reaches 0%, the plane gets a **MAYDAY** badge, the radar edge pulses red, and the radio logs "MAYDAY MAYDAY MAYDAY".
3. **Review a request.** Click the plane labeled **Mila**. The card on the right shows "Customer wrap-up email for regional launch", **Status: MAYDAY**, "Weather: storm cell, external-facing", the wait time and fuel, and decision buttons.
4. **Approve it.** Click **Land it**. The radio logs "cleared to land, Draft 401." The plane glides onto the runway, **Planes in the air** drops to 5, **Landed today** goes up to 1, and the red pulsing stops.
5. **Put one on hold.** Click the plane labeled **Dependabot**. Its card shows "Weather: storm cell, security review". Click **Holding pattern**. The plane gets a **HOLD** badge, the radio logs "entering holding pattern" and it parks on the outer ring.
6. **Change the sim speed.** Next to **Sim speed**, click **60x**. The radar clock now ends in "· 60x", the radio logs "Sim clock set to 60x.", and fuel drains six times faster (one simulated hour per second).
7. **Do a keyboard-only landing run.** Press **F** (or click **Clear the skies**). The **Clear the skies** panel opens on the most urgent plane, with a run timer and a streak badge. Its label shows how many decisions you've made in a row.
   - Press **L** to land the plane shown. The panel jumps to the next plane.
   - Press **S** to send that one around. The radio logs "go around, … Changes requested." and the plane parks on the outer ring, labeled "with agent". It stays there and no longer counts toward fuel urgency.
   - Press **N** to skip to the next plane in the queue without deciding.
   - Press **H** to hold it.

   Decisions made within 15 seconds of each other build the **Streak**, and a mayday resets it. At 3 or more in a row, the radio says "… in a row. Smooth operating."
8. **Clear the skies.** Keep pressing **L** until nothing is left in the air. While a plane is still holding, the panel says "Queue empty. Waiting on 1 holding plane to rejoin…". When it rejoins the queue, finish when you land it.
9. **Restart.** Press **R** (or click **Run it again**). All six sample requests reload, the radio log starts over, and a new landing run begins in focus mode. Press **Esc** to leave focus mode.

All keys are listed under [Keyboard shortcuts](#keyboard-shortcuts).

### Quick self-test

- [ ] The browser console shows no errors.
- [ ] The Network tab shows only the page's own files (`index.html`, `styles.css`, `app.js` and `assets/favicon.svg`) and no requests to other sites.
- [ ] Steps 1–9 above behave as described.

## Features

- **Live approach radar.** Planes spiral in toward the runway in real time while their fuel burns. Wait times, fuel and stats update live. A sim clock runs at 1x, 10x or 60x (1x = one simulated minute per second). Wind direction shifts the spiral pattern.
- **Landing animations.** *Land it* glides the plane onto the runway with a touchdown flash, then parks it in the "On the ground" row. *Send around* loops it back out to the outer ring, where it waits for changes to be addressed. *Holding pattern* parks it mid-approach.
- **Keyboard landing run.** *Clear the skies* (press **F**) serves the most urgent plane first (maydays, then lowest fuel). Decide with one key (**L** to land, **S** to send around, **H** to hold, **N** to skip) and it jumps to the next plane. A streak counter tracks back-to-back decisions within 15 seconds.
- **Tower radio.** A scrolling log of call-and-response radio lines for every decision, low-fuel call, mayday, weather change, hold and rejoin, sim speed change and landing run start (last 30 calls visible; scroll for history).
- **Mayday mode.** A plane that hits 0% fuel declares an emergency. The radar edge pulses red, the plane gets a MAYDAY badge and it jumps to the top of the queue.
- **Agent weather.** Requests that need a security review, or whose approval mentions sending, publishing or sharing, spawn storm cells on the radar. Planes route around them, and the detail card notes the weather condition.
- **Scenarios.** Choose a themed shift—**Classic** (standard load), **Launch Day** (many releases), **Critical Bug** (high severity requests), **Security Incident** (locked-down approvals), or **All Hands Review** (high-volume company-wide decisions). Each scenario has its own queue, urgency, weather patterns and wind direction.
- **Radar layers.** Toggle three independent radar displays from the *Layers* menu:
  - **Flight trails** — Shows the spiral path each plane takes as it descends.
  - **Approach vectors** — Shows directional lines pointing each plane toward the runway.
  - **Wind indicator** — Shows the wind direction, which affects how planes route around storm cells.
- **Medals.** Earn six medals for landing performance, fuel efficiency, risk mitigation, decision speed, mayday avoidance and streaks. Medals are saved in `localStorage`, and the finish card shows the current scenario, difficulty and which medals you've earned.
- **Undo.** Press **U** to withdraw the most recent decision once per plane. The plane returns to the radar, stats are restored and the related radio lines are struck through.
- **Replay.** After you finish a scenario, press **R** (or click **Run it again**) to replay it with the same requests and conditions. Perfect for practicing a tricky shift.
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
| `R` | Replay the selected scenario |
| `Esc` | Exit focus mode, or close the finish card |

Keys are ignored while you type in the decision note box.

## How Copilot built this

This project was built using **GitHub Copilot** as a core development partner:

- **Architecture & planning:** Copilot helped design the radar physics, animation timing, and state machine for plane lifecycle (descending → mayday → landed/on-hold).
- **Canvas rendering:** Real-time 2D canvas updates for plane positions, spiral paths, storm cells and animations were co-authored with Copilot's suggestions for efficient redraw loops and performance optimization.
- **Game mechanics:** The streak counter, medal system, fuel burn rates and difficulty levels were iteratively refined through Copilot's implementations and suggestions.
- **Keyboard handling:** Copilot generated the focus-mode keyboard dispatcher, ensuring keys worked predictably during landing runs and were properly disabled during text input.
- **Radio log & state sync:** Copilot helped build the radio dispatch system and ensured every decision rippled correctly across the UI (plane position, fuel, badges, medal progress).
- **Sample data & scenarios:** Copilot generated the themed scenario data and the logic to load different request queues, weather patterns and wind conditions on demand.
- **Testing & polish:** Copilot suggestions accelerated the quick self-test checklist, CSP setup, and animations that respect user motion preferences.

The result is a fully static, zero-dependency web app built in a fraction of the time it would have taken solo—proof that effective AI collaboration can turn a complex interactive simulation into a polished, playable prototype.

## Run it locally

Everything is static: no build step, no network calls and no external libraries. A strict Content Security Policy is included. The sample data is inline in `index.html`, so you can open the file directly in a browser or run a local server:

```sh
git clone https://github.com/abtx2323/agent-control-tower.git
cd agent-control-tower
python3 -m http.server 8000
```

Then open http://localhost:8000/ and follow [Try it in 60 seconds](#try-it-in-60-seconds).

The page reads the sample requests from the inline `seedData` block in `index.html`; `approvals.json` is a reference copy of the same data. `minutesAgo` sets how long each request has been waiting. Edit these values to test different scenarios without changing the UI code.

This repo intentionally does not auto-send or auto-merge anything.

## License

MIT. See [LICENSE](LICENSE).
