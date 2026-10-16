import { ownerClasses } from "../classes";
import Icon from "./Icon";
import React from "react";

// Toast: notification alerts (success, error, warning, info)
export default function Toast({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type) => {
    if (type === "success") return "check_circle";
    if (type === "error") return "cancel";
    if (type === "warning") return "warning";
    if (type === "reminder") return "notifications";
    return "info";
  };

  return (
    <div className={ownerClasses("toast-container")}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={ownerClasses(`toast ${toast.type || "info"}`)}
        >
          <Icon className={ownerClasses("toast-icon toast-icon-size")}>
            {getIcon(toast.type)}
          </Icon>
          <span className={ownerClasses("toast-msg")}>{toast.message}</span>
          <button
            className={ownerClasses("toast-close")}
            onClick={() => onRemove(toast.id)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
