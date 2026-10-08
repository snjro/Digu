// The mock of CommonChainExplorerLink.svelte: a stub that shows its value, and
// follows it when it changes. For vi.mock(path, mockExplorerLink).
export async function mockExplorerLink(): Promise<{
  default: (anchor: unknown, props: Record<string, unknown>) => unknown;
}> {
  const { default: Stub } =
    await import("../routes/[chainName]/[projectName_versionName]/contracts/[contractName]/functions/[functionName]/pageTabs.testStub.svelte");
  return {
    default: (anchor: unknown, props: Record<string, unknown>) =>
      Stub(anchor as never, {
        get stubName() {
          return String(props.value);
        },
      }),
  };
}
