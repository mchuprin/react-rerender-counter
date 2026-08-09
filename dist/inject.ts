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
  memoizedState: unknown;
  flags: number;
  actualDuration: number;
  selfBaseDuration: number;
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

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook;
  }
}

const _renderCounts = new Map<string, number>();
const _lastRenderTimes = new Map<string, number>();
const _triggers = new Map<string, string>();

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
    originalOnCommit.call(this, rendererId, root, priorityLevel, didError);
  }
  console.log('COMMIT!', root.current);
};
