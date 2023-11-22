/* eslint @typescript-eslint/no-explicit-any: 0 */
import type {
  ILoadingOverlayComp,
  ILoadingOverlayParams,
} from "ag-grid-community";

export abstract class AbstractOverlayRenderer implements ILoadingOverlayComp {
  eGui: any;
  protected context: any;

  constructor(parentElement = "div") {
    // create empty div to place svelte component in
    this.eGui = document.createElement(parentElement);
    // add styles to center the component vertically
    this.eGui.style.display = "flex";
    this.eGui.style.flexDirection = "row";
    this.eGui.style.height = "100%";
    this.eGui.style.alignItems = "center";
  }

  init(loadingOverlayParams: ILoadingOverlayParams) {
    this.context = loadingOverlayParams.context;
    this.createComponent(loadingOverlayParams);
  }

  getGui() {
    return this.eGui;
  }

  refresh(loadingOverlayParams: ILoadingOverlayParams) {
    this.context = loadingOverlayParams.context;
    this.createComponent(loadingOverlayParams);
    return true;
  }
  abstract createComponent(loadingOverlayParams: ILoadingOverlayParams): void;
}

export function loadingOverlayRendererFactory(
  svelteComponent: (
    overlay: AbstractOverlayRenderer,
    overlayRendererParams: ILoadingOverlayParams,
  ) => void,
) {
  class Renderer extends AbstractOverlayRenderer {
    createComponent(
      overlayRendererParams: ILoadingOverlayParams<any, any>,
    ): void {
      svelteComponent(this, overlayRendererParams);
    }
  }
  return Renderer;
}
