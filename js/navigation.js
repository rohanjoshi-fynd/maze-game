import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DUCK_LIMIT = 8;
const CHALK_LIMIT = 12;
const CHALK_RANGE = 2;
const DUCK_SCALE = 1;
const DUCK_MODEL_PATH = 'assets/models/rubber_duck_toy_2k.gltf/rubber_duck_toy_2k.gltf';

export class NavigationAids {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.wallMeshes = [];

        this.ducks = [];
        this.duckLights = [];
        this.duckCount = DUCK_LIMIT;
        this.duckModel = null;
        this.duckModelLoaded = false;

        this.chalkMarks = [];
        this.chalkCount = CHALK_LIMIT;

        this.raycaster = new THREE.Raycaster();
        this.isActive = false;

        this.chalkMaterial = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            emissive: 0xeeeeee,
            emissiveIntensity: 0.15,
            roughness: 0.9,
            side: THREE.DoubleSide
        });

        this.onBreadcrumbDrop = null;
        this.onChalkMark = null;
        this.onError = null;

        this.setupControls();
        this.loadDuckModel();
    }

    loadDuckModel() {
        const loader = new GLTFLoader();
        loader.load(
            DUCK_MODEL_PATH,
            (gltf) => {
                this.duckModel = gltf.scene;
                this.duckModel.scale.set(DUCK_SCALE, DUCK_SCALE, DUCK_SCALE);

                this.duckModelLoaded = true;
                console.log('Duck model loaded');
            },
            undefined,
            (error) => {
                console.error('Failed to load duck model:', error);
            }
        );
    }

    setupControls() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onKeyDown(event) {
        if (!this.isActive) return;

        if (event.code === 'KeyB') {
            this.dropDuck();
        } else if (event.code === 'KeyC') {
            this.placeChalkMark();
        }
    }

    setActive(active) {
        this.isActive = active;
    }

    setPlayerPosition(position) {
        this.playerPosition = position;
    }

    setWallMeshes(meshes) {
        this.wallMeshes = meshes;
    }

    dropDuck() {
        if (this.duckCount <= 0) {
            // TODO: Play "can't do that" error sound
            if (this.onError) this.onError('breadcrumb');
            return;
        }

        if (!this.playerPosition) return;

        if (!this.duckModelLoaded) {
            console.warn('Duck model not loaded yet');
            return;
        }

        // Clone the duck model
        const duck = this.duckModel.clone();

        // Random Y-axis rotation
        const randomRotation = Math.random() * Math.PI * 2;
        duck.rotation.y = randomRotation;

        // Position at player's feet
        duck.position.set(
            this.playerPosition.x,
            0,
            this.playerPosition.z
        );

        this.scene.add(duck);
        this.ducks.push(duck);

        // Add overhead spotlight to illuminate duck naturally
        const overheadLight = new THREE.PointLight(0xffeecc, 0.8, 4);
        overheadLight.position.set(
            this.playerPosition.x,
            0.5,
            this.playerPosition.z
        );
        this.scene.add(overheadLight);
        this.duckLights.push(overheadLight);

        // Add fill light below to reduce shadows
        const fillLight = new THREE.PointLight(0xffeecc, 0.3, 4);
        fillLight.position.set(
            this.playerPosition.x,
            0.1,
            this.playerPosition.z
        );
        this.scene.add(fillLight);
        this.duckLights.push(fillLight);

        this.duckCount--;

        // TODO: Play duck drop sound

        if (this.onBreadcrumbDrop) this.onBreadcrumbDrop(this.duckCount);
    }

    placeChalkMark() {
        if (this.chalkCount <= 0) {
            // TODO: Play "can't do that" error sound
            if (this.onError) this.onError('chalk');
            return;
        }

        if (this.wallMeshes.length === 0) return;

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.wallMeshes);

        if (intersects.length === 0) {
            // TODO: Play error sound
            if (this.onError) this.onError('no_wall');
            return;
        }

        const hit = intersects[0];

        if (hit.distance > CHALK_RANGE) {
            // TODO: Play error sound
            if (this.onError) this.onError('too_far');
            return;
        }

        const chalkMark = this.createChalkX(hit.point, hit.face.normal);
        this.scene.add(chalkMark);
        this.chalkMarks.push(chalkMark);
        this.chalkCount--;

        // TODO: Play chalk drawing sound

        if (this.onChalkMark) this.onChalkMark(this.chalkCount);
    }

    createChalkX(position, normal) {
        const group = new THREE.Group();

        const barLength = 0.25;
        const barWidth = 0.04;
        const barGeometry = new THREE.PlaneGeometry(barLength, barWidth);

        const bar1 = new THREE.Mesh(barGeometry, this.chalkMaterial);
        bar1.rotation.z = Math.PI / 4;
        group.add(bar1);

        const bar2 = new THREE.Mesh(barGeometry, this.chalkMaterial);
        bar2.rotation.z = -Math.PI / 4;
        group.add(bar2);

        group.position.copy(position);
        group.position.addScaledVector(normal, 0.01);

        if (Math.abs(normal.y) > 0.9) {
            group.rotation.x = -Math.PI / 2;
        } else if (Math.abs(normal.x) > 0.9) {
            group.rotation.y = Math.PI / 2;
        }

        return group;
    }

    reset() {
        // Remove ducks
        for (const duck of this.ducks) {
            this.scene.remove(duck);
        }
        this.ducks = [];

        // Remove duck lights
        for (const light of this.duckLights) {
            this.scene.remove(light);
        }
        this.duckLights = [];

        this.duckCount = DUCK_LIMIT;

        // Remove chalk marks
        for (const chalk of this.chalkMarks) {
            this.scene.remove(chalk);
            chalk.children.forEach(child => child.geometry.dispose());
        }
        this.chalkMarks = [];
        this.chalkCount = CHALK_LIMIT;
    }

    getBreadcrumbCount() {
        return this.duckCount;
    }

    getChalkCount() {
        return this.chalkCount;
    }
}
