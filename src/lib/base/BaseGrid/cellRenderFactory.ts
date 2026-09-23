/* eslint @typescript-eslint/no-explicit-any: 0 */
/**
 * Base class for embedding a svelte component within an AGGrid call.
 * See: https://stackoverflow.com/a/72608215
 */
import type { ICellRendererComp, ICellRendererParams } from "ag-grid-community";
import type { mount as svelteMount } from "svelte";
import { MountedComponents } from "./mountedComponents";

/**
 * Class for defining a cell renderer.
 * If you don't need to define a separate class you could use cellRendererFactory
 * to create a component with the column definitions.
 */
export abstract class AbstractCellRenderer implements ICellRendererComp {
  eGui: any;
  protected value: any;
  private mountedComponents = new MountedComponents();

  constructor(parentElement = "div") {
    // create empty span (or other element) to place svelte component in
    this.eGui = document.createElement(parentElement);
    // add styles to center the component vertically
    this.eGui.style.display = "flex";
    this.eGui.style.flexDirection = "row";
    this.eGui.style.height = "100%";
    this.eGui.style.alignItems = "center";
  }

  init(cellRendererParams: ICellRendererParams) {
    this.value = cellRendererParams.value;
    this.createComponent(cellRendererParams);
  }

  getGui() {
    return this.eGui;
  }

  // Returning false makes ag-grid destroy this renderer and create a new one.
  refresh(): boolean {
    return false;
  }

  destroy(): void {
    this.mountedComponents.unmountAll();
  }

  /** svelte's mount() that also unmounts the component on destroy. */
  mount: typeof svelteMount = this.mountedComponents.mount;

  /**
   * Define and create the svelte component to use in the cell
   * @example
   * // This is all you need to do within this method: create the component with this.mount,
   *    specify the target is the class, and pass in props via the params.
   * this.mount(CampusIcon, {
   *    target: this.eGui,
   *    props: {
   *        color: params.data?.color,
   *        name: params.data?.name
   * }
   * @param params params for rendering the call, including the value for the cell
   */
  abstract createComponent(params: ICellRendererParams): void;
}

/**
 * Creates a cell renderer using the given callback for how to initialise a svelte component.
 * See AbstractCellRenderer.createComponent
 * @param svelteComponent function for how to create the svelte component
 * @returns
 */
export function cellRendererFactory(
  svelteComponent: (
    cell: AbstractCellRenderer,
    cellRendererParams: ICellRendererParams,
  ) => void,
) {
  class Renderer extends AbstractCellRenderer {
    createComponent(cellRendererParams: ICellRendererParams<any, any>): void {
      svelteComponent(this, cellRendererParams);
    }
  }
  return Renderer;
}
