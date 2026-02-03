import * as THREE from 'three';

export const themes = {
    dungeon: {
        name: "Stone Dungeon",
        textures: {
            wall: {
                diffuse: 'assets/textures/dungeon/dungeon_wall_diffuse.jpg',
                normal: 'assets/textures/dungeon/dungeon_wall_normal.jpg'
            },
            floor: {
                diffuse: 'assets/textures/dungeon/dungeon_floor_diffuse.jpg',
                normal: 'assets/textures/dungeon/dungeon_floor_normal.jpg'
            },
            ceiling: {
                diffuse: 'assets/textures/dungeon/dungeon_ceiling_diffuse.jpg',
                normal: 'assets/textures/dungeon/dungeon_ceiling_normal.jpg'
            }
        },
        lighting: {
            ambient: {
                color: 0x222233,
                intensity: 0.15
            },
            playerTorch: {
                color: 0xffcc99,
                intensity: 1.0,
                distance: 12
            },
            wallTorches: {
                color: 0xffcc99,
                intensity: 0.7,
                distance: 8,
                spacing: 8,
                flickerMin: 0.8,
                flickerMax: 1.2
            },
            exit: {
                color: 0x00ff00,
                intensity: 1.5,
                distance: 4
            }
        },
        fog: {
            color: 0x0a0a0a,
            near: 1,
            far: 15
        },
        materials: {
            roughness: 0.85,
            metalness: 0.1
        }
    }
};

export function getThemeForLevel(level) {
    // Levels 1-3: dungeon
    // Future themes will be added here
    if (level <= 3) {
        return themes.dungeon;
    }
    // Default to dungeon for now
    return themes.dungeon;
}

export class ThemeManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.loadedTextures = {};
        this.currentTheme = null;
    }

    async loadTheme(themeName) {
        const theme = themes[themeName];
        if (!theme) {
            console.error(`Theme "${themeName}" not found`);
            return null;
        }

        if (this.loadedTextures[themeName]) {
            this.currentTheme = theme;
            return theme;
        }

        this.loadedTextures[themeName] = {};

        const textureTypes = ['wall', 'floor', 'ceiling'];

        for (const type of textureTypes) {
            const texturePaths = theme.textures[type];
            this.loadedTextures[themeName][type] = {};

            try {
                if (texturePaths.diffuse) {
                    const diffuse = await this.loadTexture(texturePaths.diffuse);
                    diffuse.wrapS = THREE.RepeatWrapping;
                    diffuse.wrapT = THREE.RepeatWrapping;
                    diffuse.colorSpace = THREE.SRGBColorSpace;
                    this.loadedTextures[themeName][type].diffuse = diffuse;
                }

                if (texturePaths.normal) {
                    const normal = await this.loadTexture(texturePaths.normal);
                    normal.wrapS = THREE.RepeatWrapping;
                    normal.wrapT = THREE.RepeatWrapping;
                    this.loadedTextures[themeName][type].normal = normal;
                }
            } catch (error) {
                console.error(`Failed to load ${type} textures for theme "${themeName}":`, error);
            }
        }

        this.currentTheme = theme;
        return theme;
    }

    loadTexture(path) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                path,
                (texture) => resolve(texture),
                undefined,
                (error) => {
                    console.error(`Failed to load texture: ${path}`);
                    reject(error);
                }
            );
        });
    }

    getTextures(themeName) {
        return this.loadedTextures[themeName] || null;
    }

    createMaterial(themeName, type, repeatX = 1, repeatY = 1) {
        const theme = themes[themeName];
        const textures = this.loadedTextures[themeName]?.[type];

        const materialOptions = {
            roughness: theme.materials.roughness,
            metalness: theme.materials.metalness
        };

        if (textures?.diffuse) {
            const diffuse = textures.diffuse.clone();
            diffuse.wrapS = THREE.RepeatWrapping;
            diffuse.wrapT = THREE.RepeatWrapping;
            diffuse.repeat.set(repeatX, repeatY);
            diffuse.needsUpdate = true;
            materialOptions.map = diffuse;
        } else {
            // Fallback colors if textures fail to load
            const fallbackColors = {
                wall: 0x666666,
                floor: 0x333333,
                ceiling: 0x444444
            };
            materialOptions.color = fallbackColors[type] || 0x555555;
        }

        if (textures?.normal) {
            const normal = textures.normal.clone();
            normal.wrapS = THREE.RepeatWrapping;
            normal.wrapT = THREE.RepeatWrapping;
            normal.repeat.set(repeatX, repeatY);
            normal.needsUpdate = true;
            materialOptions.normalMap = normal;
        }

        return new THREE.MeshStandardMaterial(materialOptions);
    }
}
