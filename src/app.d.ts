declare namespace svelteHTML {
  interface HTMLAttributes {
    onclick_outside?: (event: CustomEvent) => void;
  }
}
