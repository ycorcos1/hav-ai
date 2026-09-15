import type {
  SyncDependencyCycle,
  SyncDependencyPlan,
  SyncDependencyResolver,
  SyncEntityReference,
  SyncQueueItem,
} from "@/shared/contracts";

const cycleMessage = "Some local changes are blocked by a dependency cycle.";

export async function planSyncDependencies(
  items: readonly SyncQueueItem[],
  resolver: SyncDependencyResolver,
): Promise<SyncDependencyPlan> {
  const nodes = [...items].sort(compareQueueItems);
  const byReference = new Map(nodes.map((item) => [referenceKey(item), item]));
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  for (const item of nodes) {
    const key = referenceKey(item);
    const resolved = await resolver.getDependencies(item);
    const queuedDependencies = new Set(
      resolved
        .map(referenceKey)
        .filter((dependencyKey) => byReference.has(dependencyKey)),
    );
    dependencies.set(key, queuedDependencies);
    for (const dependencyKey of queuedDependencies) {
      const children = dependents.get(dependencyKey) ?? new Set<string>();
      children.add(key);
      dependents.set(dependencyKey, children);
    }
  }

  const processableKeys = topologicalOrder(nodes, dependencies, dependents);
  const processableSet = new Set(processableKeys);
  const blocked = nodes.filter((item) => !processableSet.has(referenceKey(item)));
  const blockedKeys = new Set(blocked.map(referenceKey));
  const cycles = stronglyConnectedComponents(blockedKeys, dependencies)
    .filter((component) => component.length > 1 || hasSelfDependency(component[0], dependencies))
    .map((component): SyncDependencyCycle => ({
      code: "SYNC_DEPENDENCY_CYCLE",
      message: cycleMessage,
      members: component
        .map((key) => byReference.get(key))
        .filter((item): item is SyncQueueItem => item !== undefined)
        .sort(compareQueueItems)
        .map(toReference),
    }))
    .sort(compareCycles);

  return {
    processable: processableKeys
      .map((key) => byReference.get(key))
      .filter((item): item is SyncQueueItem => item !== undefined),
    blocked,
    cycles,
  };
}

function topologicalOrder(
  nodes: readonly SyncQueueItem[],
  dependencies: ReadonlyMap<string, ReadonlySet<string>>,
  dependents: ReadonlyMap<string, ReadonlySet<string>>,
): string[] {
  const byKey = new Map(nodes.map((item) => [referenceKey(item), item]));
  const remainingCounts = new Map(
    nodes.map((item) => [referenceKey(item), dependencies.get(referenceKey(item))?.size ?? 0]),
  );
  const ready = nodes.filter((item) => remainingCounts.get(referenceKey(item)) === 0);
  const ordered: string[] = [];

  while (ready.length > 0) {
    ready.sort(compareQueueItems);
    const item = ready.shift();
    if (!item) break;
    const key = referenceKey(item);
    ordered.push(key);

    for (const dependentKey of dependents.get(key) ?? []) {
      const nextCount = (remainingCounts.get(dependentKey) ?? 0) - 1;
      remainingCounts.set(dependentKey, nextCount);
      if (nextCount === 0) {
        const dependent = byKey.get(dependentKey);
        if (dependent) ready.push(dependent);
      }
    }
  }

  return ordered;
}

function stronglyConnectedComponents(
  keys: ReadonlySet<string>,
  dependencies: ReadonlyMap<string, ReadonlySet<string>>,
): string[][] {
  let nextIndex = 0;
  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  function visit(key: string): void {
    indexes.set(key, nextIndex);
    lowLinks.set(key, nextIndex);
    nextIndex += 1;
    stack.push(key);
    onStack.add(key);

    const adjacent = [...(dependencies.get(key) ?? [])]
      .filter((dependencyKey) => keys.has(dependencyKey))
      .sort();
    for (const dependencyKey of adjacent) {
      if (!indexes.has(dependencyKey)) {
        visit(dependencyKey);
        lowLinks.set(key, Math.min(lowLinks.get(key)!, lowLinks.get(dependencyKey)!));
      } else if (onStack.has(dependencyKey)) {
        lowLinks.set(key, Math.min(lowLinks.get(key)!, indexes.get(dependencyKey)!));
      }
    }

    if (lowLinks.get(key) !== indexes.get(key)) return;
    const component: string[] = [];
    let member: string;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== key);
    components.push(component.sort());
  }

  for (const key of [...keys].sort()) {
    if (!indexes.has(key)) visit(key);
  }
  return components;
}

function hasSelfDependency(
  key: string,
  dependencies: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  return dependencies.get(key)?.has(key) ?? false;
}

function compareQueueItems(left: SyncQueueItem, right: SyncQueueItem): number {
  return left.createdAt.localeCompare(right.createdAt)
    || left.id.localeCompare(right.id)
    || referenceKey(left).localeCompare(referenceKey(right));
}

function compareCycles(left: SyncDependencyCycle, right: SyncDependencyCycle): number {
  return referenceKey(left.members[0]).localeCompare(referenceKey(right.members[0]));
}

function referenceKey(reference: SyncEntityReference): string {
  return `${reference.entityType}:${reference.entityId}`;
}

function toReference(item: SyncQueueItem): SyncEntityReference {
  return { entityType: item.entityType, entityId: item.entityId };
}
