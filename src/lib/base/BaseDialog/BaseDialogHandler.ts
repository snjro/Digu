export function openDialog(dialogElement: HTMLDialogElement | undefined): void {
  if (!dialogElement) return;
  dialogElement.showModal();
  dialogElement.addEventListener("click", (mouseEvent: MouseEvent) => {
    if (mouseEvent.target === dialogElement) {
      closeDialog(dialogElement);
    }
  });
}
export function closeDialog(
  dialogElement: HTMLDialogElement | undefined,
): void {
  dialogElement?.close();
}
