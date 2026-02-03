import * as THREE from 'three';
import { Maze } from './maze.js';
import { Player } from './player.js';
import { NavigationAids } from './navigation.js';
import { ThemeManager, getThemeForLevel, themes } from './themes.js';

const HINTS_PER_LEVEL = 2;

class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.maze = null;
        this.navigation = null;
        this.themeManager = null;
        this.playerLight = null;
        this.ambientLight = null;

        this.clock = new THREE.Clock();
        this.elapsedTime = 0;
        this.isRunning = false;
        this.hasWon = false;
        this.level = 1;
        this.hintShown = false;
        this.isLoading = true;
        this.hintsRemaining = HINTS_PER_LEVEL;

        this.overlay = document.getElementById('overlay');
        this.instructions = document.getElementById('instructions');
        this.winMessage = document.getElementById('win-message');
        this.winTitle = document.getElementById('win-title');
        this.crosshair = document.getElementById('crosshair');
        this.levelDisplay = document.getElementById('level-display');
        this.sizeDisplay = document.getElementById('size-display');
        this.breadcrumbDisplay = document.getElementById('breadcrumb-count');
        this.chalkDisplay = document.getElementById('chalk-count');
        this.hintsDisplay = document.getElementById('hints-count');
        this.errorMessage = document.getElementById('error-message');
        this.controlsHint = document.getElementById('controls-hint');

        this.init();
    }

    async init() {
        this.setupScene();
        this.themeManager = new ThemeManager();

        // Load the initial theme
        const theme = getThemeForLevel(this.level);
        await this.themeManager.loadTheme('dungeon');

        this.applyTheme(theme);
        this.setupMaze();
        await this.maze.generate(this.level, 'dungeon');

        this.setupPlayer();
        this.setupNavigation();
        this.setupEventListeners();
        this.updateLevelUI();

        this.isLoading = false;
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
    }

    applyTheme(theme) {
        // Apply fog
        this.scene.fog = new THREE.Fog(
            theme.fog.color,
            theme.fog.near,
            theme.fog.far
        );
        this.scene.background = new THREE.Color(theme.fog.color);

        // Setup ambient light
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
        }
        this.ambientLight = new THREE.AmbientLight(
            theme.lighting.ambient.color,
            theme.lighting.ambient.intensity
        );
        this.scene.add(this.ambientLight);

        // Setup player torch light
        if (this.playerLight) {
            this.scene.remove(this.playerLight);
        }
        this.playerLight = new THREE.PointLight(
            theme.lighting.playerTorch.color,
            theme.lighting.playerTorch.intensity,
            theme.lighting.playerTorch.distance
        );
        this.playerLight.castShadow = true;
        this.playerLight.shadow.mapSize.width = 512;
        this.playerLight.shadow.mapSize.height = 512;
        this.scene.add(this.playerLight);
    }

    setupMaze() {
        this.maze = new Maze(this.scene, this.themeManager);
    }

    setupPlayer() {
        this.player = new Player(this.camera);
        this.player.setPosition(this.maze.getStartPosition());
        this.player.setWallBoundingBoxes(this.maze.getWallBoundingBoxes());
    }

    setupNavigation() {
        this.navigation = new NavigationAids(this.scene, this.camera);
        this.navigation.setWallMeshes(this.maze.getWallMeshes());

        this.navigation.onBreadcrumbDrop = (count) => {
            this.breadcrumbDisplay.textContent = count;
            this.hideHint();
        };

        this.navigation.onChalkMark = (count) => {
            this.chalkDisplay.textContent = count;
            this.hideHint();
        };

        this.navigation.onError = (type) => {
            let message = '';
            switch (type) {
                case 'breadcrumb':
                    message = 'No ducks left';
                    break;
                case 'chalk':
                    message = 'No chalk left';
                    break;
                case 'no_wall':
                    message = 'No wall in sight';
                    break;
                case 'too_far':
                    message = 'Too far from wall';
                    break;
            }
            this.showError(message);
        };
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.add('visible');

        setTimeout(() => {
            this.errorMessage.classList.remove('visible');
        }, 1500);
    }

    hideHint() {
        if (!this.hintShown) {
            this.hintShown = true;
            this.controlsHint.classList.add('fade-out');
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        document.addEventListener('click', () => this.onClick());
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onKeyDown(event) {
        if (!this.isRunning || this.isLoading) return;

        if (event.code === 'KeyP') {
            this.revealPath();
        } else if (event.code === 'KeyO') {
            this.debugTeleportNearExit();
        }
    }

    revealPath() {
        if (this.hintsRemaining <= 0) {
            this.showError('No hints left');
            return;
        }

        const playerPos = this.player.getPosition();
        const success = this.maze.showPath(playerPos);

        if (success) {
            this.hintsRemaining--;
            this.hintsDisplay.textContent = this.hintsRemaining;
        }
    }

    debugTeleportNearExit() {
        const teleportPos = this.maze.findTeleportPosition();
        if (teleportPos) {
            this.player.setPosition(teleportPos);
            console.log('Teleported near exit (debug)');
        } else {
            console.log('Could not find teleport position');
        }
    }

    onClick() {
        if (this.isLoading) return;
        if (this.hasWon) return;

        if (!this.isRunning) {
            document.body.requestPointerLock();
        }
    }

    onPointerLockChange() {
        if (document.pointerLockElement === document.body) {
            this.isRunning = true;
            this.player.setLocked(true);
            this.navigation.setActive(true);
            this.overlay.classList.add('hidden');
            this.crosshair.classList.add('visible');
        } else {
            this.isRunning = false;
            this.player.setLocked(false);
            this.navigation.setActive(false);
            this.crosshair.classList.remove('visible');

            if (!this.hasWon) {
                this.overlay.classList.remove('hidden');
                this.instructions.classList.remove('hidden');
                this.winMessage.classList.remove('show');
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateLevelUI() {
        this.levelDisplay.textContent = `Level ${this.level}`;
        const size = this.maze.getSize();
        this.sizeDisplay.textContent = `${size.width} × ${size.height}`;
        this.breadcrumbDisplay.textContent = this.navigation.getBreadcrumbCount();
        this.chalkDisplay.textContent = this.navigation.getChalkCount();
        this.hintsDisplay.textContent = this.hintsRemaining;
    }

    checkWinCondition() {
        if (this.maze.checkExitCollision(this.player.getPosition())) {
            this.win();
        }
    }

    win() {
        this.hasWon = true;
        this.isRunning = false;
        this.player.setLocked(false);

        document.exitPointerLock();

        this.winTitle.textContent = `Level ${this.level} Complete!`;
        this.overlay.classList.remove('hidden');
        this.instructions.classList.add('hidden');
        this.winMessage.classList.add('show');
        this.crosshair.classList.remove('visible');

        setTimeout(() => this.nextLevel(), 2000);
    }

    async nextLevel() {
        this.level++;
        this.hasWon = false;
        this.isLoading = true;
        this.hintsRemaining = HINTS_PER_LEVEL;

        // Get theme for new level
        const theme = getThemeForLevel(this.level);
        const themeName = Object.keys(themes).find(key => themes[key] === theme) || 'dungeon';

        // Apply theme settings
        this.applyTheme(theme);

        this.navigation.reset();
        await this.maze.generate(this.level, themeName);

        this.player.reset();
        this.player.setPosition(this.maze.getStartPosition());
        this.player.setWallBoundingBoxes(this.maze.getWallBoundingBoxes());

        this.navigation.setWallMeshes(this.maze.getWallMeshes());

        this.updateLevelUI();

        this.winMessage.classList.remove('show');
        this.instructions.classList.add('hidden');
        this.overlay.classList.add('hidden');

        this.isLoading = false;
        document.body.requestPointerLock();
    }

    update(deltaTime) {
        if (!this.isRunning || this.isLoading) return;

        this.player.update(deltaTime);

        const playerPos = this.player.getPosition();
        this.playerLight.position.set(playerPos.x, playerPos.y - 0.3, playerPos.z);

        this.navigation.setPlayerPosition(playerPos);

        // Update torch flicker
        this.maze.updateTorchFlicker(this.elapsedTime);

        this.checkWinCondition();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();
        this.elapsedTime += deltaTime;

        this.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }
}

const game = new Game();
