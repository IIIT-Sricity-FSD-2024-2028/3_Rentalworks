import React, { useState } from "react";
import Icon from "./Icon";
import { ownerClasses as css } from "../classes";

export default function PropertyPhoto({ images = [], name = "Property" }) {
  const [failed, setFailed] = useState([]);

  // Normalize images whether passed as array, JSON string, or single string
  let list = [];
  if (Array.isArray(images)) {
    list = images;
  } else if (typeof images === "string" && images.trim()) {
    try {
      const parsed = JSON.parse(images);
      list = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      list = images
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  // Filter to valid URL strings that haven't failed to load
  const validList = list.filter(
    (item) =>
      typeof item === "string" &&
      item.trim().length > 0 &&
      /^(https?:\/\/|\/|data:image)/i.test(item.trim())
  );

  const source = validList.find((url) => !failed.includes(url));

  if (!source) {
    return (
      <div className={css("photo-empty")}>
        <Icon>apartment</Icon>
        <span>{validList.length ? "Photo unavailable" : "No photo added"}</span>
      </div>
    );
  }

  // Handle local Vite paths vs backend uploaded files
  let resolvedUrl = source.trim();
  if (resolvedUrl.startsWith("/uploads/")) {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
    resolvedUrl = `${apiBase.replace(/\/$/, "")}${resolvedUrl}`;
  }

  return (
    <img
      className={css("property-photo")}
      src={resolvedUrl}
      alt={name}
      loading="lazy"
      onError={() => setFailed((prev) => [...prev, source])}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

