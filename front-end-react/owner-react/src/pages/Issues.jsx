import { ownerClasses } from "../classes";
import Icon from "../components/Icon";
import React, { useState } from "react";

// Issues: Track, filter, resolve, report, and delete complaints
export default function Issues({
  issues = [],
  properties = [],
  onUpdateIssueStatus,
  onDeleteIssue,
  onAddIssue,
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [deletingIssue, setDeletingIssue] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newIssue, setNewIssue] = useState({
    propertyId: "",
    title: "",
    category: "Maintenance",
    priority: "Medium",
    reportedBy: "Owner",
    description: "",
  });
  const [addError, setAddError] = useState("");

  const openCount = issues.filter(
    (i) => (i.status || "").toLowerCase() === "open",
  ).length;
  const inProgressCount = issues.filter(
    (i) =>
      (i.status || "").toLowerCase() === "in progress" ||
      (i.status || "").toLowerCase() === "in-progress",
  ).length;
  const resolvedCount = issues.filter(
    (i) => (i.status || "").toLowerCase() === "resolved",
  ).length;

  const getCategoryIcon = (category) => {
    const icons = {
      Maintenance: "build",
      Internet: "wifi",
      Appliance: "computer",
      Housekeeping: "cleaning_services",
      Security: "lock",
      Electrical: "flash_on",
      Plumbing: "shower",
    };
    return icons[category] || "push_pin";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const filteredIssues = issues.filter((i) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.description && i.description.toLowerCase().includes(q)) ||
      (i.propertyName && i.propertyName.toLowerCase().includes(q)) ||
      (i.reportedBy && i.reportedBy.toLowerCase().includes(q));

    const iStatus = (i.status || "").toLowerCase();
    const fStatus = filterStatus.toLowerCase();
    const matchStatus =
      !filterStatus ||
      iStatus === fStatus ||
      (fStatus === "in progress" && iStatus === "in-progress") ||
      (fStatus === "in-progress" && iStatus === "in progress");

    const iPriority = (i.priority || "").toLowerCase();
    const fPriority = filterPriority.toLowerCase();
    const matchPriority = !filterPriority || iPriority === fPriority;

    const matchCategory =
      !filterCategory ||
      (i.category || "").toLowerCase() === filterCategory.toLowerCase();

    return matchSearch && matchStatus && matchPriority && matchCategory;
  });

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!newIssue.title.trim()) {
      setAddError("Issue title is required.");
      return;
    }

    const selectedProp = properties.find(
      (p) => String(p.id) === String(newIssue.propertyId),
    );
    if (!selectedProp) {
      setAddError("Select a property for this issue.");
      return;
    }
    const issueToSubmit = {
      id: "issue_" + Date.now(),
      propertyId: selectedProp.id,
      propertyName: selectedProp.name,
      title: newIssue.title.trim(),
      category: newIssue.category,
      priority: newIssue.priority,
      status: "Open",
      reportedBy: newIssue.reportedBy.trim() || "Owner",
      reportedDate: new Date().toISOString().split("T")[0],
      description: newIssue.description.trim() || "No description provided.",
    };

    if (!(await onAddIssue(issueToSubmit))) return;
    setIsAddModalOpen(false);
    setNewIssue({
      propertyId: "",
      title: "",
      category: "Maintenance",
      priority: "Medium",
      reportedBy: "Owner",
      description: "",
    });
    setAddError("");
  };

  return (
    <div>
      {/* 3 Summary Stats Cards */}
      <div className={ownerClasses("grid-3-stats")}>
        <div className={ownerClasses("stat-card")}>
          <div className={ownerClasses("stat-icon red")}>
            <Icon className={ownerClasses("icon-22 icon-danger")}>error</Icon>
          </div>
          <div className={ownerClasses("stat-info")}>
            <div className={ownerClasses("stat-value")}>{openCount}</div>
            <div className={ownerClasses("stat-label")}>Open Issues</div>
          </div>
        </div>

        <div className={ownerClasses("stat-card")}>
          <div className={ownerClasses("stat-icon orange")}>
            <Icon className={ownerClasses("icon-22 icon-warning")}>
              pending
            </Icon>
          </div>
          <div className={ownerClasses("stat-info")}>
            <div className={ownerClasses("stat-value")}>{inProgressCount}</div>
            <div className={ownerClasses("stat-label")}>In Progress</div>
          </div>
        </div>

        <div className={ownerClasses("stat-card")}>
          <div className={ownerClasses("stat-icon green")}>
            <Icon className={ownerClasses("icon-22 icon-success")}>
              check_circle
            </Icon>
          </div>
          <div className={ownerClasses("stat-info")}>
            <div className={ownerClasses("stat-value")}>{resolvedCount}</div>
            <div className={ownerClasses("stat-label")}>Resolved</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={ownerClasses("filter-bar")}>
        <div className={ownerClasses("filter-search")}>
          <Icon className={ownerClasses("icon-20 icon-muted")}>search</Icon>
          <input
            type="text"
            id="issueSearch"
            placeholder="Search issues"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={ownerClasses("filter-select")}
          id="filterIssueStatus"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select
          className={ownerClasses("filter-select")}
          id="filterIssuePriority"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          className={ownerClasses("filter-select")}
          id="filterIssueCategory"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Internet">Internet</option>
          <option value="Appliance">Appliance</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Security">Security</option>
          <option value="Electrical">Electrical</option>
        </select>

        <div className={ownerClasses("ml-auto")}>
          <button
            className={ownerClasses("btn btn-primary")}
            onClick={() => setIsAddModalOpen(true)}
          >
            <Icon className={ownerClasses("icon-18 icon-middle")}>add</Icon>{" "}
            Report Issue
          </button>
        </div>
      </div>

      {/* Issues List */}
      <div id="issuesList">
        {filteredIssues.length === 0 ? (
          <div className={ownerClasses("empty-state")}>
            <div className={ownerClasses("empty-icon")}>
              <Icon className={ownerClasses("icon-48 icon-success")}>
                check_circle
              </Icon>
            </div>
            <h3>No Issues Found</h3>
            <p>Try adjusting your filters, or all issues are resolved!</p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={ownerClasses("issue-card")}
              id={`issue-card-${issue.id}`}
            >
              <div
                className={ownerClasses(
                  `issue-icon ${issue.priority ? issue.priority.toLowerCase() : "medium"}`,
                )}
              >
                <Icon className={ownerClasses("icon-18")}>
                  {getCategoryIcon(issue.category)}
                </Icon>
              </div>

              <div className={ownerClasses("issue-body")}>
                <div className={ownerClasses("issue-title")}>{issue.title}</div>
                <div className={ownerClasses("issue-meta")}>
                  <span className={ownerClasses("badge badge-owner-tag")}>
                    <Icon className={ownerClasses("icon-14 icon-middle")}>
                      person
                    </Icon>{" "}
                    Reported by: {issue.reportedBy || "Warden"}
                  </span>
                  <span>•</span>
                  <span>
                    <Icon className={ownerClasses("icon-14 icon-middle")}>
                      apartment
                    </Icon>{" "}
                    {issue.propertyName || "Sunrise PG"}
                  </span>
                  <span>•</span>
                  <span>
                    <Icon className={ownerClasses("icon-14 icon-middle")}>
                      calendar_today
                    </Icon>{" "}
                    {formatDate(issue.reportedDate)}
                  </span>
                  <span>•</span>
                  <span
                    className={ownerClasses(
                      `badge badge-${(issue.priority || "medium").toLowerCase()}`,
                    )}
                  >
                    {issue.priority}
                  </span>
                  <span
                    className={ownerClasses(
                      `badge badge-${(issue.status || "open").toLowerCase().replace(" ", "")}`,
                    )}
                  >
                    {issue.status}
                  </span>

                  {issue._escalatedByWarden && (
                    <span className={ownerClasses("badge badge-escalated")}>
                      <Icon className={ownerClasses("icon-12 icon-middle")}>
                        warning
                      </Icon>{" "}
                      Escalated by Warden
                    </span>
                  )}
                  {issue._isGlobal && !issue._escalatedByWarden && (
                    <span className={ownerClasses("badge badge-tenant")}>
                      <Icon className={ownerClasses("icon-12 icon-middle")}>
                        mail
                      </Icon>{" "}
                      Reported by Tenant
                    </span>
                  )}
                </div>

                <div className={ownerClasses("issue-desc")}>
                  {issue.description || "No description provided."}
                </div>
              </div>

              <div className={ownerClasses("issue-actions")}>
                {issue.status !== "Resolved" ? (
                  <>
                    <button
                      className={ownerClasses("btn btn-success btn-sm")}
                      onClick={() => onUpdateIssueStatus(issue.id, "Resolved")}
                    >
                      <Icon className={ownerClasses("icon-16 icon-middle")}>
                        check
                      </Icon>{" "}
                      Resolve
                    </button>
                    {issue.status === "Open" && (
                      <button
                        className={ownerClasses("btn btn-warning btn-sm")}
                        onClick={() =>
                          onUpdateIssueStatus(issue.id, "In Progress")
                        }
                      >
                        <Icon className={ownerClasses("icon-16 icon-middle")}>
                          schedule
                        </Icon>{" "}
                        In Progress
                      </button>
                    )}
                  </>
                ) : (
                  <span className={ownerClasses("badge badge-resolved")}>
                    <Icon className={ownerClasses("icon-14 icon-middle")}>
                      check_circle
                    </Icon>{" "}
                    Resolved
                  </span>
                )}

                <button
                  className={ownerClasses("btn btn-danger btn-sm")}
                  onClick={() => setDeletingIssue(issue)}
                >
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    delete
                  </Icon>{" "}
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Report New Issue */}
      {isAddModalOpen && (
        <div
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>
                <Icon className={ownerClasses("icon-22 icon-middle icon-mr-6")}>
                  warning
                </Icon>{" "}
                Report New Issue
              </span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setIsAddModalOpen(false)}
              >
                ×
              </button>
            </div>

            {addError && (
              <div className={ownerClasses("alert-danger-sm")}>{addError}</div>
            )}

            <form onSubmit={handleCreateIssue}>
              <div className={ownerClasses("modal-form-scroll")}>
                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>
                    Property <span className={ownerClasses("req")}>*</span>
                  </label>
                  <select
                    className={ownerClasses("form-input")}
                    value={newIssue.propertyId}
                    onChange={(e) => {
                      const update = { propertyId: e.target.value };
                      setNewIssue((prev) => Object.assign({}, prev, update));
                    }}
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>
                    Issue Title <span className={ownerClasses("req")}>*</span>
                  </label>
                  <input
                    className={ownerClasses("form-input")}
                    placeholder="Brief description of the issue"
                    value={newIssue.title}
                    onChange={(e) => {
                      const update = { title: e.target.value };
                      setNewIssue((prev) => Object.assign({}, prev, update));
                    }}
                    required
                  />
                </div>

                <div className={ownerClasses("form-grid")}>
                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>
                      Category
                    </label>
                    <select
                      className={ownerClasses("form-input")}
                      value={newIssue.category}
                      onChange={(e) => {
                        const update = { category: e.target.value };
                        setNewIssue((prev) => Object.assign({}, prev, update));
                      }}
                    >
                      <option value="Maintenance">Maintenance</option>
                      <option value="Internet">Internet</option>
                      <option value="Appliance">Appliance</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Security">Security</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Plumbing">Plumbing</option>
                    </select>
                  </div>

                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>
                      Priority
                    </label>
                    <select
                      className={ownerClasses("form-input")}
                      value={newIssue.priority}
                      onChange={(e) => {
                        const update = { priority: e.target.value };
                        setNewIssue((prev) => Object.assign({}, prev, update));
                      }}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>
                    Reported By
                  </label>
                  <input
                    className={ownerClasses("form-input")}
                    placeholder="Tenant or staff name"
                    value={newIssue.reportedBy}
                    onChange={(e) => {
                      const update = { reportedBy: e.target.value };
                      setNewIssue((prev) => Object.assign({}, prev, update));
                    }}
                  />
                </div>

                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>
                    Description
                  </label>
                  <textarea
                    className={ownerClasses("form-input")}
                    rows="3"
                    placeholder="Detailed description of the issue"
                    value={newIssue.description}
                    onChange={(e) => {
                      const update = { description: e.target.value };
                      setNewIssue((prev) => Object.assign({}, prev, update));
                    }}
                  ></textarea>
                </div>
              </div>

              <div className={ownerClasses("modal-footer")}>
                <button
                  type="button"
                  className={ownerClasses("btn btn-secondary")}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={ownerClasses("btn btn-primary")}
                >
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    add
                  </Icon>{" "}
                  Add Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Issue Confirmation */}
      {deletingIssue && (
        <div
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingIssue(null);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>Delete Issue</span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setDeletingIssue(null)}
              >
                ×
              </button>
            </div>
            <p className={ownerClasses("modal-desc-text")}>
              Are you sure you want to delete "
              <strong>{deletingIssue.title}</strong>"? This action cannot be
              undone.
            </p>
            <div className={ownerClasses("modal-footer")}>
              <button
                className={ownerClasses("btn btn-secondary")}
                onClick={() => setDeletingIssue(null)}
              >
                Cancel
              </button>
              <button
                className={ownerClasses("btn btn-danger")}
                onClick={() => {
                  onDeleteIssue(deletingIssue.id);
                  setDeletingIssue(null);
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
