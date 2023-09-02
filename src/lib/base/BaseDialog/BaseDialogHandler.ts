import { storeNoDbCountShowingDialog } from "@stores/storeNoDb";
import { get } from "svelte/store";

export function openDialog(dialogElement: HTMLDialogElement): void {
  dialogElement.showModal();
  let currentCountShowingDialog: number = get(storeNoDbCountShowingDialog);
  if (currentCountShowingDialog < 0) {
    currentCountShowingDialog = 0;
  }
  storeNoDbCountShowingDialog.set(currentCountShowingDialog + 1);
  dialogElement.addEventListener("click", (mouseEvent: MouseEvent) => {
    if (mouseEvent.target === dialogElement) {
      closeDialog(dialogElement);
    }
  });
}
export function closeDialog(dialogElement: HTMLDialogElement): void {
  dialogElement.close();
  let currentCountShowingDialog: number = get(storeNoDbCountShowingDialog);
  if (currentCountShowingDialog < 1) {
    currentCountShowingDialog = 1;
  }
  storeNoDbCountShowingDialog.set(currentCountShowingDialog - 1);
}
