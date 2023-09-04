export function openDialog(dialogElement: HTMLDialogElement): void {
  dialogElement.showModal();
  dialogElement.addEventListener("click", (mouseEvent: MouseEvent) => {
    if (mouseEvent.target === dialogElement) {
      closeDialog(dialogElement);
    }
  });
}
export function closeDialog(dialogElement: HTMLDialogElement): void {
  dialogElement.close();
}
