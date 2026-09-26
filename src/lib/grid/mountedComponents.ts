import { mount as svelteMount, unmount } from "svelte";

/** Keeps the svelte components mounted by a grid renderer so they can be unmounted together. */
export class MountedComponents {
  private components: ReturnType<typeof svelteMount>[] = [];

  /** svelte's mount() that also records the component for unmountAll(). */
  mount: typeof svelteMount = (component, options) => {
    const mountedComponent = svelteMount(component, options);
    this.components.push(mountedComponent);
    return mountedComponent;
  };

  unmountAll(): void {
    for (const mountedComponent of this.components) {
      void unmount(mountedComponent);
    }
    this.components = [];
  }
}
