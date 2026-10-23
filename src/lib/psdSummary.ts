export type LayerNode = {
  name: string;
  blendMode?: string;
  opacity?: number;
  kind: string;
  placed?: { width?: number; height?: number; transform: number[] };
  warnings: string[];
  children: LayerNode[];
};

export type PsdLayerLike = {
  name?: string;
  blendMode?: string;
  opacity?: number;
  hidden?: boolean;
  effects?: unknown;
  adjustment?: unknown;
  placedLayer?: { width?: number; height?: number; transform?: number[]; filter?: { list?: Array<{ name?: string }> }; warp?: unknown };
  children?: PsdLayerLike[];
};

export type PsdLike = { width?: number; height?: number; children?: PsdLayerLike[] };

function warningsFor(layer: PsdLayerLike) {
  const warnings: string[] = [];
  const name = layer.name || "layer";
  if (layer.effects) warnings.push(`стили слоя «${name}»`);
  if (layer.adjustment) warnings.push(`корректирующий слой «${name}»`);
  const filters = layer.placedLayer?.filter?.list ?? [];
  for (const filter of filters) {
    const filterName = filter.name || "filter";
    warnings.push(filterName.toLowerCase().includes("displace") ? `фильтр Displace на слое ${name}` : `смарт-фильтр ${filterName} на слое ${name}`);
  }
  return warnings;
}

function walk(layer: PsdLayerLike, path: string): LayerNode {
  const name = layer.name || "Layer";
  const nextPath = path ? `${path}/${name}` : name;
  const placed = layer.placedLayer
    ? { width: layer.placedLayer.width, height: layer.placedLayer.height, transform: layer.placedLayer.transform ?? [] }
    : undefined;
  return {
    name,
    blendMode: layer.blendMode,
    opacity: layer.opacity,
    kind: placed ? "smart-object" : layer.adjustment ? "adjustment" : layer.children ? "group" : "layer",
    placed,
    warnings: warningsFor(layer),
    children: (layer.children ?? []).map((child) => walk(child, nextPath)),
  };
}

export function summarizePsd(psd: PsdLike) {
  const tree = (psd.children ?? []).map((layer) => walk(layer, ""));
  const warnings = collect(tree);
  const areas = collectPlaced(psd.children ?? [], "");
  return { width: psd.width ?? 0, height: psd.height ?? 0, tree, warnings, areas };
}

function collect(nodes: LayerNode[]): string[] {
  return nodes.flatMap((node) => [...node.warnings, ...collect(node.children)]);
}

function collectPlaced(layers: PsdLayerLike[], path: string): Array<{ path: string; name: string; width?: number; height?: number; transform: number[] }> {
  const found: Array<{ path: string; name: string; width?: number; height?: number; transform: number[] }> = [];
  for (const layer of layers) {
    const name = layer.name || "Layer";
    const next = path ? `${path}/${name}` : name;
    if (layer.placedLayer) {
      found.push({ path: next, name, width: layer.placedLayer.width, height: layer.placedLayer.height, transform: layer.placedLayer.transform ?? [] });
    }
    if (layer.children) found.push(...collectPlaced(layer.children, next));
  }
  return found;
}
