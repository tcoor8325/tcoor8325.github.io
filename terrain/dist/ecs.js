export class ComponentStore {
    constructor() {
        this.values = new Map();
    }
    set(entity, component) {
        this.values.set(entity, component);
    }
    get(entity) {
        return this.values.get(entity);
    }
    has(entity) {
        return this.values.has(entity);
    }
    delete(entity) {
        this.values.delete(entity);
    }
    entries() {
        return Array.from(this.values.entries());
    }
}
export class World {
    constructor() {
        this.nextEntity = 1;
        this.entities = new Set();
    }
    createEntity() {
        const entity = this.nextEntity;
        this.nextEntity += 1;
        this.entities.add(entity);
        return entity;
    }
    destroyEntity(entity) {
        this.entities.delete(entity);
    }
    allEntities() {
        return Array.from(this.entities.values());
    }
}
