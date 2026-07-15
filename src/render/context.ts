import path from 'node:path';
import { normalizeLogo, type DemoConfig } from '../config/schema.js';

export type AssetKind = 'screenshot' | 'logo' | 'font' | 'avatar' | 'image';

export interface AssetPathEntry {
  at: string;
  source: string;
  file: string;
  kind: AssetKind;
  sceneIndex?: number;
}

export class AssetPathRegistry {
  readonly #bySource = new Map<string, AssetPathEntry>();

  register(entry: AssetPathEntry): void {
    if (this.#bySource.has(entry.source)) {
      throw new Error(`asset source already registered: ${entry.source}`);
    }
    this.#bySource.set(entry.source, Object.freeze({ ...entry }));
  }

  get(source: string): AssetPathEntry | undefined {
    return this.#bySource.get(source);
  }

  require(source: string): AssetPathEntry {
    const entry = this.get(source);
    if (!entry) throw new Error(`asset source is not registered: ${source}`);
    return entry;
  }

  entries(): AssetPathEntry[] {
    return [...this.#bySource.values()];
  }
}

export interface RenderContext {
  configPath?: string;
  baseDir: string;
  assets: AssetPathRegistry;
}

function register(
  registry: AssetPathRegistry,
  baseDir: string,
  source: string,
  rawPath: string,
  kind: AssetKind,
  sceneIndex?: number,
): void {
  registry.register({
    at: source,
    source,
    file: path.resolve(baseDir, rawPath),
    kind,
    ...(sceneIndex === undefined ? {} : { sceneIndex }),
  });
}

export function createRenderContext(
  config: DemoConfig,
  baseDir: string,
  configPath?: string,
): RenderContext {
  const resolvedBaseDir = path.resolve(baseDir);
  const assets = new AssetPathRegistry();
  const logo = normalizeLogo(config.theme.logo);
  if (logo) register(assets, resolvedBaseDir, 'theme.logo', logo.src, 'logo');
  if (typeof config.theme.font === 'object') {
    if (config.theme.font.sans) {
      register(assets, resolvedBaseDir, 'theme.font.sans', config.theme.font.sans, 'font');
    }
    if (config.theme.font.mono) {
      register(assets, resolvedBaseDir, 'theme.font.mono', config.theme.font.mono, 'font');
    }
  }
  const registerSceneAssets = (scene: DemoConfig['scenes'][number], prefix: string, sceneIndex?: number) => {
    if (scene.type === 'screenshot') {
      register(assets, resolvedBaseDir, `${prefix}.src`, scene.src, 'screenshot', sceneIndex);
    }
    if (scene.type === 'chat' && scene.avatars) {
      for (const role of ['user', 'assistant'] as const) {
        const avatar = scene.avatars[role];
        if (typeof avatar === 'string') {
          register(
            assets,
            resolvedBaseDir,
            `${prefix}.avatars.${role}`,
            avatar,
            'avatar',
            sceneIndex,
          );
        }
      }
    }
  };
  config.scenes.forEach((scene, sceneIndex) => {
    registerSceneAssets(scene, `scenes[${sceneIndex}]`, sceneIndex);
  });
  config.shots?.forEach((shot, shotIndex) => {
    shot.objects.forEach((object, objectIndex) => {
      const prefix = `shots[${shotIndex}].objects[${objectIndex}]`;
      if (object.kind === 'scene') registerSceneAssets(object.scene, `${prefix}.scene`);
      if (object.kind === 'logo-lockup') register(assets, resolvedBaseDir, `${prefix}.src`, object.src, 'logo');
      if (object.kind === 'image') register(assets, resolvedBaseDir, `${prefix}.src`, object.src, 'image');
    });
  });
  return {
    ...(configPath ? { configPath: path.resolve(configPath) } : {}),
    baseDir: resolvedBaseDir,
    assets,
  };
}

export function renderContext(
  config: DemoConfig,
  contextOrBaseDir: RenderContext | string,
): RenderContext {
  return typeof contextOrBaseDir === 'string'
    ? createRenderContext(config, contextOrBaseDir)
    : contextOrBaseDir;
}
