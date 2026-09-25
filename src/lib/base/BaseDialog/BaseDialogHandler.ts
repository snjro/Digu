export function openDialog(dialogElement: HTMLDialogElement | undefined): void {
  if (!dialogElement) return;
  dialogElement.showModal();
}
export function closeDialog(
  dialogElement: HTMLDialogElement | undefined,
): void {
  dialogElement?.close();
}
