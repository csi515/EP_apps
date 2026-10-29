import type { NotificationProvider, OpenNotificationParams } from "@refinedev/core";
import { showToast as defaultShowToast, type ShowToast } from "@/shared/feedback/uiFeedback";
import { sanitizeErrorToastMessage } from "@/shared/errors/userFacingError";

export interface NotificationProviderDeps {
  showToast: ShowToast;
}

function isUselessRefineErrorTitle(title: string): boolean {
  return /error\s*\(status code|failed to fetch|typeerror/i.test(title);
}

/**
 * Refine notificationProvider implementation for MOA v2.
 * Bridges Refine's internal CRUD & mutation notification lifecycle to MOA's unified toast system.
 */
export function createNotificationProvider(
  deps: NotificationProviderDeps = { showToast: defaultShowToast }
): NotificationProvider {
  return {
    open: ({ message, type, description }: OpenNotificationParams) => {
      const toastType = type === "progress" ? "info" : type;
      const rawMessage = message?.trim() ?? "";
      const rawDescription = description?.trim() ?? "";

      if (toastType === "error") {
        const body = sanitizeErrorToastMessage(rawDescription || rawMessage);
        const title =
          rawDescription && rawMessage && !isUselessRefineErrorTitle(rawMessage)
            ? sanitizeErrorToastMessage(rawMessage)
            : undefined;
        deps.showToast(body, "error", title);
        return;
      }

      if (rawDescription) {
        // When description is present, description is the detailed message and message is the title
        deps.showToast(rawDescription, toastType, rawMessage);
      } else {
        deps.showToast(rawMessage, toastType);
      }
    },

    close: (_key: string) => {
      // MOA toasts automatically auto-dismiss after duration or manually by user click
    },
  };
}

export const notificationProvider: NotificationProvider = createNotificationProvider();
