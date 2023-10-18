declare namespace svelteHTML {
  interface HTMLAttributes {
    "on:click_outside"?: (event: CustomEvent) => void;
  }
}
