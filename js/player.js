import * as THREE from 'three';

const MOVE_SPEED = 3;              // Reduced from 5 (~40% reduction)
const MOUSE_SENSITIVITY = 0.0016;  // Reduced from 0.002 (~20% reduction)
const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.6;
const VERTICAL_LOOK_LIMIT = Math.PI / 2 - 0.1;

export class Player {
    constructor(camera) {
        this.camera = camera;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;

        this.isLocked = false;
        this.wallBoundingBoxes = [];

        this.setupControls();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
        }
    }

    onMouseMove(event) {
        if (!this.isLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.euler.y -= movementX * MOUSE_SENSITIVITY;
        this.euler.x -= movementY * MOUSE_SENSITIVITY;

        // Clamp vertical look
        this.euler.x = Math.max(
            -VERTICAL_LOOK_LIMIT,
            Math.min(VERTICAL_LOOK_LIMIT, this.euler.x)
        );

        this.camera.quaternion.setFromEuler(this.euler);
    }

    setPosition(position) {
        this.position.copy(position);
        this.camera.position.copy(position);
    }

    setWallBoundingBoxes(boxes) {
        this.wallBoundingBoxes = boxes;
    }

    setLocked(locked) {
        this.isLocked = locked;
    }

    update(deltaTime) {
        if (!this.isLocked) return;

        // Calculate movement direction based on camera orientation
        const direction = new THREE.Vector3();

        // Get forward/backward direction (ignore vertical component)
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        // Get right direction
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

        // Apply movement input
        if (this.moveForward) direction.add(forward);
        if (this.moveBackward) direction.sub(forward);
        if (this.moveRight) direction.add(right);
        if (this.moveLeft) direction.sub(right);

        // Normalize and apply speed
        if (direction.length() > 0) {
            direction.normalize();
            direction.multiplyScalar(MOVE_SPEED * deltaTime);
        }

        // Try to move with collision detection
        this.moveWithCollision(direction);

        // Update camera position
        this.camera.position.copy(this.position);
    }

    moveWithCollision(movement) {
        // Try X movement
        const newPosX = this.position.clone();
        newPosX.x += movement.x;

        if (!this.checkCollision(newPosX)) {
            this.position.x = newPosX.x;
        }

        // Try Z movement
        const newPosZ = this.position.clone();
        newPosZ.z += movement.z;

        if (!this.checkCollision(newPosZ)) {
            this.position.z = newPosZ.z;
        }
    }

    checkCollision(position) {
        // Create a small bounding box around the player
        const playerBox = new THREE.Box3(
            new THREE.Vector3(
                position.x - PLAYER_RADIUS,
                0,
                position.z - PLAYER_RADIUS
            ),
            new THREE.Vector3(
                position.x + PLAYER_RADIUS,
                PLAYER_HEIGHT,
                position.z + PLAYER_RADIUS
            )
        );

        // Check against all walls
        for (const wallBox of this.wallBoundingBoxes) {
            if (playerBox.intersectsBox(wallBox)) {
                return true;
            }
        }

        return false;
    }

    getPosition() {
        return this.position.clone();
    }

    reset() {
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.euler.set(0, 0, 0);
        this.camera.quaternion.setFromEuler(this.euler);
    }
}
