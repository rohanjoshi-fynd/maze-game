import * as THREE from 'three';
import { themes } from './themes.js';

const WALL_HEIGHT = 3;
const CELL_SIZE = 1;
const MIN_SIZE = 11;
const MAX_SIZE = 51;
const SIZE_INCREMENT = 4;
const TEXTURE_SCALE = 0.5; // 1 repeat per 2 world units

export class Maze {
    constructor(scene, themeManager) {
        this.scene = scene;
        this.themeManager = themeManager;
        this.walls = [];
        this.wallBoundingBoxes = [];
        this.floorMesh = null;
        this.ceilingMesh = null;
        this.exitMesh = null;
        this.exitLight = null;
        this.wallTorches = [];
        this.startPosition = null;
        this.exitPosition = null;
        this.grid = null;
        this.width = 0;
        this.height = 0;
        this.currentThemeName = null;
        this.pathLine = null;
        this.pathFadeTimeout = null;

        this.pathMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff66,
            linewidth: 2
        });

        this.exitMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.8,
            roughness: 0.5
        });
    }

    async generate(level, themeName = 'dungeon') {
        this.clear();
        this.currentThemeName = themeName;

        this.width = this.getSizeForLevel(level);
        this.height = this.width;

        this.grid = this.createEmptyGrid();
        this.carvePassages();

        this.startPosition = new THREE.Vector3(1 * CELL_SIZE, 1.5, 1 * CELL_SIZE);
        this.exitPosition = new THREE.Vector3(
            (this.width - 2) * CELL_SIZE,
            0,
            (this.height - 2) * CELL_SIZE
        );

        await this.buildGeometry();

        // Debug logging
        const wallCount = this.wallBoundingBoxes.length;
        console.log(`[Maze] Generated ${this.width}x${this.height} maze`);
        console.log(`[Maze] Wall count: ${wallCount}`);
        console.log(`[Maze] Player start: (${this.startPosition.x}, ${this.startPosition.y}, ${this.startPosition.z})`);
        console.log(`[Maze] Exit position: (${this.exitPosition.x}, ${this.exitPosition.y}, ${this.exitPosition.z})`);
        console.log(`[Maze] Floor Y: 0, Ceiling Y: ${WALL_HEIGHT}, Player Y: ${this.startPosition.y}`);
    }

    getSizeForLevel(level) {
        const size = MIN_SIZE + (level - 1) * SIZE_INCREMENT;
        return Math.min(size, MAX_SIZE);
    }

    createEmptyGrid() {
        const grid = [];
        for (let z = 0; z < this.height; z++) {
            grid[z] = [];
            for (let x = 0; x < this.width; x++) {
                grid[z][x] = 1;
            }
        }
        return grid;
    }

    carvePassages() {
        const visited = new Set();
        const stack = [];

        const startX = 1;
        const startZ = 1;

        this.grid[startZ][startX] = 0;
        visited.add(`${startX},${startZ}`);
        stack.push({ x: startX, z: startZ });

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(current.x, current.z, visited);

            if (neighbors.length === 0) {
                stack.pop();
            } else {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];

                const wallX = current.x + (next.x - current.x) / 2;
                const wallZ = current.z + (next.z - current.z) / 2;
                this.grid[wallZ][wallX] = 0;

                this.grid[next.z][next.x] = 0;
                visited.add(`${next.x},${next.z}`);
                stack.push(next);
            }
        }
    }

    getUnvisitedNeighbors(x, z, visited) {
        const neighbors = [];
        const directions = [
            { dx: 0, dz: -2 },
            { dx: 0, dz: 2 },
            { dx: -2, dz: 0 },
            { dx: 2, dz: 0 }
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const nz = z + dir.dz;

            if (nx > 0 && nx < this.width - 1 && nz > 0 && nz < this.height - 1) {
                if (!visited.has(`${nx},${nz}`)) {
                    neighbors.push({ x: nx, z: nz });
                }
            }
        }

        return neighbors;
    }

    async buildGeometry() {
        await this.createFloor();
        await this.createCeiling();
        await this.createWalls();
        this.createExit();
        this.createWallTorches();
    }

    async createFloor() {
        const floorWidth = this.width * CELL_SIZE;
        const floorHeight = this.height * CELL_SIZE;

        // Floor is a single plane - UVs span 0-1 across entire surface
        // We want ~1 tile per 2 units, so an 11-unit floor needs 5.5 repeats
        const repeatX = floorWidth * TEXTURE_SCALE;
        const repeatY = floorHeight * TEXTURE_SCALE;

        console.log(`[Maze] Floor size: ${floorWidth}x${floorHeight}, texture repeat: (${repeatX}, ${repeatY})`);

        const floorMaterial = this.themeManager.createMaterial(
            this.currentThemeName,
            'floor',
            repeatX,
            repeatY
        );

        const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorHeight);
        this.floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floorMesh.rotation.x = -Math.PI / 2;
        this.floorMesh.position.set(
            floorWidth / 2 - CELL_SIZE / 2,
            0,
            floorHeight / 2 - CELL_SIZE / 2
        );
        this.floorMesh.receiveShadow = true;
        this.scene.add(this.floorMesh);
    }

    async createCeiling() {
        const ceilingWidth = this.width * CELL_SIZE;
        const ceilingHeight = this.height * CELL_SIZE;

        const repeatX = ceilingWidth * TEXTURE_SCALE;
        const repeatY = ceilingHeight * TEXTURE_SCALE;

        const ceilingMaterial = this.themeManager.createMaterial(
            this.currentThemeName,
            'ceiling',
            repeatX,
            repeatY
        );

        const ceilingGeometry = new THREE.PlaneGeometry(ceilingWidth, ceilingHeight);
        this.ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        this.ceilingMesh.rotation.x = Math.PI / 2;
        this.ceilingMesh.position.set(
            ceilingWidth / 2 - CELL_SIZE / 2,
            WALL_HEIGHT,
            ceilingHeight / 2 - CELL_SIZE / 2
        );
        this.ceilingMesh.receiveShadow = true;
        this.scene.add(this.ceilingMesh);
    }

    async createWalls() {
        const wallGeometries = [];

        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[z][x] === 1) {
                    const geometry = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE);
                    geometry.translate(x * CELL_SIZE, WALL_HEIGHT / 2, z * CELL_SIZE);
                    wallGeometries.push(geometry);

                    const box = new THREE.Box3(
                        new THREE.Vector3(
                            x * CELL_SIZE - CELL_SIZE / 2,
                            0,
                            z * CELL_SIZE - CELL_SIZE / 2
                        ),
                        new THREE.Vector3(
                            x * CELL_SIZE + CELL_SIZE / 2,
                            WALL_HEIGHT,
                            z * CELL_SIZE + CELL_SIZE / 2
                        )
                    );
                    this.wallBoundingBoxes.push(box);
                }
            }
        }

        const mergedGeometry = this.mergeGeometries(wallGeometries);

        // For walls: each box face has UVs 0-1, so repeat is per-face
        // Wall face is 1 unit wide, 3 units tall
        // We want ~1 tile per 2 units, so: width=0.5 tiles, height=1.5 tiles
        const wallRepeatX = CELL_SIZE * TEXTURE_SCALE;  // 1 * 0.5 = 0.5
        const wallRepeatY = WALL_HEIGHT * TEXTURE_SCALE; // 3 * 0.5 = 1.5

        const wallMaterial = this.themeManager.createMaterial(
            this.currentThemeName,
            'wall',
            wallRepeatX,
            wallRepeatY
        );

        console.log(`[Maze] Wall texture repeat: (${wallRepeatX}, ${wallRepeatY})`);

        const wallMesh = new THREE.Mesh(mergedGeometry, wallMaterial);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        this.scene.add(wallMesh);
        this.walls.push(wallMesh);

        for (const geom of wallGeometries) {
            geom.dispose();
        }
    }

    mergeGeometries(geometries) {
        let totalVertices = 0;
        let totalIndices = 0;

        for (const geom of geometries) {
            totalVertices += geom.attributes.position.count;
            totalIndices += geom.index.count;
        }

        const positions = new Float32Array(totalVertices * 3);
        const normals = new Float32Array(totalVertices * 3);
        const uvs = new Float32Array(totalVertices * 2);
        const indices = new Uint32Array(totalIndices);

        let vertexOffset = 0;
        let indexOffset = 0;
        let vertexCount = 0;

        for (const geom of geometries) {
            const posAttr = geom.attributes.position;
            const normAttr = geom.attributes.normal;
            const uvAttr = geom.attributes.uv;
            const idx = geom.index;

            for (let i = 0; i < posAttr.count; i++) {
                positions[(vertexOffset + i) * 3] = posAttr.getX(i);
                positions[(vertexOffset + i) * 3 + 1] = posAttr.getY(i);
                positions[(vertexOffset + i) * 3 + 2] = posAttr.getZ(i);

                normals[(vertexOffset + i) * 3] = normAttr.getX(i);
                normals[(vertexOffset + i) * 3 + 1] = normAttr.getY(i);
                normals[(vertexOffset + i) * 3 + 2] = normAttr.getZ(i);

                uvs[(vertexOffset + i) * 2] = uvAttr.getX(i);
                uvs[(vertexOffset + i) * 2 + 1] = uvAttr.getY(i);
            }

            for (let i = 0; i < idx.count; i++) {
                indices[indexOffset + i] = idx.getX(i) + vertexCount;
            }

            vertexOffset += posAttr.count;
            indexOffset += idx.count;
            vertexCount += posAttr.count;
        }

        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        merged.setIndex(new THREE.BufferAttribute(indices, 1));

        return merged;
    }

    createExit() {
        const exitGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.8, CELL_SIZE * 0.8);
        this.exitMesh = new THREE.Mesh(exitGeometry, this.exitMaterial);
        this.exitMesh.rotation.x = -Math.PI / 2;
        this.exitMesh.position.set(
            this.exitPosition.x,
            0.01,
            this.exitPosition.z
        );
        this.scene.add(this.exitMesh);

        this.exitLight = new THREE.PointLight(0x00ff00, 1.5, 4);
        this.exitLight.position.set(
            this.exitPosition.x,
            0.5,
            this.exitPosition.z
        );
        this.scene.add(this.exitLight);
    }

    createWallTorches() {
        const theme = themes[this.currentThemeName];
        if (!theme) return;

        const torchSettings = theme.lighting.wallTorches;
        const spacing = torchSettings.spacing;

        // Place torches at regular intervals in open corridor spaces
        for (let z = spacing; z < this.height - 1; z += spacing) {
            for (let x = spacing; x < this.width - 1; x += spacing) {
                // Check if this is a path cell with a wall nearby
                if (this.grid[z][x] === 0) {
                    // Try to place torch on adjacent wall
                    const wallOffsets = [
                        { dx: 1, dz: 0 },
                        { dx: -1, dz: 0 },
                        { dx: 0, dz: 1 },
                        { dx: 0, dz: -1 }
                    ];

                    for (const offset of wallOffsets) {
                        const wx = x + offset.dx;
                        const wz = z + offset.dz;

                        if (wx >= 0 && wx < this.width && wz >= 0 && wz < this.height) {
                            if (this.grid[wz][wx] === 1) {
                                // Place torch in the path cell, near the wall
                                const torchX = x * CELL_SIZE - offset.dx * 0.3;
                                const torchZ = z * CELL_SIZE - offset.dz * 0.3;

                                const torch = new THREE.PointLight(
                                    torchSettings.color,
                                    torchSettings.intensity,
                                    torchSettings.distance
                                );
                                torch.position.set(torchX, WALL_HEIGHT * 0.7, torchZ);
                                torch.userData.baseIntensity = torchSettings.intensity;
                                torch.userData.flickerMin = torchSettings.flickerMin;
                                torch.userData.flickerMax = torchSettings.flickerMax;
                                torch.userData.flickerOffset = Math.random() * Math.PI * 2;

                                this.scene.add(torch);
                                this.wallTorches.push(torch);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    updateTorchFlicker(time) {
        for (const torch of this.wallTorches) {
            const flickerSpeed = 3;
            const offset = torch.userData.flickerOffset;
            const min = torch.userData.flickerMin;
            const max = torch.userData.flickerMax;
            const base = torch.userData.baseIntensity;

            // Combine multiple sine waves for organic flicker
            const flicker = Math.sin(time * flickerSpeed + offset) * 0.3 +
                           Math.sin(time * flickerSpeed * 2.3 + offset) * 0.2 +
                           Math.sin(time * flickerSpeed * 0.7 + offset) * 0.1;

            const normalizedFlicker = (flicker + 0.6) / 1.2; // Normalize to 0-1
            const intensity = base * (min + normalizedFlicker * (max - min));
            torch.intensity = intensity;
        }
    }

    // Convert world position to grid coordinates
    worldToGrid(worldX, worldZ) {
        return {
            x: Math.round(worldX / CELL_SIZE),
            z: Math.round(worldZ / CELL_SIZE)
        };
    }

    // Convert grid coordinates to world position
    gridToWorld(gridX, gridZ) {
        return {
            x: gridX * CELL_SIZE,
            z: gridZ * CELL_SIZE
        };
    }

    // BFS pathfinding from start to exit
    findPath(startWorldX, startWorldZ) {
        const start = this.worldToGrid(startWorldX, startWorldZ);
        const end = this.worldToGrid(this.exitPosition.x, this.exitPosition.z);

        const queue = [[start]];
        const visited = new Set();
        visited.add(`${start.x},${start.z}`);

        const directions = [
            { dx: 0, dz: -1 },
            { dx: 0, dz: 1 },
            { dx: -1, dz: 0 },
            { dx: 1, dz: 0 }
        ];

        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];

            if (current.x === end.x && current.z === end.z) {
                return path;
            }

            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const nz = current.z + dir.dz;
                const key = `${nx},${nz}`;

                if (nx >= 0 && nx < this.width && nz >= 0 && nz < this.height &&
                    this.grid[nz][nx] === 0 && !visited.has(key)) {
                    visited.add(key);
                    queue.push([...path, { x: nx, z: nz }]);
                }
            }
        }

        return null; // No path found
    }

    // Show path visualization
    showPath(playerPosition) {
        this.clearPath();

        const path = this.findPath(playerPosition.x, playerPosition.z);
        if (!path || path.length < 2) {
            console.log('No path found or already at exit');
            return false;
        }

        console.log('Path to exit revealed');

        // Create line geometry from path
        const points = path.map(cell => {
            const world = this.gridToWorld(cell.x, cell.z);
            return new THREE.Vector3(world.x, 0.05, world.z);
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.pathLine = new THREE.Line(geometry, this.pathMaterial);
        this.scene.add(this.pathLine);

        // Fade out after 5 seconds
        this.pathFadeTimeout = setTimeout(() => {
            this.clearPath();
        }, 5000);

        return true;
    }

    clearPath() {
        if (this.pathFadeTimeout) {
            clearTimeout(this.pathFadeTimeout);
            this.pathFadeTimeout = null;
        }

        if (this.pathLine) {
            this.scene.remove(this.pathLine);
            this.pathLine.geometry.dispose();
            this.pathLine = null;
        }
    }

    // Find a valid path cell near the exit for teleporting
    findTeleportPosition() {
        const exitGrid = this.worldToGrid(this.exitPosition.x, this.exitPosition.z);

        // BFS from exit to find cells 3-4 steps away
        const queue = [{ x: exitGrid.x, z: exitGrid.z, dist: 0 }];
        const visited = new Set();
        visited.add(`${exitGrid.x},${exitGrid.z}`);
        const candidates = [];

        const directions = [
            { dx: 0, dz: -1 },
            { dx: 0, dz: 1 },
            { dx: -1, dz: 0 },
            { dx: 1, dz: 0 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.dist >= 3 && current.dist <= 4) {
                candidates.push(current);
            }

            if (current.dist >= 4) continue;

            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const nz = current.z + dir.dz;
                const key = `${nx},${nz}`;

                if (nx >= 0 && nx < this.width && nz >= 0 && nz < this.height &&
                    this.grid[nz][nx] === 0 && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ x: nx, z: nz, dist: current.dist + 1 });
                }
            }
        }

        if (candidates.length === 0) return null;

        // Pick a random candidate
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        const world = this.gridToWorld(chosen.x, chosen.z);

        return new THREE.Vector3(world.x, 1.5, world.z);
    }

    clear() {
        this.clearPath();

        for (const wall of this.walls) {
            this.scene.remove(wall);
            wall.geometry.dispose();
            if (wall.material.map) wall.material.map.dispose();
            if (wall.material.normalMap) wall.material.normalMap.dispose();
            wall.material.dispose();
        }
        this.walls = [];
        this.wallBoundingBoxes = [];

        if (this.floorMesh) {
            this.scene.remove(this.floorMesh);
            this.floorMesh.geometry.dispose();
            if (this.floorMesh.material.map) this.floorMesh.material.map.dispose();
            if (this.floorMesh.material.normalMap) this.floorMesh.material.normalMap.dispose();
            this.floorMesh.material.dispose();
            this.floorMesh = null;
        }

        if (this.ceilingMesh) {
            this.scene.remove(this.ceilingMesh);
            this.ceilingMesh.geometry.dispose();
            if (this.ceilingMesh.material.map) this.ceilingMesh.material.map.dispose();
            if (this.ceilingMesh.material.normalMap) this.ceilingMesh.material.normalMap.dispose();
            this.ceilingMesh.material.dispose();
            this.ceilingMesh = null;
        }

        if (this.exitMesh) {
            this.scene.remove(this.exitMesh);
            this.exitMesh.geometry.dispose();
            this.exitMesh = null;
        }

        if (this.exitLight) {
            this.scene.remove(this.exitLight);
            this.exitLight = null;
        }

        for (const torch of this.wallTorches) {
            this.scene.remove(torch);
        }
        this.wallTorches = [];
    }

    getStartPosition() {
        return this.startPosition.clone();
    }

    getExitPosition() {
        return this.exitPosition.clone();
    }

    getWallBoundingBoxes() {
        return this.wallBoundingBoxes;
    }

    getWallMeshes() {
        return this.walls;
    }

    getSize() {
        return { width: this.width, height: this.height };
    }

    checkExitCollision(playerPosition, radius = 0.5) {
        if (!this.exitPosition) return false;

        const dx = playerPosition.x - this.exitPosition.x;
        const dz = playerPosition.z - this.exitPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        return distance < radius;
    }
}
