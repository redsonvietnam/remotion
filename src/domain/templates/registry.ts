import {hashValue} from '../foundation/ids';
import type {StyleDefinition, TemplateDefinition} from './types';
import {isStyleDefinition, isTemplateDefinition} from './validation';

export class TemplateStyleRegistry {
  private readonly templates: ReadonlyMap<string, TemplateDefinition>;
  private readonly styles: ReadonlyMap<string, StyleDefinition>;

  public constructor(
    templates: readonly TemplateDefinition[] = [],
    styles: readonly StyleDefinition[] = [],
  ) {
    this.templates = buildMap(templates, isTemplateDefinition, 'template');
    this.styles = buildMap(styles, isStyleDefinition, 'style');
  }

  public getTemplate(id: string): TemplateDefinition | undefined {
    return this.templates.get(id);
  }

  public getStyle(id: string): StyleDefinition | undefined {
    return this.styles.get(id);
  }

  public templateIds(): readonly string[] {
    return [...this.templates.keys()].sort();
  }

  public styleIds(): readonly string[] {
    return [...this.styles.keys()].sort();
  }

  public fingerprint(): string {
    return hashValue({templates: this.templateIds().map((id) => this.templates.get(id)), styles: this.styleIds().map((id) => this.styles.get(id))});
  }
}

const buildMap = <T extends {readonly id: string}>(
  entries: readonly T[],
  validator: (value: unknown) => value is T,
  kind: string,
): ReadonlyMap<string, T> => {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const map = new Map<string, T>();
  for (const entry of sorted) {
    if (!validator(entry)) throw new Error(`Invalid ${kind} definition: ${entry.id}`);
    if (map.has(entry.id)) throw new Error(`Duplicate ${kind} id: ${entry.id}`);
    map.set(entry.id, entry);
  }
  return map;
};
