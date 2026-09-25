import { beforeEach, describe, expect, test, vi } from "vitest";
import { mount, unmount } from "svelte";
import { MountedComponents } from "./mountedComponents";

vi.mock("svelte", () => ({
  mount: vi.fn(() => ({})),
  unmount: vi.fn(),
}));

function mountOne(mountedComponents: MountedComponents): unknown {
  const target = document.createElement("div");
  return mountedComponents.mount({} as never, { target, props: { a: 1 } });
}

describe("MountedComponents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("mount passes the arguments to svelte's mount and returns its result", () => {
    const mountedComponents = new MountedComponents();
    const component = {} as never;
    const options = { target: document.createElement("div") };
    const result = mountedComponents.mount(component, options);
    expect(mount).toHaveBeenCalledWith(component, options);
    expect(result).toBe(vi.mocked(mount).mock.results[0].value);
  });

  test("mount works when called without the instance", () => {
    const { mount: detachedMount } = new MountedComponents();
    expect(() =>
      detachedMount({} as never, { target: document.createElement("div") }),
    ).not.toThrow();
  });

  test("unmountAll unmounts each mounted component once, in order", () => {
    const mountedComponents = new MountedComponents();
    const first = mountOne(mountedComponents);
    const second = mountOne(mountedComponents);
    mountedComponents.unmountAll();
    mountedComponents.unmountAll();
    expect(unmount).toHaveBeenCalledTimes(2);
    expect(unmount).toHaveBeenNthCalledWith(1, first);
    expect(unmount).toHaveBeenNthCalledWith(2, second);
  });

  test("unmountAll does nothing when nothing was mounted", () => {
    const mountedComponents = new MountedComponents();
    expect(() => mountedComponents.unmountAll()).not.toThrow();
    expect(unmount).not.toHaveBeenCalled();
  });

  test("components mounted after unmountAll are unmounted by the next call", () => {
    const mountedComponents = new MountedComponents();
    mountOne(mountedComponents);
    mountedComponents.unmountAll();
    const next = mountOne(mountedComponents);
    mountedComponents.unmountAll();
    expect(unmount).toHaveBeenCalledTimes(2);
    expect(unmount).toHaveBeenLastCalledWith(next);
  });
});
