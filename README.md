# Maze Escape

A first-person 3D maze game built with Three.js. Navigate through procedurally generated dungeons, using torchlight to find your way to the exit.

## Features

- **Procedural maze generation** using recursive backtracking algorithm
- **Level progression** — mazes grow larger each level (11×11 → 51×51)
- **Dungeon atmosphere** — textured stone walls, flickering torches, fog
- **Navigation aids**:
  - Rubber ducks (8 per level) — drop glowing duck markers on the floor
  - Chalk marks (12 per level) — draw X marks on walls
  - Path hints (2 per level) — reveal the path to the exit
- **Smooth first-person controls** with collision detection

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Move forward |
| S / ↓ | Move backward |
| A / ← | Strafe left |
| D / → | Strafe right |
| Mouse | Look around |
| B | Drop rubber duck |
| C | Mark wall with chalk |
| P | Show path to exit (limited uses) |
| Esc | Release mouse pointer |

## How to Play

1. Click to start and lock your mouse pointer
2. Navigate through the maze to find the glowing green exit
3. Drop rubber ducks and chalk marks to track where you've been
4. Press P if you're stuck to reveal the path (limited to 2 per level)
5. Reach the exit to advance to the next level

## Running Locally

### Option 1: Using npx (recommended)

```bash
git clone https://github.com/rohanjoshi-fynd/maze-game.git
cd maze-game
npx serve .
```

Then open http://localhost:3000 in your browser.

### Option 2: Using Python

```bash
git clone https://github.com/rohanjoshi-fynd/maze-game.git
cd maze-game
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

### Option 3: Using VS Code Live Server

1. Clone the repository
2. Open the folder in VS Code
3. Install the "Live Server" extension
4. Right-click `index.html` and select "Open with Live Server"

> **Note**: A local server is required because the game uses ES6 modules, which don't work with `file://` URLs.

## Tech Stack

- **Three.js** — 3D rendering
- **Vanilla JavaScript** — ES6 modules
- **HTML/CSS** — UI overlay

## Project Structure

```
maze-game/
├── index.html          # Main HTML file
├── style.css           # UI styling
├── js/
│   ├── main.js         # Game initialization and loop
│   ├── maze.js         # Maze generation and rendering
│   ├── player.js       # Player movement and controls
│   ├── navigation.js   # Rubber ducks and chalk marks
│   └── themes.js       # Visual themes and textures
└── assets/
    ├── textures/
    │   └── dungeon/    # Wall, floor, ceiling textures
    └── models/
        └── rubber_duck_toy_2k.gltf/  # Duck marker model
```

## License

MIT
