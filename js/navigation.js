import * as THREE from 'three';

const BREADCRUMB_LIMIT = 8;
const CHALK_LIMIT = 12;
const CHALK_RANGE = 2;

export class NavigationAids {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.wallMeshes = [];

        this.breadcrumbs = [];
        this.breadcrumbCount = BREADCRUMB_LIMIT;

        this.chalkMarks = [];
        this.chalkCount = CHALK_LIMIT;

        this.raycaster = new THREE.Raycaster();
        this.isActive = false;

        this.breadcrumbMaterial = new THREE.MeshStandardMaterial({
            color: 0xffaa44,
            emissive: 0xffaa44,
            emissiveIntensity: 0.6,
            roughness: 0.3
        });

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
    }

    setupControls() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onKeyDown(event) {
        if (!this.isActive) return;

        if (event.code === 'KeyB') {
            this.dropBreadcrumb();
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

    dropBreadcrumb() {
        if (this.breadcrumbCount <= 0) {
            // TODO: Play "can't do that" error sound
            if (this.onError) this.onError('breadcrumb');
            return;
        }

        if (!this.playerPosition) return;

        const geometry = new THREE.SphereGeometry(0.08, 12, 8);
        const breadcrumb = new THREE.Mesh(geometry, this.breadcrumbMaterial);

        breadcrumb.position.set(
            this.playerPosition.x,
            0.08,
            this.playerPosition.z
        );

        this.scene.add(breadcrumb);
        this.breadcrumbs.push(breadcrumb);
        this.breadcrumbCount--;

        // TODO: Play breadcrumb drop sound

        if (this.onBreadcrumbDrop) this.onBreadcrumbDrop(this.breadcrumbCount);
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
        for (const breadcrumb of this.breadcrumbs) {
            this.scene.remove(breadcrumb);
            breadcrumb.geometry.dispose();
        }
        this.breadcrumbs = [];
        this.breadcrumbCount = BREADCRUMB_LIMIT;

        for (const chalk of this.chalkMarks) {
            this.scene.remove(chalk);
            chalk.children.forEach(child => child.geometry.dispose());
        }
        this.chalkMarks = [];
        this.chalkCount = CHALK_LIMIT;
    }

    getBreadcrumbCount() {
        return this.breadcrumbCount;
    }

    getChalkCount() {
        return this.chalkCount;
    }
}
