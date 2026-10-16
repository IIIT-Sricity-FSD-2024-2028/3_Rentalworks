import React, { useState } from "react";
import { ownerClasses as css } from "../classes";
import Icon from "../components/Icon";

export default function Subscription({ subscription, onSubscribe }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const plans = subscription?.plans || [];
  const currentPlan = subscription?.currentPlan;
  const renewalDate = subscription?.renewalDate;
  const status = subscription?.status || "inactive";

  const price = (plan) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: plan.currency || "INR",
      maximumFractionDigits: 0,
    }).format(Number(plan.price || 0));

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  async function submit() {
    if (!selected) return;
    setSaving(true);
    try {
      if (await onSubscribe(selected.id)) setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={css("subs-container")}>
      <div className={css("subs-header")}>
        <h1>Owner Subscription Plans</h1>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#ffffff",
            padding: "8px 18px",
            borderRadius: "999px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            marginTop: "8px",
          }}
        >
          <span style={{ fontSize: "14px", color: "#64748b" }}>Current Status:</span>
          <strong style={{ fontSize: "14px", color: currentPlan ? "#2563eb" : "#64748b" }}>
            {currentPlan || "No active subscription"}
          </strong>
          {currentPlan && (
            <span
              className={css("badge")}
              style={{
                background: status.toLowerCase() === "active" ? "#ecfdf5" : "#fef3c7",
                color: status.toLowerCase() === "active" ? "#059669" : "#d97706",
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "999px",
              }}
            >
              ● {status.toUpperCase()}
            </span>
          )}
        </div>
        {renewalDate && (
          <p style={{ marginTop: "8px", fontSize: "13px", color: "#64748b" }}>
            Valid until: <strong>{formatDate(renewalDate)}</strong>
          </p>
        )}
        <p style={{ marginTop: "6px", fontSize: "13px", color: "#94a3b8" }}>
          All plan requests are activated via the management portal.
        </p>
      </div>

      {!plans.length && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#64748b" }}>Loading subscription plans...</p>
        </div>
      )}

      <div className={css("plans-grid")}>
        {plans.map((plan) => {
          const isCurrent =
            currentPlan &&
            (currentPlan.toLowerCase() === plan.displayName?.toLowerCase() ||
              currentPlan.toLowerCase() === plan.name?.toLowerCase());
          const pending = subscription?.requests?.some(
            (request) => request.planId === plan.id
          );

          return (
            <div
              key={plan.id}
              className={css("plan-card")}
              style={{
                borderColor: isCurrent ? "#2563eb" : plan.badge ? "#6366f1" : "#e2e8f0",
                boxShadow: isCurrent ? "0 8px 24px rgba(37,99,235,0.12)" : undefined,
              }}
            >
              {plan.badge && (
                <div className={css("plan-badge")}>{plan.badge}</div>
              )}
              {isCurrent && !plan.badge && (
                <div
                  className={css("plan-badge")}
                  style={{ background: "#2563eb" }}
                >
                  Active Plan
                </div>
              )}
              <h2 className={css("plan-name")}>{plan.displayName}</h2>
              <div className={css("plan-price")}>
                {price(plan)}
                <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 400 }}>
                  {" "}
                  / {plan.durationMonths ? `${plan.durationMonths} mo` : "lifetime"}
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                {plan.description}
              </p>
              <ul className={css("plan-features")}>
                {(plan.features || []).map((feature) => (
                  <li key={feature}>
                    <Icon style={{ color: "#10b981", marginRight: "8px" }}>
                      check_circle
                    </Icon>{" "}
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={css("btn-subscribe")}
                disabled={isCurrent || pending}
                onClick={() => setSelected(plan)}
                style={{
                  background: isCurrent ? "#e2e8f0" : pending ? "#fef3c7" : "#2563eb",
                  color: isCurrent ? "#64748b" : pending ? "#b45309" : "#ffffff",
                  cursor: isCurrent || pending ? "default" : "pointer",
                }}
              >
                {isCurrent
                  ? "✓ Current Plan"
                  : pending
                    ? "⏳ Request Pending"
                    : "Request Plan"}
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <div
          className={css("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div
            className={css("modal")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-title"
          >
            <div className={css("modal-header")}>
              <h2 id="plan-title" className={css("modal-title")}>
                Request {selected.displayName} Plan
              </h2>
              <button
                className={css("modal-close")}
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>
            <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6 }}>
              You are requesting the <strong>{selected.displayName}</strong> plan for{" "}
              <strong>{price(selected)}</strong> (
              {selected.durationMonths
                ? `${selected.durationMonths} month(s)`
                : "Lifetime"}
              ).
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginTop: "10px",
                background: "#f8fafc",
                padding: "10px",
                borderRadius: "8px",
              }}
            >
              ℹ️ Submitting records this request in the system. The platform admin
              will confirm activation upon receipt.
            </p>
            <div className={css("modal-footer")} style={{ marginTop: "20px" }}>
              <button
                className={css("btn btn-secondary")}
                disabled={saving}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button
                className={css("btn btn-primary")}
                disabled={saving}
                onClick={submit}
              >
                {saving ? "Submitting..." : "Confirm Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

