interface PixiPoint {
  x: number;
  y: number;
}

interface PixiRectangleLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PixiDisplayObject {
  x: number;
  y: number;
}

interface PixiContainer extends PixiDisplayObject {
  addChild<T>(child: T): T;
  removeChild<T>(child: T): T;
  toLocal(point: PixiPoint): PixiPoint;
  interactive: boolean;
  hitArea: PixiRectangleLike | unknown;
  scale: {
    set(x: number, y?: number): void;
  };
  on(event: string, callback: (event: PixiPointerEvent) => void): this;
}

interface PixiGraphics extends PixiContainer {
  clear(): this;
  lineStyle(width: number, color: number, alpha?: number): this;
  beginFill(color: number, alpha?: number): this;
  drawRect(x: number, y: number, width: number, height: number): this;
  drawCircle(x: number, y: number, radius: number): this;
  endFill(): this;
}

interface PixiBaseTexture {
  scaleMode: number;
  update(): void;
}

interface PixiTexture {
  baseTexture: PixiBaseTexture;
}

interface PixiSprite extends PixiContainer {
  texture: PixiTexture;
}

interface PixiText extends PixiDisplayObject {
  text: string;
}

interface PixiPointerEventData {
  global: PixiPoint;
}

interface PixiPointerEvent {
  button: number;
  data: PixiPointerEventData;
}

interface PixiApplication {
  stage: PixiContainer;
  view: HTMLCanvasElement;
  screen: PixiRectangleLike;
  renderer: {
    on(event: "resize", callback: () => void): void;
  };
}

declare const PIXI: {
  Application: new (options: Record<string, unknown>) => PixiApplication;
  Container: new () => PixiContainer;
  Graphics: new () => PixiGraphics;
  Rectangle: new (x: number, y: number, width: number, height: number) => PixiRectangleLike;
  Text: new (text: string, style?: Record<string, unknown>) => PixiText;
  Sprite: {
    from(source: HTMLCanvasElement): PixiSprite;
  };
  SCALE_MODES: {
    NEAREST: number;
  };
};
