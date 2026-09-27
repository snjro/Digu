import type { TrailingSlashOption } from "./linkHref";

// "always" writes each page as `xxx/index.html`, so static servers such as
// GitHub Pages can open any URL directly. With "never", `xxx.html` sits next to
// the `xxx/` folder of its child pages, and GitHub Pages redirects `/xxx` to `/xxx/`.
export const trailingSlash: TrailingSlashOption = "always";
