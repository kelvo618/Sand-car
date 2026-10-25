# Dust Road Racer

A top-down desert racing game for phones and desktops. Race five other drivers over 100 levels, pick from **300 cars**, or race your friends online with a room code. Plain HTML, CSS and JavaScript. No build step.

**Play it:** `https://YOUR-USERNAME.github.io/dust-road-racer/` (after you enable GitHub Pages, see below)

## Features

- **Race vs the computer:** six cars on the grid, you plus five AI drivers. AI gets faster and makes fewer mistakes as levels climb.
- **100 levels:** longer races and more roadblocks every level. Finish in the top three to unlock the next level.
- **300 cars:** every car has its own name, colour, body shape, trim and stats (speed, acceleration, grip). Stat totals are balanced, so no car is simply the best. Browse them in the Garage.
- **Online races with friends:** one person creates a room and shares a 4-letter code. Up to 6 players, with any empty spots filled by computer drivers.
- **Roadblocks:** stalled cars and cones are the same for everyone in a race. Hitting one slows you down.

## Controls

| Input | Action |
| --- | --- |
| Hold left or right half of the screen | Steer (phone or tablet) |
| Arrow keys or A / D | Steer (keyboard) |

You accelerate automatically. Driving on the sand slows you down.

## Race with friends

1. Everyone opens the game page (the GitHub Pages link) on their own device.
2. One player taps **Race with friends**, then **Create a room**.
3. That player tells the others the 4-letter code. They tap **Join** and type it in.
4. The host picks a level and taps **Start race**.

How it works: the game uses [PeerJS](https://peerjs.com/) (loaded from jsDelivr). The free public PeerJS server only introduces players to each other, then the race runs directly between devices (WebRTC). That means:

- No game server of your own is needed, and it works on the same WiFi or over the internet.
- Some strict networks (school, work, some mobile carriers) block direct connections. If friends cannot join, try a different network or a phone hotspot.
- Cars do not collide with each other, which keeps online races smooth.
- If the public PeerJS server is down, online play will not connect, but solo racing still works.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. For online play across devices, use the GitHub Pages link (it is served over HTTPS).

## Publish on GitHub Pages

1. Create a new repository named `dust-road-racer`.
2. Upload `index.html`, `style.css`, `game.js`, `README.md` and `LICENSE` to the repository root.
3. Open **Settings > Pages**, set the source to **Deploy from a branch**, choose `main` and `/ (root)`, then save.
4. After a minute your game is live at `https://YOUR-USERNAME.github.io/dust-road-racer/`.

## Tweak it

- `car(i)` in `game.js` generates the 300 cars. Change `ADJ` and `NOUN` for new names.
- `row(r)` controls roadblock density per level. `physics()` controls speeds and handling.
- `L=15000+lvl*250` in `beginRace()` sets the race length.
- Progress, your chosen car and your name are saved in the browser (`localStorage`).

## License

MIT. See [LICENSE](LICENSE).
