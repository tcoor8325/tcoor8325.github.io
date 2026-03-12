export type Entity = number;

export class ComponentStore<T> {
  private readonly values = new Map<Entity, T>();

  set(entity: Entity, component: T): void {
    this.values.set(entity, component);
  }

  get(entity: Entity): T | undefined {
    return this.values.get(entity);
  }

  has(entity: Entity): boolean {
    return this.values.has(entity);
  }

  delete(entity: Entity): void {
    this.values.delete(entity);
  }

  entries(): Array<[Entity, T]> {
    return Array.from(this.values.entries());
  }
}

export class World {
  private nextEntity = 1;
  private readonly entities = new Set<Entity>();

  createEntity(): Entity {
    const entity = this.nextEntity;
    this.nextEntity += 1;
    this.entities.add(entity);
    return entity;
  }

  destroyEntity(entity: Entity): void {
    this.entities.delete(entity);
  }

  allEntities(): Entity[] {
    return Array.from(this.entities.values());
  }
}
