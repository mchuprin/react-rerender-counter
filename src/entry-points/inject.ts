type Trigger = 'state' | 'props' | 'parent';

interface ComponentData {
  name: string;
  renderCount: number;
  totalTime: number;
  avgTime: number;
  triggers: Trigger[];
}

interface Hook {
  memoizedState: unknown;
  next: Hook | null;
}

interface Fiber {
  type:
    | (((...args: unknown[]) => unknown) & { displayName?: string; name?: string })
    | string
    | null;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
  alternate: Fiber | null;
  memoizedProps: Record<string, unknown>;
  memoizedState: Hook | unknown;
  actualDuration: number;
}

interface FiberRoot {
  current: Fiber;
}

interface ReactDevToolsHook {
  supportsFiber: boolean;
  renderers: Map<number, unknown>;
  inject: (renderer: unknown) => number;
  onCommitFiberRoot: (
    rendererId: number,
    root: FiberRoot,
    priorityLevel?: number,
    didError?: boolean,
  ) => void;
  onCommitFiberUnmount: (rendererId: number, fiber: Fiber) => void;
  onPostCommitFiberRoot: (rendererId: number, root: FiberRoot) => void;
}

declare var __REACT_DEVTOOLS_GLOBAL_HOOK__: ReactDevToolsHook | undefined;

const renderData = new Map<string, ComponentData>();

function getComponentName(fiber: Fiber): string | null {
  if (typeof fiber.type === 'function') {
    return fiber.type.displayName || fiber.type.name || 'Anonymous';
  }
  return null;
}

function shallowPropsChanged(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return true;
  for (const key of prevKeys) {
    if (prev[key] !== next[key]) return true;
  }
  return false;
}

function hasHookChanges(prev: Fiber, next: Fiber): boolean {
  let prevHook = prev.memoizedState as Hook | null;
  let nextHook = next.memoizedState as Hook | null;

  while (prevHook && nextHook) {
    if (prevHook.memoizedState !== nextHook.memoizedState) return true;
    prevHook = prevHook.next;
    nextHook = nextHook.next;
  }

  return prevHook !== nextHook;
}

function classifyTrigger(fiber: Fiber): Trigger {
  if (!fiber.alternate) return 'parent';

  const prev = fiber.alternate;

  if (shallowPropsChanged(prev.memoizedProps, fiber.memoizedProps)) return 'props';
  if (hasHookChanges(prev, fiber)) return 'state';

  return 'parent';
}

function walkFiber(root: Fiber): void {
  const stack: Fiber[] = [root];

  while (stack.length > 0) {
    const fiber = stack.pop();
    if (!fiber) continue;
    const name = getComponentName(fiber);

    if (name && fiber.alternate) {
      const trigger = classifyTrigger(fiber);
      const existing = renderData.get(name);

      if (existing) {
        existing.renderCount += 1;
        existing.totalTime += fiber.actualDuration;
        existing.avgTime = existing.totalTime / existing.renderCount;
        existing.triggers.push(trigger);
      } else {
        renderData.set(name, {
          name,
          renderCount: 1,
          totalTime: fiber.actualDuration,
          avgTime: fiber.actualDuration,
          triggers: [trigger],
        });
      }
    }

    if (fiber.child) stack.push(fiber.child);
    if (fiber.sibling) stack.push(fiber.sibling);
  }
}

function sendRenderData(): void {
  const components = Array.from(renderData.values());
  window.dispatchEvent(new CustomEvent('RENDER_DATA', { detail: { components } }));
}

if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers: new Map(),
    inject: (_renderer: unknown): number => {
      window.dispatchEvent(new CustomEvent('REACT_DETECTED'));
      return 0;
    },
    onCommitFiberRoot: () => {},
    onCommitFiberUnmount: () => {},
    onPostCommitFiberRoot: () => {},
  };
}

const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
const originalOnCommit = hook.onCommitFiberRoot;

hook.onCommitFiberRoot = (
  rendererId: number,
  root: FiberRoot,
  priorityLevel?: number,
  didError?: boolean,
): void => {
  if (typeof originalOnCommit === 'function') {
    originalOnCommit.call(hook, rendererId, root, priorityLevel, didError);
  }

  renderData.clear();
  walkFiber(root.current);
  sendRenderData();
};
