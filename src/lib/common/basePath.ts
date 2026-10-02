import { resolve } from "$app/paths";

// SvelteKit 3 removed `base` from $app/paths. resolve("/") is the base path and "/".
export const basePath: string = resolve("/").slice(0, -1);
