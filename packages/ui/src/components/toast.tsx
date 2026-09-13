"use client";

import { Toast } from "@base-ui/react/toast";

export const toast = Toast.createToastManager();

export function Toaster() {
  return (
    <Toast.Provider toastManager={toast} timeout={2500} limit={1}>
      <ToastList />
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed inset-x-4 bottom-6 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none">
        {toasts.map((item) => (
          <Toast.Root
            key={item.id}
            toast={item}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-md data-[limited]:hidden"
          >
            <Toast.Content>
              <Toast.Title />
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
