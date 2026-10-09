import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Alert, Dataset, Priority, Status } from "./types";
import {
  acknowledgeAlert,
  addAlternateExit,
  addAudit,
  addEvidence,
  addNote,
  loadData,
  recordOutcome,
  resetDemo,
  updateCase,
  updateNote,
  updateWarning,
  upsertAlert,
  upsertIntervention,
} from "./service";

const nav = [
  ["Overview", "Overview Dashboard", "⌂"],
  ["Predictive cash-out", "Predictive Cash-Out Intelligence", "◈"],
  ["GIS heatmap", "GIS Risk Heatmap", "◎"],
  ["Cases", "Case Management", "▤"],
  ["Workspace", "Investigation Workspace", "⌁"],
  ["Interventions", "Intervention Prioritisation", "↗"],
  ["Suo-motu", "Proactive / Suo-Motu Intelligence", "✦"],
  ["Alternate exits", "Adaptive / Alternate-Exit Intelligence", "↝"],
  ["Alerts", "Alerts and Notifications", "◉"],
  ["Network", "Network Intelligence", "⌘"],
  ["Strategic", "Strategic Intelligence", "◫"],
  ["Reports", "Reports and Evidence", "▥"],
  ["Audit log", "Activity and Audit Log", "◷"],
  ["Settings", "Settings and Demo Controls", "⚙"],
] as const;
const money = (n: number) => `₹${(n / 100000).toFixed(2)}L`;
const timeAgo = (date: string) => {
  const mins = Math.max(
    1,
    Math.round((Date.now() - new Date(date).getTime()) / 60000),
  );
  return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
};

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function PriorityBadge({ value }: { value: Priority }) {
  return <Badge tone={value.toLowerCase()}>{value}</Badge>;
}
function Metric({
  label,
  value,
  note,
  accent = "blue",
  onClick,
}: {
  label: string;
  value: string;
  note: string;
  accent?: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={`metric ${accent} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className="metric-label">{label}</div>
      <strong>{value}</strong>
      <small>{note}</small>
    </button>
  );
}
function Header({
  title,
  eyebrow,
  onAction,
}: {
  title: string;
  eyebrow?: string;
  onAction?: () => void;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow || "INTELLIGENCE CONSOLE"}</div>
        <h1>{title}</h1>
        <p>Authorised operational view · Updated moments ago</p>
      </div>
      {onAction && (
        <button className="button primary" onClick={onAction}>
          ＋ Add investigation note
        </button>
      )}
    </div>
  );
}
function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>{title}</h2>
        {action && (
          <button className="text-button" onClick={onAction}>
            {action} →
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

function Overview({
  data,
  setData,
  setPage,
  openCase,
}: {
  data: Dataset;
  setData: (d: Dataset) => void;
  setPage: (p: string) => void;
  openCase: (id: string) => void;
}) {
  const [range, setRange] = useState("7d");
  const [region, setRegion] = useState("All regions");
  const [category, setCategory] = useState("All categories");
  const [severity, setSeverity] = useState("All severity");
  const [status, setStatus] = useState("All statuses");
  const maxDate = Math.max(
    ...data.complaints.map((item) => new Date(item.createdAt).getTime()),
    Date.now(),
  );
  const rangeMs =
    range === "24h" ? 86400000 : range === "30d" ? 2592000000 : 604800000;
  const inRange = (date: string) =>
    maxDate - new Date(date).getTime() <= rangeMs;
  const caseForComplaint = (caseId: string) =>
    data.cases.find((item) => item.id === caseId);
  const selectedCaseIds = new Set(
    data.cases
      .filter((item) => {
        const complaint = data.complaints.find(
          (entry) => entry.caseId === item.id,
        );
        return (
          complaint &&
          inRange(complaint.createdAt) &&
          (region === "All regions" || complaint.location.includes(region)) &&
          (category === "All categories" || complaint.category === category) &&
          (severity === "All severity" || item.priority === severity) &&
          (status === "All statuses" || item.status === status)
        );
      })
      .map((item) => item.id),
  );
  const complaints = data.complaints.filter((item) =>
    selectedCaseIds.has(item.caseId),
  );
  const cases = data.cases.filter((item) => selectedCaseIds.has(item.id));
  const predictions = data.predictions.filter((item) =>
    selectedCaseIds.has(item.caseId),
  );
  const alerts = data.alerts.filter(
    (item) =>
      (!item.caseId || selectedCaseIds.has(item.caseId)) &&
      (severity === "All severity" || item.priority === severity),
  );
  const candidates = data.candidates.filter((item) =>
    predictions.some((prediction) => prediction.candidateIds.includes(item.id)),
  );
  const interventions = data.interventions.filter((item) =>
    selectedCaseIds.has(item.caseId),
  );
  const warnings = data.warnings.filter(
    (item) => severity === "All severity" || item.severity === severity,
  );
  const regions = Array.from(
    new Set(
      data.complaints.map(
        (item) => item.location.split(",")[1]?.trim() || item.location,
      ),
    ),
  ).sort();
  const categories = Array.from(
    new Set(data.complaints.map((item) => item.category)),
  ).sort();
  const reset = () => {
    setRange("7d");
    setRegion("All regions");
    setCategory("All categories");
    setSeverity("All severity");
    setStatus("All statuses");
  };
  const goCases = () => setPage("Cases");
  const goAlerts = () => setPage("Alerts");
  const byDay = (records: { createdAt: string }[]) =>
    Array.from(new Set(records.map((item) => item.createdAt.slice(0, 10))))
      .sort()
      .map((day) => ({
        day: day.slice(5),
        count: records.filter((item) => item.createdAt.startsWith(day)).length,
      }));
  const complaintTrend = byDay(complaints);
  const riskTrend = byDay(predictions).map((item) => ({
    ...item,
    risk: Math.round(
      predictions
        .filter((prediction) =>
          prediction.createdAt.startsWith(`2026-${item.day}`),
        )
        .reduce((sum, prediction) => sum + prediction.confidence, 0) /
        Math.max(
          1,
          predictions.filter((prediction) =>
            prediction.createdAt.startsWith(`2026-${item.day}`),
          ).length,
        ),
    ),
  }));
  const severityData = ["Critical", "High", "Medium", "Low"]
    .map((name) => ({
      name,
      value: alerts.filter((item) => item.priority === name).length,
    }))
    .filter((item) => item.value);
  const statusData = [
    "Open",
    "In Review",
    "Escalated",
    "Monitoring",
    "Resolved",
  ]
    .map((name) => ({
      name,
      value: cases.filter((item) => item.status === name).length,
    }))
    .filter((item) => item.value);
  const routeData = Array.from(
    new Set(data.alternateExits.map((item) => item.type)),
  )
    .map((name) => ({
      name,
      value: data.alternateExits.filter(
        (item) =>
          item.type === name &&
          selectedCaseIds.has(
            data.accounts.find((account) => account.id === item.accountId)
              ?.caseId || "",
          ),
      ).length,
    }))
    .filter((item) => item.value);
  const outcomeData = [
    {
      name: "Completed",
      value: interventions.filter((item) => item.status === "Completed").length,
    },
    {
      name: "In progress",
      value: interventions.filter((item) => item.status === "In Progress")
        .length,
    },
    {
      name: "Recommended",
      value: interventions.filter((item) => item.status === "Recommended")
        .length,
    },
  ].filter((item) => item.value);
  const colors = ["#f36f7e", "#f5b65f", "#51c9a5", "#55bce8"];
  const queue = [
    ...alerts
      .filter((item) => !item.acknowledged)
      .map((item) => ({
        id: item.id,
        caseId: item.caseId,
        title: item.title,
        detail: item.detail,
        priority: item.priority,
        amount: item.caseId
          ? complaints.find((complaint) => complaint.caseId === item.caseId)
              ?.amount
          : undefined,
        window: item.caseId
          ? predictions.find((prediction) => prediction.caseId === item.caseId)
              ?.window
          : undefined,
        location: item.caseId
          ? candidates.find((candidate) =>
              predictions
                .find((prediction) => prediction.caseId === item.caseId)
                ?.candidateIds.includes(candidate.id),
            )?.location
          : "Cross-region",
        status: "Unacknowledged",
        owner: item.caseId
          ? caseForComplaint(item.caseId)?.assignee
          : "Fusion Cell",
        action: "Acknowledge alert",
        kind: "alert" as const,
      })),
    ...predictions.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      title: `Cash-out prediction · ${caseForComplaint(item.caseId)?.reference || item.caseId}`,
      detail: item.rationale,
      priority: (item.confidence >= 85
        ? "Critical"
        : item.confidence >= 70
          ? "High"
          : "Medium") as Priority,
      amount: candidates.find((candidate) =>
        item.candidateIds.includes(candidate.id),
      )?.amount,
      window: item.window,
      location:
        candidates.find((candidate) => item.candidateIds.includes(candidate.id))
          ?.location || "Location pending",
      status: "Prediction active",
      owner: caseForComplaint(item.caseId)?.assignee || "Fusion Cell",
      action: "Open prediction",
      kind: "prediction" as const,
    })),
  ]
    .sort(
      (a, b) =>
        (b.priority === "Critical" ? 3 : b.priority === "High" ? 2 : 1) -
        (a.priority === "Critical" ? 3 : a.priority === "High" ? 2 : 1),
    )
    .slice(0, 5);
  const activity = [
    ...data.complaints
      .filter((item) => selectedCaseIds.has(item.caseId))
      .map((item) => ({
        id: item.id,
        title: "New synthetic complaint received",
        detail: `${item.reference} · ${item.category}`,
        date: item.createdAt,
        target: item.caseId,
        page: "Workspace",
      })),
    ...data.predictions
      .filter((item) => selectedCaseIds.has(item.caseId))
      .map((item) => ({
        id: item.id,
        title: "Prediction created or refreshed",
        detail: `${Math.round(item.confidence)}% confidence · ${item.window}`,
        date: item.updatedAt,
        target: item.caseId,
        page: "Predictive cash-out",
      })),
    ...data.alerts
      .filter(
        (item) =>
          !item.acknowledged &&
          (!item.caseId || selectedCaseIds.has(item.caseId)),
      )
      .map((item) => ({
        id: item.id,
        title: "High-priority alert generated",
        detail: item.detail,
        date: item.createdAt,
        target: item.caseId || item.id,
        page: item.caseId ? "Workspace" : "Alerts",
      })),
    ...data.notes
      .filter((item) => selectedCaseIds.has(item.caseId))
      .map((item) => ({
        id: item.id,
        title: "Investigation note added",
        detail: item.text,
        date: item.createdAt,
        target: item.caseId,
        page: "Workspace",
      })),
    ...data.interventions
      .filter((item) => selectedCaseIds.has(item.caseId))
      .map((item) => ({
        id: item.id,
        title: "Intervention recommendation reviewed",
        detail: item.action,
        date: item.updatedAt,
        target: item.caseId,
        page: "Interventions",
      })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);
  const metric = (
    label: string,
    value: string,
    note: string,
    accent: string,
    action: () => void,
  ) => (
    <Metric
      label={label}
      value={value}
      note={note}
      accent={accent}
      onClick={action}
    />
  );
  return (
    <>
      <Header title="Overview dashboard" eyebrow="COMMAND CENTRE" />
      <div className="demo-banner">
        <span className="live-dot" /> Synthetic Data Demo · Scores, predictions,
        alerts, and outcomes are simulated for authorised workflow testing.
      </div>
      <div className="dashboard-filters">
        <select
          value={range}
          onChange={(event) => setRange(event.target.value)}
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <select
          value={region}
          onChange={(event) => setRegion(event.target.value)}
        >
          <option>All regions</option>
          {regions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option>All categories</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
        >
          <option>All severity</option>
          {["Critical", "High", "Medium", "Low"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option>All statuses</option>
          {["Open", "In Review", "Escalated", "Monitoring", "Resolved"].map(
            (item) => (
              <option key={item}>{item}</option>
            ),
          )}
        </select>
        <button className="button" onClick={reset}>
          Reset filters
        </button>
      </div>
      <div className="metrics">
        {metric(
          "Total complaints",
          String(complaints.length),
          `${range} · ${category === "All categories" ? "all categories" : category}`,
          "blue",
          goCases,
        )}
        {metric(
          "Active cases requiring investigation",
          String(cases.filter((item) => item.status !== "Resolved").length),
          "Open, review, escalated, or monitoring",
          "red",
          goCases,
        )}
        {metric(
          "Cases with active prediction",
          String(new Set(predictions.map((item) => item.caseId)).size),
          `${predictions.length} simulated predictions`,
          "orange",
          () => setPage("Predictive cash-out"),
        )}
        {metric(
          "High-priority predicted locations",
          String(candidates.filter((item) => item.riskScore >= 80).length),
          "Risk score ≥ 80",
          "purple",
          () => setPage("GIS heatmap"),
        )}
        {metric(
          "Unacknowledged alerts",
          String(alerts.filter((item) => !item.acknowledged).length),
          "Needs operational acknowledgement",
          "red",
          goAlerts,
        )}
        {metric(
          "Pending intervention recommendations",
          String(
            interventions.filter((item) => item.status === "Recommended")
              .length,
          ),
          "Awaiting response review",
          "orange",
          () => setPage("Interventions"),
        )}
        {metric(
          "Early warnings requiring review",
          String(warnings.filter((item) => item.status === "New").length),
          "New synthetic signals",
          "purple",
          () => setPage("Suo-motu"),
        )}
        {metric(
          "Completed interventions",
          String(
            interventions.filter((item) => item.status === "Completed").length,
          ),
          "Recorded outcomes",
          "green",
          () => setPage("Interventions"),
        )}
      </div>
      <div className="grid two">
        <Section
          title="Priority action queue"
          action={`${queue.length} urgent items`}
        >
          <div className="action-queue">
            {queue.length ? (
              queue.map((item) => (
                <div className="action-item" key={`${item.kind}-${item.id}`}>
                  <div className={`alert-icon ${item.priority.toLowerCase()}`}>
                    !
                  </div>
                  <div className="action-main">
                    <strong>{item.title}</strong>
                    <small>
                      {item.id} · {item.detail}
                    </small>
                    <div className="action-meta">
                      <PriorityBadge value={item.priority} />
                      <span>
                        {item.amount ? money(item.amount) : "Exposure pending"}
                      </span>
                      <span>{item.window || "No window"}</span>
                      <span>{item.location}</span>
                      <span>{item.owner}</span>
                    </div>
                  </div>
                  <Badge
                    tone={
                      item.status === "Unacknowledged" ? "red" : "in-review"
                    }
                  >
                    {item.status}
                  </Badge>
                  <button
                    className="text-button"
                    onClick={() =>
                      item.kind === "alert"
                        ? setData(acknowledgeAlert(data, item.id))
                        : openCase(item.caseId)
                    }
                  >
                    {item.kind === "alert" ? "Acknowledge" : "Open"}
                  </button>
                </div>
              ))
            ) : (
              <Empty text="No urgent items match the active filters." />
            )}
          </div>
        </Section>
        <Section title="Recent activity" action="Open audit log">
          <div className="activity-feed">
            {activity.length ? (
              activity.map((item) => (
                <button
                  className="activity-item"
                  key={`${item.id}-${item.title}`}
                  onClick={() =>
                    item.page === "Workspace"
                      ? openCase(item.target)
                      : setPage(item.page)
                  }
                >
                  <span className="activity-dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                    <small>{timeAgo(item.date)}</small>
                  </div>
                  <span className="chevron">›</span>
                </button>
              ))
            ) : (
              <Empty text="No recent activity matches the active filters." />
            )}
          </div>
        </Section>
      </div>
      <div className="grid two">
        <Section title="Complaint volume and predicted risk over time">
          <div className="chart">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={complaintTrend}>
                <defs>
                  <linearGradient id="overviewFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#37b9ff" stopOpacity=".3" />
                    <stop offset="100%" stopColor="#37b9ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  stroke="#63748a"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#63748a"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#132237",
                    border: "1px solid #243954",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  name="Complaints"
                  dataKey="count"
                  stroke="#37b9ff"
                  fill="url(#overviewFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={riskTrend}>
                <XAxis
                  dataKey="day"
                  stroke="#63748a"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#63748a"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#132237",
                    border: "1px solid #243954",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  name="Prediction confidence"
                  dataKey="risk"
                  stroke="#f3aa55"
                  fill="none"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Alerts by severity">
          <div className="chart">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={4}
                  onClick={() => goAlerts()}
                >
                  {severityData.map((item, index) => (
                    <Cell key={item.name} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#132237",
                    border: "1px solid #243954",
                    borderRadius: 8,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            {!severityData.length && (
              <Empty text="No alert data for these filters." />
            )}
          </div>
        </Section>
      </div>
      <div className="grid three">
        <Section title="Cases by investigation status">
          <div className="chart">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={statusData} onClick={() => goCases()}>
                <XAxis
                  dataKey="name"
                  stroke="#63748a"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#63748a"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#132237",
                    border: "1px solid #243954",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="value" fill="#51c9a5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {!statusData.length && <Empty text="No cases for these filters." />}
          </div>
        </Section>
        <Section title="Likely cash-out routes">
          <div className="chart">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={routeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={3}
                  onClick={() => setPage("Alternate exits")}
                >
                  {routeData.map((item, index) => (
                    <Cell key={item.name} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#132237",
                    border: "1px solid #243954",
                    borderRadius: 8,
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            {!routeData.length && (
              <Empty text="No route data for these filters." />
            )}
          </div>
        </Section>
        <Section title="Intervention outcomes">
          <div className="chart">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={outcomeData}
                onClick={() => setPage("Interventions")}
              >
                <XAxis
                  dataKey="name"
                  stroke="#63748a"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#63748a"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#132237",
                    border: "1px solid #243954",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="value" fill="#a681e4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {!outcomeData.length && (
              <Empty text="No intervention outcomes for these filters." />
            )}
          </div>
        </Section>
      </div>
      <div className="grid two">
        <Section
          title="Geographic risk preview"
          action="Open full GIS heatmap"
          onAction={() => setPage("GIS heatmap")}
        >
          <div className="map-preview">
            <MapContainer
              center={[16.5, 76]}
              zoom={5}
              scrollWheelZoom={false}
              style={{ height: 270 }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {candidates.map((candidate) => (
                <Circle
                  key={candidate.id}
                  center={[candidate.latitude, candidate.longitude]}
                  radius={candidate.riskScore * 30}
                  pathOptions={{
                    color: candidate.riskScore >= 80 ? "#ff667b" : "#f5a84b",
                    fillColor:
                      candidate.riskScore >= 80 ? "#ff667b" : "#f5a84b",
                    fillOpacity: 0.35,
                  }}
                >
                  <Popup>
                    <strong>{candidate.location}</strong>
                    <br />
                    {candidate.riskScore}% simulated risk ·{" "}
                    {money(candidate.amount)}
                    <br />
                    <button
                      className="text-button"
                      onClick={() => setPage("GIS heatmap")}
                    >
                      Open GIS heatmap →
                    </button>
                  </Popup>
                </Circle>
              ))}
            </MapContainer>
            {!candidates.length && (
              <div className="map-empty">
                No geographic signals match the active filters.
              </div>
            )}
          </div>
        </Section>
        <Section title="Operational posture">
          <div className="posture">
            <div className="posture-score">
              {data.audit.length}
              <small> events</small>
            </div>
            <div>
              <strong>Local demo state</strong>
              <small>Changes persist in this browser</small>
            </div>
          </div>
          <div className="progress">
            <i
              style={{
                width: `${Math.min(100, Math.round((interventions.filter((item) => item.status === "Completed").length / Math.max(1, interventions.length)) * 100))}%`,
              }}
            />
          </div>
          <div className="status-line">
            <span className="live-dot" />
            Synthetic records only · no live system connection
          </div>
        </Section>
      </div>
    </>
  );
}

function Cases({
  data,
  setData,
  setPage,
  openCase,
}: {
  data: Dataset;
  setData: (d: Dataset) => void;
  setPage: (p: string) => void;
  openCase: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [priority, setPriority] = useState("All priorities");
  const [sort, setSort] = useState("updated");
  const [page, setPageNumber] = useState(0);
  const pageSize = 10;
  const rows = data.cases
    .map((item) => {
      const complaint = data.complaints.find((c) =>
        item.complaintIds.includes(c.id),
      );
      const tx = data.transactions.filter((t) => t.caseId === item.id);
      const prediction = data.predictions.find((p) => p.caseId === item.id);
      const interventions = data.interventions.filter(
        (i) => i.caseId === item.id,
      );
      return { item, complaint, tx, prediction, interventions };
    })
    .filter(
      (row) =>
        (!query ||
          `${row.item.reference} ${row.item.title} ${row.complaint?.category || ""} ${row.complaint?.location || ""}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (status === "All statuses" || row.item.status === status) &&
        (priority === "All priorities" || row.item.priority === priority),
    )
    .sort((a, b) =>
      sort === "risk"
        ? b.item.riskScore - a.item.riskScore
        : sort === "amount"
          ? (b.complaint?.amount || 0) - (a.complaint?.amount || 0)
          : new Date(b.item.updatedAt).getTime() -
            new Date(a.item.updatedAt).getTime(),
    );
  const visible = rows.slice(page * pageSize, (page + 1) * pageSize);
  const exportCsv = () => {
    const csv = [
      "case_id,complaint_reference,category,amount,region,status,assignee,accounts,transactions,prediction_status,intervention_status",
      ...rows.map((row) =>
        [
          row.item.reference,
          row.complaint?.reference || "",
          row.complaint?.category || "",
          row.complaint?.amount || "",
          row.complaint?.location || "",
          row.item.status,
          row.item.assignee,
          row.item.accountIds.length,
          row.tx.length,
          row.prediction ? "Active" : "None",
          row.interventions.map((i) => i.status).join("|"),
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synthetic-case-view.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <Header title="Case management" eyebrow="OPERATIONS" />
      <div className="case-disclaimer">
        <span className="live-dot" /> Synthetic case records · export contains
        demo data only.
      </div>
      <div className="case-toolbar">
        <input
          placeholder="Search case, complaint, category, region…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPageNumber(0);
          }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>All statuses</option>
          {["Open", "In Review", "Escalated", "Monitoring", "Resolved"].map(
            (v) => (
              <option key={v}>{v}</option>
            ),
          )}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>All priorities</option>
          {["Critical", "High", "Medium", "Low"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="updated">Sort: updated</option>
          <option value="risk">Sort: risk</option>
          <option value="amount">Sort: amount</option>
        </select>
        <button className="button" onClick={exportCsv}>
          Export visible CSV
        </button>
      </div>
      <Section
        title={`${rows.length} cases`}
        action={`${Math.min(page * pageSize + 1, rows.length)}–${Math.min((page + 1) * pageSize, rows.length)} shown`}
      >
        <table>
          <thead>
            <tr>
              <th>Case / complaint</th>
              <th>Incident</th>
              <th>Amount at risk</th>
              <th>Status / priority</th>
              <th>Team</th>
              <th>Linked records</th>
              <th>Predictions / interventions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.item.id} onClick={() => openCase(row.item.id)}>
                <td>
                  <strong>
                    {row.item.reference} · {row.item.title}
                  </strong>
                  <small>
                    {row.complaint?.reference || "No complaint reference"} ·{" "}
                    {row.complaint?.createdAt
                      ? new Date(row.complaint.createdAt).toLocaleDateString()
                      : "Unknown date"}
                  </small>
                </td>
                <td>
                  <strong>{row.complaint?.category || "Unknown"}</strong>
                  <small>{row.complaint?.location || "Unknown region"}</small>
                </td>
                <td>
                  <strong>
                    {row.complaint ? money(row.complaint.amount) : "Unknown"}
                  </strong>
                  <small>
                    Estimated at risk:{" "}
                    {row.complaint
                      ? money(Math.round(row.complaint.amount * 0.8))
                      : "Not available"}
                  </small>
                </td>
                <td>
                  <Badge tone={row.item.status.toLowerCase().replace(" ", "-")}>
                    {row.item.status}
                  </Badge>
                  <PriorityBadge value={row.item.priority} />
                </td>
                <td>{row.item.assignee}</td>
                <td>
                  <small>
                    {row.item.accountIds.length} accounts · {row.tx.length}{" "}
                    transactions
                  </small>
                </td>
                <td>
                  <Badge tone={row.prediction ? "red" : "neutral"}>
                    {row.prediction ? "Prediction active" : "No prediction"}
                  </Badge>
                  <small>
                    {row.interventions.length} intervention record
                    {row.interventions.length === 1 ? "" : "s"}
                  </small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <Empty text="No cases match the current search and filters." />
        )}
        <div className="pagination">
          <button
            className="button small"
            disabled={page === 0}
            onClick={() => setPageNumber(page - 1)}
          >
            ← Previous
          </button>
          <span>
            Page {page + 1} of {Math.max(1, Math.ceil(rows.length / pageSize))}
          </span>
          <button
            className="button small"
            disabled={(page + 1) * pageSize >= rows.length}
            onClick={() => setPageNumber(page + 1)}
          >
            Next →
          </button>
        </div>
      </Section>
    </>
  );
}

function Predictive({
  data,
  setPage,
  openCase,
}: {
  data: Dataset;
  setPage: (p: string) => void;
  openCase: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState("All cases");
  const [region, setRegion] = useState("All regions");
  const [windowFilter, setWindowFilter] = useState("All windows");
  const [category, setCategory] = useState("All categories");
  const [riskBand, setRiskBand] = useState("All risk");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [sortBy, setSortBy] = useState("risk");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<Record<string, string>>({});
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [workflowCase, setWorkflowCase] = useState(data.cases[0]?.id || "");
  const [horizon, setHorizon] = useState("Next 0–4 hours");
  const [scope, setScope] = useState("Linked accounts");
  const [running, setRunning] = useState(false);
  const [demoRuns, setDemoRuns] = useState<
    Array<{
      id: string;
      caseId: string;
      createdAt: string;
      confidence: number;
      window: string;
      candidateIds: string[];
    }>
  >([]);
  const casesById = (id: string) => data.cases.find((item) => item.id === id);
  const candidateRows = data.candidates.map((candidate) => {
    const prediction = data.predictions.find(
      (item) => item.id === candidate.predictionId,
    );
    const linkedCase = prediction ? casesById(prediction.caseId) : undefined;
    const complaint = linkedCase
      ? data.complaints.find((item) => item.caseId === linkedCase.id)
      : undefined;
    const transactions = linkedCase
      ? data.transactions.filter((item) => item.caseId === linkedCase.id)
      : [];
    const accounts = linkedCase
      ? data.accounts.filter((item) => linkedCase.accountIds.includes(item.id))
      : [];
    const exposure = transactions.reduce((sum, item) => sum + item.amount, 0);
    const state =
      complaint?.location.split(",")[1]?.trim() || "Synthetic region";
    const factors = [
      transactions.length
        ? `${transactions.length} linked transaction event${transactions.length > 1 ? "s" : ""} observed`
        : "",
      accounts.length
        ? `${accounts.length} linked account${accounts.length > 1 ? "s" : ""} in the case trail`
        : "",
      prediction?.rationale || "",
      complaint?.location && candidate.location
        ? `Candidate and complaint are in the ${complaint.location.split(",")[0]} activity region`
        : "",
    ].filter(Boolean);
    const status =
      reviewState[candidate.id] ||
      (linkedCase?.status === "Resolved"
        ? "Closed case"
        : prediction
          ? "Requires review"
          : "Insufficient data");
    return {
      candidate,
      prediction,
      linkedCase,
      complaint,
      transactions,
      accounts,
      exposure,
      state,
      factors,
      status,
      rank: data.candidates.indexOf(candidate) + 1,
    };
  });
  const windows = Array.from(
    new Set(data.predictions.map((item) => item.window)),
  );
  const regions = Array.from(
    new Set(candidateRows.map((item) => item.state)),
  ).sort();
  const categories = Array.from(
    new Set(data.complaints.map((item) => item.category)),
  ).sort();
  const filtered = candidateRows
    .filter((item) => {
      const searchMatch =
        !search ||
        `${item.candidate.location} ${item.candidate.id} ${item.linkedCase?.reference || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const bandMatch =
        riskBand === "All risk" ||
        (riskBand === "Critical"
          ? item.candidate.riskScore >= 85
          : riskBand === "Elevated"
            ? item.candidate.riskScore >= 70 && item.candidate.riskScore < 85
            : item.candidate.riskScore < 70);
      return (
        searchMatch &&
        (caseFilter === "All cases" || item.linkedCase?.id === caseFilter) &&
        (region === "All regions" || item.state === region) &&
        (windowFilter === "All windows" ||
          item.prediction?.window === windowFilter) &&
        (category === "All categories" ||
          item.complaint?.category === category) &&
        bandMatch &&
        (statusFilter === "All statuses" || item.status === statusFilter)
      );
    })
    .sort((a, b) =>
      sortBy === "exposure"
        ? b.exposure - a.exposure
        : sortBy === "window"
          ? (a.prediction?.window || "").localeCompare(
              b.prediction?.window || "",
            )
          : sortBy === "rank"
            ? a.rank - b.rank
            : b.candidate.riskScore - a.candidate.riskScore,
    );
  const selected =
    filtered.find((item) => item.candidate.id === selectedId) ||
    candidateRows.find((item) => item.candidate.id === selectedId);
  const activePredictions = new Set(
    data.predictions.map((item) => item.caseId),
  );
  const recentCutoff =
    Math.max(
      ...data.predictions.map((item) => new Date(item.updatedAt).getTime()),
      0,
    ) - 86400000;
  const filteredPredictionCount = new Set(
    filtered.map((item) => item.prediction?.id).filter(Boolean),
  ).size;
  const workflow = data.cases.find((item) => item.id === workflowCase);
  const workflowComplaint = workflow
    ? data.complaints.find((item) => item.caseId === workflow.id)
    : undefined;
  const workflowTxns = workflow
    ? data.transactions.filter((item) => item.caseId === workflow.id)
    : [];
  const workflowAccounts = workflow
    ? data.accounts.filter((item) => workflow.accountIds.includes(item.id))
    : [];
  const workflowCandidates = workflow
    ? candidateRows
        .filter((item) => item.linkedCase?.id === workflow.id)
        .sort((a, b) => b.candidate.riskScore - a.candidate.riskScore)
    : [];
  const workflowMissing = !workflow
    ? ["Select a case"]
    : [
        workflowTxns.length ? "" : "No linked transactions",
        workflowAccounts.length ? "" : "No linked accounts",
        workflowCandidates.length ? "" : "No candidate locations",
      ].filter(Boolean);
  const runDemo = () => {
    if (!workflow || workflowMissing.length) return;
    setRunning(true);
    window.setTimeout(() => {
      const run = {
        id: `demo-${Date.now()}`,
        caseId: workflow.id,
        createdAt: new Date().toISOString(),
        confidence: Math.max(
          42,
          Math.min(
            96,
            (workflow.riskScore || 50) - workflowMissing.length * 10,
          ),
        ),
        window: horizon,
        candidateIds: workflowCandidates.map((item) => item.candidate.id),
      };
      setDemoRuns((current) => [run, ...current]);
      setRunning(false);
    }, 450);
  };
  const resetFilters = () => {
    setSearch("");
    setCaseFilter("All cases");
    setRegion("All regions");
    setWindowFilter("All windows");
    setCategory("All categories");
    setRiskBand("All risk");
    setStatusFilter("All statuses");
  };
  return (
    <>
      <Header
        title="Predictive cash-out intelligence"
        eyebrow="PREDICTIVE ANALYTICS"
      />
      <div className="demo-banner">
        <span className="live-dot" /> Simulated prediction environment · No
        machine-learning model or live banking feed is connected.
      </div>
      <div className="prediction-filters">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search candidate, prediction, or case…"
        />
        <select
          value={caseFilter}
          onChange={(event) => setCaseFilter(event.target.value)}
        >
          <option>All cases</option>
          {data.cases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.reference}
            </option>
          ))}
        </select>
        <select
          value={region}
          onChange={(event) => setRegion(event.target.value)}
        >
          <option>All regions</option>
          {regions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={windowFilter}
          onChange={(event) => setWindowFilter(event.target.value)}
        >
          <option>All windows</option>
          {windows.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option>All categories</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={riskBand}
          onChange={(event) => setRiskBand(event.target.value)}
        >
          <option>All risk</option>
          <option>Critical</option>
          <option>Elevated</option>
          <option>Watch</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>All statuses</option>
          <option>Requires review</option>
          <option>Reviewed</option>
          <option>More information needed</option>
          <option>Closed case</option>
        </select>
        <button className="button" onClick={resetFilters}>
          Reset filters
        </button>
      </div>
      <div className="metrics">
        <Metric
          label="Cases with predictions"
          value={String(activePredictions.size)}
          note="Linked synthetic prediction records"
          accent="blue"
        />
        <Metric
          label="Candidate locations"
          value={String(filtered.length)}
          note="After active filters"
          accent="purple"
        />
        <Metric
          label="Predictions in selected window"
          value={String(
            new Set(
              filtered
                .filter(
                  (item) =>
                    windowFilter === "All windows" ||
                    item.prediction?.window === windowFilter,
                )
                .map((item) => item.prediction?.id)
                .filter(Boolean),
            ).size,
          )}
          note={
            windowFilter === "All windows"
              ? "All stored prediction windows"
              : windowFilter
          }
          accent="orange"
        />
        <Metric
          label="High-priority predictions"
          value={String(
            filtered.filter((item) => item.candidate.riskScore >= 85).length,
          )}
          note="Risk score ≥ 85"
          accent="red"
        />
        <Metric
          label="Predictions requiring review"
          value={String(
            filtered.filter((item) => item.status === "Requires review").length,
          )}
          note="No investigator decision recorded"
          accent="red"
        />
        <Metric
          label="Recently updated"
          value={String(
            filtered.filter(
              (item) =>
                item.prediction &&
                new Date(item.prediction.updatedAt).getTime() >= recentCutoff,
            ).length,
          )}
          note="Within demo refresh interval"
          accent="green"
        />
      </div>
      <div className="prediction-workflow-bar">
        <div>
          <strong>Run a demo analysis</strong>
          <small>
            Use an existing synthetic case to produce a deterministic result.
          </small>
        </div>
        <button
          className="button primary"
          onClick={() => setWorkflowOpen(true)}
        >
          ＋ Start prediction workflow
        </button>
      </div>
      <div className="grid two">
        <Section
          title={`Ranked candidate locations · ${filteredPredictionCount} predictions`}
          action="Open GIS heatmap"
          onAction={() => setPage("GIS heatmap")}
        >
          <div className="prediction-sort">
            <span>Sorted by</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="risk">Risk score</option>
              <option value="exposure">Estimated exposure</option>
              <option value="window">Time window</option>
              <option value="rank">Candidate rank</option>
            </select>
          </div>
          {filtered.length ? (
            <div className="prediction-results">
              {filtered.map((item, index) => (
                <button
                  className={`prediction-row ${selectedId === item.candidate.id ? "selected" : ""}`}
                  key={item.candidate.id}
                  onClick={() => setSelectedId(item.candidate.id)}
                >
                  <span className="rank">
                    #{sortBy === "rank" ? item.rank : index + 1}
                  </span>
                  <div className="prediction-row-main">
                    <strong>{item.candidate.location}</strong>
                    <small>
                      {item.candidate.id} · {item.candidate.type} ·{" "}
                      {item.linkedCase?.reference || "No linked case"}
                    </small>
                    <div className="prediction-row-meta">
                      <Badge
                        tone={
                          item.candidate.riskScore >= 85
                            ? "red"
                            : item.candidate.riskScore >= 70
                              ? "orange"
                              : "green"
                        }
                      >
                        {item.candidate.riskScore}% risk
                      </Badge>
                      <span>
                        {item.prediction?.confidence || 0}% confidence
                      </span>
                      <span>{item.prediction?.window || "No window"}</span>
                      <span>
                        {money(item.exposure || item.candidate.amount)}
                      </span>
                    </div>
                  </div>
                  <Badge
                    tone={
                      item.status === "Requires review"
                        ? "orange"
                        : item.status === "Reviewed"
                          ? "green"
                          : "red"
                    }
                  >
                    {item.status}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <Empty text="No prediction candidates match these filters. Try resetting filters or select another case." />
          )}
        </Section>
        <Section
          title={
            selected
              ? `Prediction explanation · ${selected.candidate.id}`
              : "Select a candidate to inspect"
          }
        >
          {selected ? (
            <div className="prediction-detail">
              <div className="detail-title">
                <div>
                  <strong>{selected.candidate.location}</strong>
                  <small>
                    {selected.candidate.id} · {selected.candidate.type} ·
                    simulated result
                  </small>
                </div>
                <Badge
                  tone={
                    selected.candidate.riskScore >= 85
                      ? "red"
                      : selected.candidate.riskScore >= 70
                        ? "orange"
                        : "green"
                  }
                >
                  {selected.candidate.riskScore}% risk
                </Badge>
              </div>
              <div className="detail-grid">
                <div>
                  <small>Confidence</small>
                  <strong>{selected.prediction?.confidence || "—"}%</strong>
                </div>
                <div>
                  <small>Predicted window</small>
                  <strong>{selected.prediction?.window || "—"}</strong>
                </div>
                <div>
                  <small>Estimated exposure</small>
                  <strong>
                    {money(selected.exposure || selected.candidate.amount)}
                  </strong>
                </div>
                <div>
                  <small>Current status</small>
                  <strong>{selected.status}</strong>
                </div>
              </div>
              <div className="factor-box">
                <strong>Contributing factors present in demo data</strong>
                {selected.factors.length ? (
                  <ul>
                    {selected.factors.map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Insufficient linked data to explain this candidate.</p>
                )}
              </div>
              <div className="detail-lines">
                <span>
                  <b>Prediction:</b> {selected.prediction?.id || "Unavailable"}
                </span>
                <span>
                  <b>Case:</b> {selected.linkedCase?.reference || "Unlinked"}
                </span>
                <span>
                  <b>Created / refreshed:</b>{" "}
                  {selected.prediction
                    ? `${new Date(selected.prediction.createdAt).toLocaleString()} / ${new Date(selected.prediction.updatedAt).toLocaleString()}`
                    : "—"}
                </span>
                <span>
                  <b>Transaction refs:</b>{" "}
                  {selected.transactions.map((item) => item.id).join(", ") ||
                    "None available"}
                </span>
              </div>
              <div className="detail-actions">
                <button
                  className="button primary"
                  onClick={() => setPage("GIS heatmap")}
                >
                  Open on GIS map
                </button>
                <button
                  className="button"
                  onClick={() =>
                    selected.linkedCase && openCase(selected.linkedCase.id)
                  }
                >
                  Open case
                </button>
                <button
                  className="button"
                  onClick={() => setPage("Interventions")}
                >
                  Send to intervention review
                </button>
                <button
                  className="button"
                  onClick={() =>
                    setReviewState((current) => ({
                      ...current,
                      [selected.candidate.id]: "Reviewed",
                    }))
                  }
                >
                  Mark reviewed
                </button>
                <button
                  className="button"
                  onClick={() =>
                    setReviewState((current) => ({
                      ...current,
                      [selected.candidate.id]: "More information needed",
                    }))
                  }
                >
                  Need more information
                </button>
              </div>
            </div>
          ) : (
            <Empty text="Select a ranked location to inspect the stored score, confidence, factors, timestamps, and linked records." />
          )}
        </Section>
      </div>
      <Section
        title="Prediction history"
        action={`${data.predictions.length + demoRuns.length} versions`}
      >
        <div className="history-list">
          {[
            ...data.predictions.map((item) => ({
              id: item.id,
              caseId: item.caseId,
              createdAt: item.createdAt,
              confidence: item.confidence,
              window: item.window,
              candidateIds: item.candidateIds,
              source: "Stored seed prediction",
            })),
            ...demoRuns.map((item) => ({ ...item, source: "Local demo run" })),
          ]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .map((item) => (
              <div className="history-row" key={item.id}>
                <div>
                  <strong>{item.id}</strong>
                  <small>
                    {casesById(item.caseId)?.reference || item.caseId} ·{" "}
                    {item.source} · {new Date(item.createdAt).toLocaleString()}
                  </small>
                </div>
                <span>{item.candidateIds.length} candidates</span>
                <span>{item.window}</span>
                <Badge tone={item.confidence >= 85 ? "red" : "orange"}>
                  {item.confidence}% confidence
                </Badge>
              </div>
            ))}
        </div>
      </Section>
      {workflowOpen && (
        <div className="modal-backdrop">
          <div className="workflow-modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">SIMULATED WORKFLOW</div>
                <h2>Create demo prediction</h2>
              </div>
              <button
                className="text-button"
                onClick={() => setWorkflowOpen(false)}
              >
                Close ×
              </button>
            </div>
            <label className="workflow-label">
              Existing synthetic case
              <select
                value={workflowCase}
                onChange={(event) => setWorkflowCase(event.target.value)}
              >
                {data.cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.reference} · {item.title}
                  </option>
                ))}
              </select>
            </label>
            {workflow && (
              <div className="workflow-summary">
                <strong>{workflow.title}</strong>
                <div>
                  <Badge tone={workflow.priority.toLowerCase()}>
                    {workflow.priority}
                  </Badge>
                  <span>{workflow.status}</span>
                  <span>Risk {workflow.riskScore}/100</span>
                </div>
                <p>
                  {workflowComplaint
                    ? `${workflowComplaint.reference} · ${workflowComplaint.category} · ${money(workflowComplaint.amount)} · ${workflowComplaint.location}`
                    : "No complaint summary is linked to this case."}
                </p>
              </div>
            )}
            <div className="workflow-columns">
              <div>
                <h3>Observed evidence</h3>
                <ul className="evidence-list">
                  <li>
                    {workflowTxns.length} linked transaction event
                    {workflowTxns.length !== 1 ? "s" : ""}
                  </li>
                  <li>
                    {workflowAccounts.length} linked account
                    {workflowAccounts.length !== 1 ? "s" : ""}
                  </li>
                  <li>
                    {workflowCandidates.length} nearby candidate location
                    {workflowCandidates.length !== 1 ? "s" : ""}
                  </li>
                  <li>
                    {workflowTxns.length
                      ? `Latest event: ${new Date(workflowTxns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt).toLocaleString()}`
                      : "Money trail is unavailable"}
                  </li>
                </ul>
                {workflowMissing.length > 0 && (
                  <div className="insufficient">
                    <strong>Insufficient synthetic data</strong>
                    <span>{workflowMissing.join(" · ")}</span>
                    <small>
                      The demo will not invent certainty. Confidence would be
                      lowered for this case.
                    </small>
                  </div>
                )}
              </div>
              <div>
                <label className="workflow-label">
                  Analysis time horizon
                  <select
                    value={horizon}
                    onChange={(event) => setHorizon(event.target.value)}
                  >
                    <option>Next 0–4 hours</option>
                    <option>Next 4–12 hours</option>
                    <option>Next 12–24 hours</option>
                  </select>
                </label>
                <label className="workflow-label">
                  Analysis scope
                  <select
                    value={scope}
                    onChange={(event) => setScope(event.target.value)}
                  >
                    <option>Linked accounts</option>
                    <option>Nearby ATM/branch candidates</option>
                    <option>Case geography</option>
                  </select>
                </label>
                <small className="scope-note">
                  Scope: {scope}. Results remain deterministic and use only
                  stored demo records.
                </small>
              </div>
            </div>
            <div className="workflow-footer">
              <button className="button" onClick={() => setWorkflowOpen(false)}>
                Cancel
              </button>
              <button
                className="button primary"
                disabled={running || workflowMissing.length > 0}
                onClick={runDemo}
              >
                {running
                  ? "Running simulated analysis…"
                  : "Run simulated prediction"}
              </button>
            </div>
            {demoRuns.length > 0 && (
              <div className="run-success">
                ✓ Demo run complete. {demoRuns[0].candidateIds.length} ranked
                candidate locations added to local prediction history.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MapViewport({
  points,
  selected,
}: {
  points: Array<[number, number]>;
  selected?: [number, number];
}) {
  const map = useMap();
  useEffect(() => {
    if (selected)
      map.setView(selected, Math.max(map.getZoom(), 11), { animate: true });
    else if (points.length)
      map.fitBounds(points, { padding: [35, 35], maxZoom: 7 });
  }, [map, points, selected]);
  return null;
}

function Heatmap({
  data,
  setPage,
  openCase,
}: {
  data: Dataset;
  setPage: (page: string) => void;
  openCase: (id: string) => void;
}) {
  const [range, setRange] = useState("Current period");
  const [region, setRegion] = useState("All regions");
  const [category, setCategory] = useState("All categories");
  const [caseId, setCaseId] = useState("All cases");
  const [risk, setRisk] = useState("All risk");
  const [window, setWindow] = useState("All windows");
  const [route, setRoute] = useState("All routes");
  const [caseStatus, setCaseStatus] = useState("All statuses");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false);
  const [layers, setLayers] = useState({
    predicted: true,
    atms: true,
    branches: true,
    historical: true,
    cases: true,
    warnings: true,
    outcomes: false,
  });
  const candidates = data.candidates.map((candidate) => {
    const prediction = data.predictions.find(
      (item) => item.id === candidate.predictionId,
    );
    const linkedCase = data.cases.find(
      (item) => item.id === prediction?.caseId,
    );
    const complaint = data.complaints.find(
      (item) => item.caseId === linkedCase?.id,
    );
    const state =
      complaint?.location.split(",")[1]?.trim() || "Synthetic region";
    const city = complaint?.location.split(",")[0] || candidate.location;
    return { candidate, prediction, linkedCase, complaint, state, city };
  });
  const regionOptions = Array.from(
    new Set(candidates.map((item) => item.state)),
  ).sort();
  const categoryOptions = Array.from(
    new Set(data.complaints.map((item) => item.category)),
  ).sort();
  const filtered = candidates.filter((item) => {
    const candidate = item.candidate;
    return (
      (region === "All regions" || item.state === region) &&
      (category === "All categories" ||
        item.complaint?.category === category) &&
      (caseId === "All cases" || item.linkedCase?.reference === caseId) &&
      (risk === "All risk" ||
        (risk === "Critical"
          ? candidate.riskScore >= 85
          : risk === "Elevated"
            ? candidate.riskScore >= 70 && candidate.riskScore < 85
            : candidate.riskScore < 70)) &&
      (window === "All windows" || item.prediction?.window === window) &&
      (route === "All routes" || candidate.type === route) &&
      (caseStatus === "All statuses" ||
        item.linkedCase?.status === caseStatus) &&
      (range === "Current period" ||
        (range === "Next 0–4 hours"
          ? item.prediction?.window === "Next 0–4 hours"
          : range === "Next 4–12 hours"
            ? item.prediction?.window === "Next 4–12 hours"
            : true))
    );
  });
  const selected =
    filtered.find((item) => item.candidate.id === selectedId) ||
    (selectedId
      ? candidates.find((item) => item.candidate.id === selectedId)
      : undefined);
  const points = filtered.map(
    (item) =>
      [item.candidate.latitude, item.candidate.longitude] as [number, number],
  );
  const toggle = (key: keyof typeof layers) =>
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  const reset = () => {
    setRange("Current period");
    setRegion("All regions");
    setCategory("All categories");
    setCaseId("All cases");
    setRisk("All risk");
    setWindow("All windows");
    setRoute("All routes");
    setCaseStatus("All statuses");
    setSelectedId(null);
  };
  const linkedAlerts = selected?.linkedCase
    ? data.alerts.filter((item) => item.caseId === selected.linkedCase?.id)
    : [];
  const linkedIntervention = selected?.linkedCase
    ? data.interventions.find(
        (item) =>
          item.caseId === selected.linkedCase?.id &&
          (!item.candidateId || item.candidateId === selected.candidate.id),
      )
    : undefined;
  const linkedAccounts = selected?.linkedCase
    ? data.accounts.filter((item) =>
        selected.linkedCase?.accountIds.includes(item.id),
      )
    : [];
  const estimatedExposure = selected?.linkedCase
    ? data.transactions
        .filter((item) => item.caseId === selected.linkedCase?.id)
        .reduce((sum, item) => sum + item.amount, 0)
    : 0;
  const clearAndFit = () => {
    setSelectedId(null);
  };
  return (
    <>
      <Header title="GIS risk heatmap" eyebrow="GEOSPATIAL INTELLIGENCE" />
      <div className="demo-banner">
        <span className="live-dot" /> Synthetic coordinates and risk overlays ·
        This map is a frontend demonstration, not a live operational feed.
      </div>
      <div className="gis-toolbar">
        <div className="gis-filters">
          {[
            [
              "Time",
              range,
              [
                "Current period",
                "Next 0–4 hours",
                "Next 4–12 hours",
                "Next 12–24 hours",
              ],
            ],
            ["Region", region, ["All regions", ...regionOptions]],
            ["Crime", category, ["All categories", ...categoryOptions]],
            [
              "Case",
              caseId,
              ["All cases", ...data.cases.map((item) => item.reference)],
            ],
            ["Risk", risk, ["All risk", "Critical", "Elevated", "Watch"]],
            [
              "Window",
              window,
              [
                "All windows",
                ...Array.from(
                  new Set(data.predictions.map((item) => item.window)),
                ),
              ],
            ],
            ["Route", route, ["All routes", "ATM", "Branch", "POS"]],
            [
              "Status",
              caseStatus,
              [
                "All statuses",
                "Open",
                "In Review",
                "Escalated",
                "Monitoring",
                "Resolved",
              ],
            ],
          ].map(([label, value, options]) => (
            <label key={label as string}>
              {label}
              <select
                value={value as string}
                onChange={(event) => {
                  const val = event.target.value;
                  if (label === "Time") setRange(val);
                  if (label === "Region") setRegion(val);
                  if (label === "Crime") setCategory(val);
                  if (label === "Case") setCaseId(val);
                  if (label === "Risk") setRisk(val);
                  if (label === "Window") setWindow(val);
                  if (label === "Route") setRoute(val);
                  if (label === "Status") setCaseStatus(val);
                }}
              >
                <>
                  {(options as string[]).map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </>
              </select>
            </label>
          ))}
        </div>
        <button className="button" onClick={reset}>
          Reset filters
        </button>
      </div>
      <div className="gis-summary">
        <Metric
          label="Candidate locations"
          value={String(filtered.length)}
          note="Filtered synthetic locations"
          accent="blue"
        />
        <Metric
          label="High-priority locations"
          value={String(
            filtered.filter((item) => item.candidate.riskScore >= 80).length,
          )}
          note="Risk score ≥ 80"
          accent="red"
        />
        <Metric
          label="Near-term windows"
          value={String(
            filtered.filter(
              (item) => item.prediction?.window === "Next 0–4 hours",
            ).length,
          )}
          note="Next 0–4 simulated hours"
          accent="orange"
        />
        <Metric
          label="Multi-case locations"
          value={String(
            filtered.filter(
              (item) =>
                item.linkedCase?.accountIds.length &&
                new Set(
                  data.transactions
                    .filter((tx) => tx.location.includes(item.city))
                    .map((tx) => tx.caseId),
                ).size > 1,
            ).length,
          )}
          note="Linked to multiple cases"
          accent="purple"
        />
      </div>
      <div className="gis-workspace">
        <div className="gis-map-panel">
          <MapContainer
            center={[16.5, 76]}
            zoom={5}
            scrollWheelZoom
            style={{ height: "100%", minHeight: 610 }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{ tileerror: () => setTileError(true) }}
            />
            <MapViewport
              points={points}
              selected={
                selected
                  ? [selected.candidate.latitude, selected.candidate.longitude]
                  : undefined
              }
            />
            {layers.predicted &&
              filtered.map((item) => (
                <Circle
                  key={`risk-${item.candidate.id}`}
                  center={[item.candidate.latitude, item.candidate.longitude]}
                  radius={item.candidate.riskScore * 35}
                  pathOptions={{
                    color:
                      item.candidate.riskScore >= 85
                        ? "#ff667b"
                        : item.candidate.riskScore >= 70
                          ? "#f5b65f"
                          : "#55bce8",
                    fillColor:
                      item.candidate.riskScore >= 85
                        ? "#ff667b"
                        : item.candidate.riskScore >= 70
                          ? "#f5b65f"
                          : "#55bce8",
                    fillOpacity: 0.18,
                    weight: 1,
                  }}
                />
              ))}
            {layers.predicted &&
              filtered.map((item) => (
                <CircleMarker
                  key={`predicted-${item.candidate.id}`}
                  center={[item.candidate.latitude, item.candidate.longitude]}
                  radius={selectedId === item.candidate.id ? 10 : 7}
                  eventHandlers={{
                    click: () => setSelectedId(item.candidate.id),
                  }}
                  pathOptions={{
                    color: "#ff8492",
                    fillColor: "#ff8492",
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <strong>Predicted · {item.candidate.location}</strong>
                    <br />
                    {item.candidate.riskScore}% simulated risk ·{" "}
                    {item.prediction?.window}
                    <br />
                    <button
                      className="text-button"
                      onClick={() => setSelectedId(item.candidate.id)}
                    >
                      Open detail →
                    </button>
                  </Popup>
                </CircleMarker>
              ))}
            {layers.atms &&
              filtered
                .filter((item) => item.candidate.type === "ATM")
                .map((item) => (
                  <CircleMarker
                    key={`atm-${item.candidate.id}`}
                    center={[item.candidate.latitude, item.candidate.longitude]}
                    radius={6}
                    eventHandlers={{
                      click: () => setSelectedId(item.candidate.id),
                    }}
                    pathOptions={{
                      color: "#59d2b1",
                      fillColor: "#59d2b1",
                      fillOpacity: 0.85,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <strong>ATM · {item.candidate.location}</strong>
                      <br />
                      Synthetic facility location
                    </Popup>
                  </CircleMarker>
                ))}
            {layers.branches &&
              filtered
                .filter((item) => item.candidate.type === "Branch")
                .map((item) => (
                  <CircleMarker
                    key={`branch-${item.candidate.id}`}
                    center={[item.candidate.latitude, item.candidate.longitude]}
                    radius={7}
                    eventHandlers={{
                      click: () => setSelectedId(item.candidate.id),
                    }}
                    pathOptions={{
                      color: "#8eb2ff",
                      fillColor: "#8eb2ff",
                      fillOpacity: 0.85,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <strong>Branch · {item.candidate.location}</strong>
                      <br />
                      Synthetic facility location
                    </Popup>
                  </CircleMarker>
                ))}
            {layers.historical &&
              filtered
                .filter((item) => item.complaint)
                .map((item) => (
                  <CircleMarker
                    key={`history-${item.candidate.id}`}
                    center={[
                      item.candidate.latitude + 0.018,
                      item.candidate.longitude - 0.018,
                    ]}
                    radius={6}
                    eventHandlers={{
                      click: () => setSelectedId(item.candidate.id),
                    }}
                    pathOptions={{
                      color: "#d18cf2",
                      fillColor: "#d18cf2",
                      fillOpacity: 0.7,
                      weight: 2,
                      dashArray: "3 3",
                    }}
                  >
                    <Popup>
                      <strong>Historical complaint concentration</strong>
                      <br />
                      {item.complaint?.reference} · {item.complaint?.category}
                    </Popup>
                  </CircleMarker>
                ))}
            {layers.cases &&
              filtered
                .filter((item) => item.linkedCase)
                .map((item) => (
                  <CircleMarker
                    key={`case-${item.candidate.id}`}
                    center={[
                      item.candidate.latitude - 0.02,
                      item.candidate.longitude + 0.02,
                    ]}
                    radius={5}
                    eventHandlers={{
                      click: () => setSelectedId(item.candidate.id),
                    }}
                    pathOptions={{
                      color: "#f7d36d",
                      fillColor: "#f7d36d",
                      fillOpacity: 0.75,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <strong>Active case location</strong>
                      <br />
                      {item.linkedCase?.reference} · privacy-preserving
                      synthetic point
                    </Popup>
                  </CircleMarker>
                ))}
            {layers.warnings &&
              filtered
                .filter((item) => item.candidate.riskScore >= 70)
                .map((item) => (
                  <Circle
                    key={`warning-${item.candidate.id}`}
                    center={[item.candidate.latitude, item.candidate.longitude]}
                    radius={item.candidate.riskScore * 16}
                    pathOptions={{
                      color: "#b07cff",
                      fillColor: "#b07cff",
                      fillOpacity: 0.08,
                      dashArray: "6 5",
                      weight: 2,
                    }}
                  />
                ))}
            {layers.outcomes &&
              filtered
                .filter((item) =>
                  data.interventions.some(
                    (intervention) =>
                      intervention.candidateId === item.candidate.id &&
                      intervention.status === "Completed",
                  ),
                )
                .map((item) => (
                  <CircleMarker
                    key={`outcome-${item.candidate.id}`}
                    center={[
                      item.candidate.latitude + 0.03,
                      item.candidate.longitude + 0.03,
                    ]}
                    radius={7}
                    eventHandlers={{
                      click: () => setSelectedId(item.candidate.id),
                    }}
                    pathOptions={{
                      color: "#4dd3a9",
                      fillColor: "#4dd3a9",
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <strong>Recorded intervention outcome</strong>
                      <br />
                      Synthetic completed response
                    </Popup>
                  </CircleMarker>
                ))}
          </MapContainer>
          {tileError && (
            <div className="map-tile-fallback">
              Map tiles could not be loaded. Synthetic coordinates and map
              overlays remain available.
            </div>
          )}
          <div className="map-layer-legend">
            <strong>Layer legend</strong>
            <label>
              <input
                type="checkbox"
                checked={layers.predicted}
                onChange={() => toggle("predicted")}
              />
              <i className="legend predicted" /> Predicted cash-out risk
            </label>
            <label>
              <input
                type="checkbox"
                checked={layers.atms}
                onChange={() => toggle("atms")}
              />
              <i className="legend atm" /> ATM locations
            </label>
            <label>
              <input
                type="checkbox"
                checked={layers.branches}
                onChange={() => toggle("branches")}
              />
              <i className="legend branch" /> Bank branches
            </label>
            <label>
              <input
                type="checkbox"
                checked={layers.historical}
                onChange={() => toggle("historical")}
              />
              <i className="legend historical" /> Historical complaints
            </label>
            <label>
              <input
                type="checkbox"
                checked={layers.cases}
                onChange={() => toggle("cases")}
              />
              <i className="legend case" /> Active cases
            </label>
            <label>
              <input
                type="checkbox"
                checked={layers.warnings}
                onChange={() => toggle("warnings")}
              />
              <i className="legend warning" /> Early-warning zones
            </label>
            <label>
              <input
                type="checkbox"
                checked={layers.outcomes}
                onChange={() => toggle("outcomes")}
              />
              <i className="legend outcome" /> Recorded outcomes
            </label>
          </div>
        </div>
        <div className="gis-side">
          <Section title="Time-window playback">
            <div className="playback">
              <strong>{range}</strong>
              <input
                type="range"
                min="0"
                max="3"
                value={[
                  "Current period",
                  "Next 0–4 hours",
                  "Next 4–12 hours",
                  "Next 12–24 hours",
                ].indexOf(range)}
                onChange={(event) =>
                  setRange(
                    [
                      "Current period",
                      "Next 0–4 hours",
                      "Next 4–12 hours",
                      "Next 12–24 hours",
                    ][Number(event.target.value)],
                  )
                }
              />
              <div>
                <button
                  className="button small"
                  onClick={() => setRange("Current period")}
                >
                  Current
                </button>
                <button
                  className="button small"
                  onClick={() => setRange("Next 0–4 hours")}
                >
                  0–4h
                </button>
                <button
                  className="button small"
                  onClick={() => setRange("Next 4–12 hours")}
                >
                  4–12h
                </button>
                <button
                  className="button small"
                  onClick={() => setRange("Next 12–24 hours")}
                >
                  12–24h
                </button>
              </div>
              <small>Frontend simulation · not a live forecast</small>
            </div>
          </Section>
          <Section
            title={selected ? "Selected location" : "Location list"}
            action={selected ? "Clear selection" : "Fit filtered results"}
            onAction={clearAndFit}
          >
            {selected ? (
              <div className="location-detail">
                <div className="detail-title">
                  <div>
                    <strong>{selected.candidate.location}</strong>
                    <small>
                      {selected.candidate.id} · {selected.candidate.type} ·{" "}
                      {selected.city}, {selected.state}
                    </small>
                  </div>
                  <Badge
                    tone={
                      selected.candidate.riskScore >= 85
                        ? "red"
                        : selected.candidate.riskScore >= 70
                          ? "orange"
                          : "green"
                    }
                  >
                    {selected.candidate.riskScore}% risk
                  </Badge>
                </div>
                <div className="detail-grid">
                  <div>
                    <small>Confidence</small>
                    <strong>{selected.prediction?.confidence || 0}%</strong>
                  </div>
                  <div>
                    <small>Predicted window</small>
                    <strong>{selected.prediction?.window || "None"}</strong>
                  </div>
                  <div>
                    <small>Linked cases</small>
                    <strong>{selected.linkedCase ? 1 : 0}</strong>
                  </div>
                  <div>
                    <small>Linked exposure</small>
                    <strong>
                      {estimatedExposure ? money(estimatedExposure) : "—"}
                    </strong>
                  </div>
                </div>
                <p className="detail-rationale">
                  <strong>Risk factors</strong>
                  <br />
                  {selected.prediction?.rationale || "No rationale recorded."}
                </p>
                <div className="detail-lines">
                  <span>
                    <b>Accounts:</b>{" "}
                    {linkedAccounts
                      .map((account) => account.number)
                      .join(", ") || "Role-restricted demo view"}
                  </span>
                  <span>
                    <b>Alerts:</b>{" "}
                    {linkedAlerts.length
                      ? linkedAlerts.map((alert) => alert.title).join("; ")
                      : "No active linked alerts"}
                  </span>
                  <span>
                    <b>Refresh:</b>{" "}
                    {new Date(
                      selected.prediction?.updatedAt ||
                        selected.candidate.updatedAt,
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="detail-actions">
                  <button
                    className="button primary"
                    onClick={() =>
                      selected.linkedCase && openCase(selected.linkedCase.id)
                    }
                  >
                    Open linked case
                  </button>
                  <button
                    className="button"
                    onClick={() => setPage("Predictive cash-out")}
                  >
                    Inspect prediction
                  </button>
                  <button
                    className="button"
                    onClick={() => setPage("Interventions")}
                  >
                    Review intervention
                    {linkedIntervention
                      ? ` · ${linkedIntervention.status}`
                      : ""}
                  </button>
                </div>
              </div>
            ) : (
              <div className="location-list">
                {filtered.length ? (
                  filtered.map((item) => (
                    <button
                      key={item.candidate.id}
                      className="location-row"
                      onClick={() => setSelectedId(item.candidate.id)}
                    >
                      <div>
                        <strong>{item.candidate.location}</strong>
                        <small>
                          {item.candidate.type} · {item.city}, {item.state} ·{" "}
                          {item.prediction?.window}
                        </small>
                      </div>
                      <Badge
                        tone={
                          item.candidate.riskScore >= 85
                            ? "red"
                            : item.candidate.riskScore >= 70
                              ? "orange"
                              : "green"
                        }
                      >
                        {item.candidate.riskScore}%
                      </Badge>
                    </button>
                  ))
                ) : (
                  <Empty text="No locations match the active filters." />
                )}
              </div>
            )}
          </Section>
          <Section title="Risk bands">
            <div className="risk-bands">
              <span>
                <i className="legend high" /> Critical · 85–100 — immediate
                response
              </span>
              <span>
                <i className="legend mid" /> Elevated · 70–84 — enhanced review
              </span>
              <span>
                <i className="legend low" /> Watch · below 70 — monitor
              </span>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

function Workspace({
  data,
  setData,
  caseId,
  setPage,
}: {
  data: Dataset;
  setData: (d: Dataset) => void;
  caseId: string;
  setPage: (page: string) => void;
}) {
  const c = data.cases.find((item) => item.id === caseId) || data.cases[0];
  const complaint = data.complaints.find((item) => item.caseId === c.id);
  const tx = data.transactions.filter((item) => item.caseId === c.id);
  const accounts = data.accounts.filter((item) =>
    c.accountIds.includes(item.id),
  );
  const predictions = data.predictions.filter((item) => item.caseId === c.id);
  const interventions = data.interventions.filter(
    (item) => item.caseId === c.id,
  );
  const notes = data.notes.filter((item) => item.caseId === c.id);
  const evidence = data.evidence.filter((item) => item.caseId === c.id);
  const [tab, setTab] = useState("Summary");
  const [note, setNote] = useState("");
  const [noteCategory, setNoteCategory] = useState("Investigation");
  const [editing, setEditing] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [status, setStatus] = useState(c.status);
  const [assignee, setAssignee] = useState(c.assignee);
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceType, setEvidenceType] = useState("Document");
  const [selectedTxn, setSelectedTxn] = useState<string | null>(null);
  const saveNote = () => {
    if (!note.trim()) return;
    const next = addAudit(
      addNote(data, {
        caseId: c.id,
        author: "A. Mehta",
        text: note,
        category: noteCategory,
      }),
      {
        actor: "A. Mehta",
        action: "Note added",
        target: c.id,
        detail: "Investigation note added to workspace.",
      },
    );
    setData(next);
    setNote("");
  };
  const editNote = (id: string) => {
    const item = notes.find((n) => n.id === id);
    if (item) {
      setEditing(id);
      setEditingText(item.text);
    }
  };
  const saveEdit = () => {
    if (!editing || !editingText.trim()) return;
    setData(
      addAudit(updateNote(data, editing, { text: editingText }), {
        actor: "A. Mehta",
        action: "Note edited",
        target: editing,
        detail: "Investigation note edited in workspace.",
      }),
    );
    setEditing(null);
    setEditingText("");
  };
  const changeCase = () => {
    if (status === c.status && assignee === c.assignee) return;
    if (
      !window.confirm(
        "Confirm this simulated case update? No external workflow will be triggered.",
      )
    )
      return;
    setData(
      addAudit(updateCase(data, c.id, { status: status as Status, assignee }), {
        actor: "A. Mehta",
        action: "Case updated",
        target: c.id,
        detail: `Status: ${status}; assignee: ${assignee}.`,
      }),
    );
  };
  const addSyntheticEvidence = () => {
    if (!evidenceName.trim()) return;
    setData(
      addAudit(
        addEvidence(data, {
          caseId: c.id,
          name: evidenceName,
          type: evidenceType,
          size: "Demo metadata",
          verified: false,
          description: "Synthetic evidence entry",
          sourceReference: "Demo source reference",
          provenance: "Entered by authorised demo user",
          integrityStatus: "Demo metadata only",
          reviewStatus: "Pending review",
          collectedAt: new Date().toISOString(),
        }),
        {
          actor: "A. Mehta",
          action: "Evidence added",
          target: c.id,
          detail: evidenceName,
        },
      ),
    );
    setEvidenceName("");
  };
  const dossier = () => {
    const text = `SYNTHETIC CASE DOSSIER\n${c.reference} · ${c.title}\nComplaint: ${complaint?.reference || "Unknown"} | ${complaint?.category || "Unknown"} | ${money(complaint?.amount || 0)} | ${complaint?.location || "Unknown"}\nStatus: ${c.status} | Assignee: ${c.assignee}\n\nTRANSACTIONS\n${tx.map((item) => `${item.id} ${item.createdAt} ${item.fromAccountId}->${item.toAccountId} ${money(item.amount)} ${item.channel}`).join("\n")}\n\nPREDICTIONS\n${predictions.map((item) => `${item.id} ${item.window} confidence ${item.confidence} ${item.rationale}`).join("\n")}\n\nINTERVENTIONS\n${interventions.map((item) => `${item.id} ${item.status} ${item.action}`).join("\n")}\n\nNOTES\n${notes.map((item) => `${item.id} ${item.author} ${item.text}`).join("\n")}\n\nEVIDENCE\n${evidence.map((item) => `${item.id} ${item.name} ${item.type} ${item.integrityStatus || "Demo metadata only"}`).join("\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.reference}-synthetic-dossier.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <Header title="Investigation workspace" eyebrow={c.reference} />
      <div className="demo-banner">
        <span className="live-dot" /> Connected synthetic case context · All
        linked records below refer to {c.reference}.
      </div>
      <div className="workspace-head">
        <div>
          <h2>{c.title}</h2>
          <div className="meta">
            <PriorityBadge value={c.priority} />
            <Badge tone={c.status.toLowerCase().replace(" ", "-")}>
              {c.status}
            </Badge>
            <span>Case ID: {c.id}</span>
          </div>
        </div>
        <div className="workspace-actions">
          <button className="button" onClick={() => setPage("Cases")}>
            ← Case list
          </button>
          <button className="button primary" onClick={dossier}>
            Export dossier
          </button>
        </div>
      </div>
      <div className="case-controls">
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            {["Open", "In Review", "Escalated", "Monitoring", "Resolved"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Assigned investigator/team
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            {data.users.map((u) => (
              <option key={u.id}>{u.name}</option>
            ))}
            {["Bengaluru FI Cell", "Hyderabad FI Cell", "Pune FI Cell"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        <button className="button" onClick={changeCase}>
          Save case changes
        </button>
        <small>
          Important status and assignment changes require confirmation and are
          audited.
        </small>
      </div>
      <div className="workspace-tabs">
        {[
          "Summary",
          "Transactions",
          "Entities",
          "Predictions",
          "Interventions",
          "Notes & Evidence",
        ].map((v) => (
          <button
            className={tab === v ? "active" : ""}
            key={v}
            onClick={() => setTab(v)}
          >
            {v}
          </button>
        ))}
      </div>
      {tab === "Summary" && (
        <div className="grid two workspace-grid">
          <Section title="Complaint summary">
            <div className="detail-grid">
              <div>
                <small>Complaint reference</small>
                <strong>{complaint?.reference || "Unknown"}</strong>
              </div>
              <div>
                <small>Reported loss</small>
                <strong>{money(complaint?.amount || 0)}</strong>
              </div>
              <div>
                <small>Crime category</small>
                <strong>{complaint?.category || "Unknown"}</strong>
              </div>
              <div>
                <small>Reporting region</small>
                <strong>{complaint?.location || "Unknown"}</strong>
              </div>
              <div>
                <small>Received</small>
                <strong>
                  {complaint?.createdAt
                    ? new Date(complaint.createdAt).toLocaleString()
                    : "Unknown"}
                </strong>
              </div>
              <div>
                <small>Last updated</small>
                <strong>{new Date(c.updatedAt).toLocaleString()}</strong>
              </div>
            </div>
            <div className="case-callout">
              <strong>Source references</strong>
              <span>
                {complaint?.reference || "No source reference"} · Synthetic
                complaint record · Observed status
              </span>
            </div>
          </Section>
          <Section title="Connected overview">
            <div className="detail-grid">
              <div>
                <small>Linked accounts</small>
                <strong>{accounts.length}</strong>
              </div>
              <div>
                <small>Transactions</small>
                <strong>{tx.length}</strong>
              </div>
              <div>
                <small>Predictions</small>
                <strong>{predictions.length}</strong>
              </div>
              <div>
                <small>Interventions</small>
                <strong>{interventions.length}</strong>
              </div>
              <div>
                <small>Notes</small>
                <strong>{notes.length}</strong>
              </div>
              <div>
                <small>Evidence</small>
                <strong>{evidence.length}</strong>
              </div>
            </div>
            <button
              className="button primary"
              onClick={() => setTab("Transactions")}
            >
              Inspect money trail →
            </button>
          </Section>
        </div>
      )}
      {tab === "Transactions" && (
        <Section title={`Transaction trail · ${tx.length} observed events`}>
          <div className="money-trail">
            {tx.length ? (
              tx
                .sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime(),
                )
                .map((item, index) => (
                  <button
                    className={`trail-event ${selectedTxn === item.id ? "selected" : ""}`}
                    key={item.id}
                    onClick={() => setSelectedTxn(item.id)}
                  >
                    <span className="trail-node">{index + 1}</span>
                    <div>
                      <strong>
                        {item.id} · {item.fromAccountId} → {item.toAccountId}
                      </strong>
                      <small>
                        {new Date(item.createdAt).toLocaleString()} ·{" "}
                        {item.channel} · {money(item.amount)} · Observed
                        transaction
                      </small>
                      <small>
                        {item.location} · linked case {item.caseId}
                      </small>
                    </div>
                  </button>
                ))
            ) : (
              <Empty text="No linked transactions. Known path has a data gap; no connections were invented." />
            )}
          </div>
          {selectedTxn && (
            <div className="case-callout">
              <strong>Selected transaction</strong>
              <span>
                {tx.find((item) => item.id === selectedTxn)?.id} ·
                source/destination references are synthetic and role-safe.
              </span>
            </div>
          )}
        </Section>
      )}
      {tab === "Entities" && (
        <Section
          title={`Account and entity relationships · ${accounts.length} linked accounts`}
        >
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Institution</th>
                <th>Synthetic role</th>
                <th>Risk</th>
                <th>Relationship evidence</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <strong>{account.number}</strong>
                    <small>{account.id}</small>
                  </td>
                  <td>{account.bank}</td>
                  <td>
                    <Badge>{account.type}</Badge>
                    <small>Clearly labelled synthetic relationship</small>
                  </td>
                  <td>
                    <Badge tone={account.riskScore >= 85 ? "red" : "orange"}>
                      {account.riskScore}
                    </Badge>
                  </td>
                  <td>
                    {data.relationships
                      .filter(
                        (r) =>
                          r.sourceId === account.id ||
                          r.targetId === account.id,
                      )
                      .map((r) => r.relationship)
                      .join("; ") || "No relationship evidence recorded"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="case-callout">
            <strong>Transaction hops</strong>
            <span>
              {Math.max(0, tx.length - 1)} observed hop(s). Missing
              relationships are shown as gaps rather than inferred.
            </span>
          </div>
        </Section>
      )}
      {tab === "Predictions" && (
        <Section
          title={`Prediction history · ${predictions.length} stored records`}
          action="Open predictive intelligence"
          onAction={() => setPage("Predictive cash-out")}
        >
          <table>
            <thead>
              <tr>
                <th>Prediction</th>
                <th>Candidates</th>
                <th>Window</th>
                <th>Risk / confidence</th>
                <th>Explanation / refresh</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((prediction) => (
                <tr key={prediction.id}>
                  <td>
                    <strong>{prediction.id}</strong>
                    <small>
                      {new Date(prediction.createdAt).toLocaleString()}
                    </small>
                  </td>
                  <td>
                    {prediction.candidateIds
                      .map(
                        (id) =>
                          data.candidates.find((c) => c.id === id)?.location ||
                          id,
                      )
                      .join("; ")}
                  </td>
                  <td>{prediction.window}</td>
                  <td>
                    <Badge tone="red">
                      {prediction.confidence}% confidence
                    </Badge>
                    <small>Risk is held on candidate records separately</small>
                  </td>
                  <td>
                    {prediction.rationale}
                    <small>
                      Refreshed{" "}
                      {new Date(prediction.updatedAt).toLocaleString()}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {tab === "Interventions" && (
        <Section
          title={`Intervention history · ${interventions.length} records`}
          action="Open prioritisation"
          onAction={() => setPage("Interventions")}
        >
          <table>
            <thead>
              <tr>
                <th>Recommendation</th>
                <th>Team</th>
                <th>Status</th>
                <th>Review history / outcome</th>
              </tr>
            </thead>
            <tbody>
              {interventions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.action}</strong>
                    <small>{item.id}</small>
                  </td>
                  <td>{item.owner}</td>
                  <td>
                    <Badge tone={item.status.toLowerCase().replace(" ", "-")}>
                      {item.status}
                    </Badge>
                  </td>
                  <td>
                    {item.reviewHistory
                      ?.map((review) => review.action)
                      .join("; ") || "No review decision recorded"}
                    <small>
                      {data.outcomes
                        .filter((o) => o.interventionId === item.id)
                        .map((o) => o.result)
                        .join("; ") || "No confirmed outcome"}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      {tab === "Notes & Evidence" && (
        <div className="grid two">
          <Section title={`Investigation notes · ${notes.length}`}>
            <div className="notes">
              {notes.map((note) => (
                <div className="note" key={note.id}>
                  <div className="avatar">AM</div>
                  <div>
                    <strong>
                      {note.author}{" "}
                      <small>
                        {new Date(note.createdAt).toLocaleString()} ·{" "}
                        {note.category || "Unclassified"}
                      </small>
                    </strong>
                    {editing === note.id ? (
                      <>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                        />
                        <button className="button small" onClick={saveEdit}>
                          Save edit
                        </button>
                      </>
                    ) : (
                      <>
                        <p>{note.text}</p>
                        <button
                          className="text-button"
                          onClick={() => editNote(note.id)}
                        >
                          Edit note
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <textarea
                placeholder="Add an investigator demo note…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value)}
              >
                <option>Investigation</option>
                <option>Source review</option>
                <option>Risk rationale</option>
              </select>
              <button className="button" onClick={saveNote}>
                Add note
              </button>
            </div>
          </Section>
          <Section title={`Evidence index · ${evidence.length}`}>
            <div className="evidence-index">
              {evidence.map((item) => (
                <div className="evidence-item" key={item.id}>
                  <strong>{item.name}</strong>
                  <small>
                    {item.id} · {item.type} · {item.size}
                  </small>
                  <small>
                    {item.sourceReference || "No source reference"} ·{" "}
                    {item.integrityStatus || "Demo metadata only"}
                  </small>
                  <Badge tone={item.verified ? "green" : "orange"}>
                    {item.reviewStatus || "Pending review"}
                  </Badge>
                </div>
              ))}
              <input
                placeholder="Synthetic evidence title…"
                value={evidenceName}
                onChange={(e) => setEvidenceName(e.target.value)}
              />
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
              >
                <option>Document</option>
                <option>Transaction export</option>
                <option>Correspondence</option>
                <option>Analyst observation</option>
              </select>
              <button className="button" onClick={addSyntheticEvidence}>
                Add evidence entry
              </button>
            </div>
          </Section>
        </div>
      )}
    </>
  );
}

function Interventions({
  data,
  setData,
  setPage,
  openCase,
}: {
  data: Dataset;
  setData: (d: Dataset) => void;
  setPage: (page: string) => void;
  openCase: (id: string) => void;
}) {
  const [urgency, setUrgency] = useState("All urgency");
  const [region, setRegion] = useState("All regions");
  const [caseFilter, setCaseFilter] = useState("All cases");
  const [owner, setOwner] = useState("All teams");
  const [status, setStatus] = useState("All statuses");
  const [sort, setSort] = useState("priority");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [outcome, setOutcome] = useState("");
  const [validation, setValidation] = useState("");
  const teamOptions = Array.from(
    new Set(data.interventions.map((item) => item.owner)),
  );
  const rows = data.interventions.map((intervention, index) => {
    const prediction = data.predictions.find(
      (item) =>
        item.caseId === intervention.caseId &&
        (!intervention.candidateId ||
          item.candidateIds.includes(intervention.candidateId)),
    );
    const candidate =
      data.candidates.find((item) => item.id === intervention.candidateId) ||
      data.candidates.find((item) => item.predictionId === prediction?.id);
    const linkedCase = data.cases.find(
      (item) => item.id === intervention.caseId,
    );
    const complaint = data.complaints.find(
      (item) => item.caseId === intervention.caseId,
    );
    const transactions = data.transactions.filter(
      (item) => item.caseId === intervention.caseId,
    );
    const exposure =
      transactions.reduce((sum, item) => sum + item.amount, 0) ||
      candidate?.amount ||
      0;
    const window = prediction?.window || "Unknown";
    const hours = window.includes("0–4")
      ? 4
      : window.includes("4–12")
        ? 12
        : window.includes("12–24")
          ? 24
          : 48;
    const feasibility =
      intervention.responseFeasibility ||
      (candidate?.type === "ATM"
        ? "High"
        : candidate?.type === "Branch"
          ? "Medium"
          : "Unknown");
    const linkedCases = new Set([
      intervention.caseId,
      ...data.transactions
        .filter(
          (item) =>
            candidate && complaint?.location.split(",")[0] === item.location,
        )
        .map((item) => item.caseId),
    ]);
    const priorityScore = Math.round(
      (candidate?.riskScore || 0) * 0.35 +
        Math.max(0, 100 - hours * 3) * 0.25 +
        Math.min(100, exposure / 5000) * 0.2 +
        (feasibility === "High" ? 100 : feasibility === "Medium" ? 65 : 30) *
          0.1 +
        Math.min(100, Math.max(1, linkedCases.size) * 25) * 0.1,
    );
    const state = complaint?.location.split(",")[1]?.trim() || "Unknown";
    const infoQuality =
      transactions.length && prediction
        ? "Strong"
        : prediction
          ? "Partial"
          : "Unknown";
    return {
      intervention,
      prediction,
      candidate,
      linkedCase,
      complaint,
      transactions,
      exposure,
      window,
      hours,
      feasibility,
      linkedCases,
      priorityScore,
      state,
      infoQuality,
      rank: index + 1,
    };
  });
  const filtered = rows
    .filter(
      (row) =>
        (urgency === "All urgency" || row.intervention.urgency === urgency) &&
        (region === "All regions" || row.state === region) &&
        (caseFilter === "All cases" ||
          row.intervention.caseId === caseFilter) &&
        (owner === "All teams" || row.intervention.owner === owner) &&
        (status === "All statuses" || row.intervention.status === status),
    )
    .sort((a, b) =>
      sort === "exposure"
        ? b.exposure - a.exposure
        : sort === "risk"
          ? (b.candidate?.riskScore || 0) - (a.candidate?.riskScore || 0)
          : sort === "time"
            ? a.hours - b.hours
            : b.priorityScore - a.priorityScore,
    );
  const selected =
    filtered.find((row) => row.intervention.id === selectedId) ||
    rows.find((row) => row.intervention.id === selectedId);
  const compareRows = rows.filter((row) =>
    compare.includes(row.intervention.id),
  );
  const regions = Array.from(new Set(rows.map((row) => row.state))).sort();
  const statuses = [
    "Pending review",
    "Under review",
    "Awaiting information",
    "Approved for authorised action",
    "Action initiated (simulated)",
    "Completed",
    "Unsuccessful",
    "Cancelled",
    "Closed without action",
    "Recommended",
    "In Progress",
  ];
  const updateIntervention = (
    row: (typeof rows)[number],
    nextStatus: string,
    action: string,
    why?: string,
    team?: string,
  ) => {
    if (
      (nextStatus === "Action initiated (simulated)" ||
        nextStatus === "Completed") &&
      !window.confirm(
        `Confirm simulated status change to "${nextStatus}"? No external action will be performed.`,
      )
    )
      return;
    if (
      (nextStatus === "Deferred" || nextStatus === "Rejected") &&
      !why?.trim()
    ) {
      setValidation(
        "A reason is required before deferring or rejecting this recommendation.",
      );
      return;
    }
    setValidation("");
    const stamp = new Date().toISOString();
    const updated = {
      ...row.intervention,
      status: nextStatus as any,
      owner: team || row.intervention.owner,
      updatedAt: stamp,
      reviewHistory: [
        ...(row.intervention.reviewHistory || []),
        {
          id: `review-${Date.now()}`,
          actor: "A. Mehta",
          action,
          reason: why,
          createdAt: stamp,
        },
      ],
    };
    let next = upsertIntervention(data, updated);
    if (nextStatus === "Completed" && outcome.trim())
      next = recordOutcome(next, {
        id: `out-${Date.now()}`,
        interventionId: row.intervention.id,
        result: outcome,
        amountProtected: row.exposure,
        recordedBy: "A. Mehta",
        createdAt: stamp,
        updatedAt: stamp,
      });
    next = addAudit(next, {
      actor: "A. Mehta",
      action: `Intervention ${action}`,
      target: row.intervention.id,
      detail: why || `Status changed to ${nextStatus}.`,
    });
    setData(next);
    setReason("");
    setOutcome("");
  };
  const toggleCompare = (id: string) =>
    setCompare((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  return (
    <>
      <Header
        title="Intervention prioritisation"
        eyebrow="RESPONSE OPERATIONS"
      />
      <div className="demo-banner">
        <span className="live-dot" /> Simulated decision support · A priority
        ranking is not proof of wrongdoing and no external action is executed.
      </div>
      <div className="intervention-filters">
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
          <option>All urgency</option>
          {["Critical", "High", "Medium", "Low"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option>All regions</option>
          {regions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={caseFilter}
          onChange={(e) => setCaseFilter(e.target.value)}
        >
          <option>All cases</option>
          {data.cases.map((item) => (
            <option key={item.id} value={item.id}>
              {item.reference}
            </option>
          ))}
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option>All teams</option>
          {teamOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>All statuses</option>
          {statuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="priority">Sort: decision priority</option>
          <option value="risk">Sort: raw risk</option>
          <option value="exposure">Sort: exposure</option>
          <option value="time">Sort: time remaining</option>
        </select>
      </div>
      <div className="metrics">
        <Metric
          label="Recommendations"
          value={String(filtered.length)}
          note="Filtered decision records"
          accent="blue"
        />
        <Metric
          label="Urgent response queue"
          value={String(
            filtered.filter((row) => row.priorityScore >= 75).length,
          )}
          note="Priority score ≥ 75"
          accent="red"
        />
        <Metric
          label="Awaiting information"
          value={String(
            filtered.filter(
              (row) => row.intervention.status === "Awaiting information",
            ).length,
          )}
          note="Missing evidence is visible"
          accent="orange"
        />
        <Metric
          label="Completed outcomes"
          value={String(
            filtered.filter((row) => row.intervention.status === "Completed")
              .length,
          )}
          note="Simulated records only"
          accent="green"
        />
      </div>
      <div className="intervention-layout">
        <Section
          title={`Ranked intervention queue · ${filtered.length}`}
          action={
            compare.length > 1
              ? `Compare ${compare.length} selected`
              : undefined
          }
          onAction={() => setSelectedId(compare[0])}
        >
          {filtered.length ? (
            <div className="intervention-table">
              <div className="intervention-head">
                <span>Candidate / case</span>
                <span>Priority</span>
                <span>Risk / confidence</span>
                <span>Exposure / window</span>
                <span>Team / status</span>
              </div>
              {filtered.map((row) => (
                <div
                  className={`intervention-row ${selectedId === row.intervention.id ? "selected" : ""}`}
                  key={row.intervention.id}
                  onClick={() => setSelectedId(row.intervention.id)}
                >
                  <label
                    className="compare-check"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={compare.includes(row.intervention.id)}
                      onChange={() => toggleCompare(row.intervention.id)}
                    />
                  </label>
                  <div className="intervention-candidate">
                    <strong>
                      {row.candidate?.location || "Unknown candidate"}
                    </strong>
                    <small>
                      {row.intervention.id} ·{" "}
                      {row.linkedCase?.reference || row.intervention.caseId}
                    </small>
                    <small>
                      {row.candidate?.type || "Unknown type"} · {row.state}
                    </small>
                  </div>
                  <div>
                    <PriorityBadge value={row.intervention.urgency} />
                    <strong className="priority-score">
                      {row.priorityScore}
                    </strong>
                    <small>decision score</small>
                  </div>
                  <div>
                    <strong>
                      {row.candidate?.riskScore ?? "Unknown"} /{" "}
                      {row.prediction?.confidence ?? "Unknown"}
                    </strong>
                    <small>risk / confidence</small>
                  </div>
                  <div>
                    <strong>
                      {row.exposure ? money(row.exposure) : "Unknown"}
                    </strong>
                    <small>
                      {row.window} · {row.hours}h horizon
                    </small>
                  </div>
                  <div>
                    <strong>{row.intervention.owner}</strong>
                    <small>{row.intervention.status}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No intervention recommendations match these filters." />
          )}
        </Section>
        <div className="intervention-side">
          {selected ? (
            <Section title="Recommendation details">
              <div className="recommendation-detail">
                <div className="detail-title">
                  <div>
                    <strong>
                      {selected.candidate?.location || "Unknown location"}
                    </strong>
                    <small>
                      {selected.intervention.id} · linked prediction{" "}
                      {selected.prediction?.id || "Unknown"}
                    </small>
                  </div>
                  <Badge
                    tone={
                      selected.priorityScore >= 75
                        ? "red"
                        : selected.priorityScore >= 55
                          ? "orange"
                          : "green"
                    }
                  >
                    Priority {selected.priorityScore}
                  </Badge>
                </div>
                <div className="detail-grid">
                  <div>
                    <small>Risk score</small>
                    <strong>
                      {selected.candidate?.riskScore ?? "Unknown"}
                    </strong>
                  </div>
                  <div>
                    <small>Confidence</small>
                    <strong>
                      {selected.prediction?.confidence ?? "Unknown"}
                    </strong>
                  </div>
                  <div>
                    <small>Feasibility</small>
                    <strong>{selected.feasibility}</strong>
                  </div>
                  <div>
                    <small>Linked cases</small>
                    <strong>{selected.linkedCases.size || "Unknown"}</strong>
                  </div>
                </div>
                <div className="factor-box">
                  <strong>Decision factors</strong>
                  <ul>
                    <li>
                      Predicted risk:{" "}
                      {selected.candidate?.riskScore ?? "Unknown"}
                    </li>
                    <li>
                      Time remaining: {selected.hours}h based on{" "}
                      {selected.window}
                    </li>
                    <li>
                      Estimated exposure:{" "}
                      {selected.exposure ? money(selected.exposure) : "Unknown"}
                    </li>
                    <li>Response reachability: {selected.feasibility}</li>
                    <li>Information quality: {selected.infoQuality}</li>
                    <li>
                      Resource constraints:{" "}
                      {selected.feasibility === "Low"
                        ? "Team capacity requires escalation"
                        : "No constraint recorded in demo data"}
                    </li>
                  </ul>
                </div>
                <div className="detail-lines">
                  <span>
                    <b>Model-style recommendation:</b>{" "}
                    {selected.intervention.action}
                  </span>
                  <span>
                    <b>Responsible team:</b> {selected.intervention.owner}
                  </span>
                  <span>
                    <b>Verify first:</b> bank confirmation, candidate
                    availability, latest transaction event
                  </span>
                  <span>
                    <b>Limitations:</b> synthetic records, no live liquidity, no
                    real dispatch or account action
                  </span>
                </div>
                <div className="recommendation-actions">
                  <button
                    className="button primary"
                    onClick={() =>
                      updateIntervention(
                        selected,
                        "Under review",
                        "Accepted for further authorised review",
                      )
                    }
                  >
                    Accept for review
                  </button>
                  <button
                    className="button"
                    onClick={() =>
                      updateIntervention(
                        selected,
                        "Awaiting information",
                        "Information requested",
                      )
                    }
                  >
                    Request information
                  </button>
                  <button
                    className="button"
                    onClick={() => setNewTeam(selected.intervention.owner)}
                  >
                    Change team
                  </button>
                  <button
                    className="button"
                    onClick={() => openCase(selected.intervention.caseId)}
                  >
                    Open case
                  </button>
                  <button
                    className="button"
                    onClick={() => setPage("GIS heatmap")}
                  >
                    Open map
                  </button>
                </div>
                <div className="review-form">
                  <input
                    placeholder="Team or reason for decision"
                    value={newTeam || reason}
                    onChange={(e) =>
                      newTeam
                        ? setNewTeam(e.target.value)
                        : setReason(e.target.value)
                    }
                  />
                  <button
                    className="button small"
                    onClick={() => {
                      if (newTeam) {
                        updateIntervention(
                          selected,
                          selected.intervention.status,
                          "Assigned team changed",
                          undefined,
                          newTeam,
                        );
                        setNewTeam("");
                      }
                    }}
                  >
                    Save team
                  </button>
                  <button
                    className="button small"
                    onClick={() =>
                      updateIntervention(
                        selected,
                        "Awaiting information",
                        "Deferred pending information",
                        reason,
                      )
                    }
                  >
                    Defer
                  </button>
                  <button
                    className="button small danger-action"
                    onClick={() =>
                      updateIntervention(
                        selected,
                        "Closed without action",
                        "Rejected",
                        reason,
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
                <div className="review-form">
                  <input
                    placeholder="Outcome summary for simulated completion"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                  />
                  <button
                    className="button small"
                    onClick={() =>
                      updateIntervention(
                        selected,
                        "Action initiated (simulated)",
                        "Simulated action initiated",
                      )
                    }
                  >
                    Initiate simulated action
                  </button>
                  <button
                    className="button small"
                    onClick={() =>
                      updateIntervention(
                        selected,
                        "Completed",
                        "Simulated outcome recorded",
                      )
                    }
                  >
                    Record outcome
                  </button>
                </div>
                {validation && (
                  <div className="validation-message">{validation}</div>
                )}
                <div className="timeline">
                  <strong>Review and status timeline</strong>
                  {(selected.intervention.reviewHistory || [])
                    .slice()
                    .reverse()
                    .map((item) => (
                      <div key={item.id}>
                        <span className="activity-dot" />
                        <span>
                          <b>{item.action}</b>
                          <small>
                            {item.reason || "No reason supplied"} ·{" "}
                            {timeAgo(item.createdAt)}
                          </small>
                        </span>
                      </div>
                    ))}
                  <div>
                    <span className="activity-dot" />
                    <span>
                      <b>Current: {selected.intervention.status}</b>
                      <small>
                        Model recommendation remains separate from confirmed
                        outcome.
                      </small>
                    </span>
                  </div>
                </div>
              </div>
            </Section>
          ) : (
            <Section title="Select a recommendation">
              <Empty text="Select a queue item to inspect decision factors, review controls, and status history." />
            </Section>
          )}
        </div>
      </div>
      {compareRows.length > 1 && (
        <Section title="Candidate comparison">
          <div className="comparison-grid">
            {compareRows.map((row) => (
              <div className="comparison-card" key={row.intervention.id}>
                <strong>{row.candidate?.location}</strong>
                <small>
                  {row.intervention.id} · {row.linkedCase?.reference}
                </small>
                <dl>
                  <dt>Decision priority</dt>
                  <dd>{row.priorityScore}</dd>
                  <dt>Risk / confidence</dt>
                  <dd>
                    {row.candidate?.riskScore ?? "Unknown"} /{" "}
                    {row.prediction?.confidence ?? "Unknown"}
                  </dd>
                  <dt>Exposure</dt>
                  <dd>{row.exposure ? money(row.exposure) : "Unknown"}</dd>
                  <dt>Window</dt>
                  <dd>{row.window}</dd>
                  <dt>Feasibility</dt>
                  <dd>{row.feasibility}</dd>
                  <dt>Missing info</dt>
                  <dd>
                    {row.infoQuality === "Strong"
                      ? "None recorded"
                      : "Information quality is limited"}
                  </dd>
                  <dt>Recommended action</dt>
                  <dd>{row.intervention.action}</dd>
                </dl>
              </div>
            ))}
          </div>
          <p className="comparison-note">
            Priority is a simulated decision-support ranking, not proof of
            wrongdoing or a substitute for authorised investigator judgement.
          </p>
        </Section>
      )}
    </>
  );
}

function Proactive({
  data,
  setData,
  setPage,
  openCase,
}: {
  data: Dataset;
  setData: (d: Dataset) => void;
  setPage: (p: string) => void;
  openCase: (id: string) => void;
}) {
  const enrich = (warning: Dataset["warnings"][number]) => {
    const fallbackCases =
      warning.id === "warn-001"
        ? ["case-001", "case-002"]
        : warning.id === "warn-002"
          ? ["case-003"]
          : ["case-002", "case-003"];
    const caseIds = warning.caseIds?.length ? warning.caseIds : fallbackCases;
    const cases = data.cases.filter((item) => caseIds.includes(item.id));
    const accounts = data.accounts.filter(
      (item) =>
        warning.accountIds?.includes(item.id) ||
        cases.some((item) => item.accountIds.includes(item.id)),
    );
    const transactions = data.transactions.filter(
      (item) =>
        warning.transactionIds?.includes(item.id) ||
        caseIds.includes(item.caseId),
    );
    const region =
      warning.region ||
      cases
        .map(
          (item) => data.complaints.find((c) => c.caseId === item.id)?.location,
        )
        .filter(Boolean)
        .join(" · ") ||
      "Synthetic multi-region";
    return {
      ...warning,
      caseIds,
      accounts,
      transactions,
      cases,
      region,
      category:
        warning.category ||
        (warning.id === "warn-001"
          ? "Abnormal transaction flow or transaction bursts"
          : warning.id === "warn-002"
            ? "Behaviour consistent with a possible cash-out precursor"
            : "New links between previously separate entity groups"),
      confidence:
        warning.confidence ??
        (warning.severity === "Critical"
          ? 89
          : warning.severity === "High"
            ? 78
            : 66),
      explanation:
        warning.explanation ||
        `${warning.signal} is supported by linked synthetic accounts and observed transaction records.`,
      limitations:
        warning.limitations ||
        "Synthetic observations only; no live feeds, trained model, or identity validation.",
      recommendation:
        warning.recommendation ||
        "Review linked complaints and examine the transaction chain before deciding whether to escalate.",
      owner: warning.owner || "I4C Fusion Cell",
      detectedPeriod: warning.detectedPeriod || "Current simulated demo period",
    };
  };
  const rows = data.warnings.map(enrich);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("All severity");
  const [status, setStatus] = useState("All statuses");
  const [category, setCategory] = useState("All categories");
  const [selectedId, setSelectedId] = useState(rows[0]?.id || "");
  const [reason, setReason] = useState("");
  const [validation, setValidation] = useState("");
  const categories = Array.from(new Set(rows.map((item) => item.category)));
  const filtered = rows.filter(
    (item) =>
      (severity === "All severity" || item.severity === severity) &&
      (status === "All statuses" || item.status === status) &&
      (category === "All categories" || item.category === category) &&
      `${item.id} ${item.title} ${item.signal} ${item.region}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const selected = rows.find((item) => item.id === selectedId);
  const update = (item: (typeof rows)[number], next: string) => {
    if (next === "Dismissed" && !reason.trim()) {
      setValidation("A reason is required when dismissing a warning.");
      return;
    }
    if (
      (next === "Escalated" || next === "Resolved") &&
      !window.confirm(
        `Confirm simulated warning status "${next}"? No external action will be performed.`,
      )
    )
      return;
    const detail = reason.trim() || `Status changed to ${next}.`;
    setData(
      addAudit(
        updateWarning(data, item.id, { status: next, owner: "A. Mehta" }),
        {
          actor: "A. Mehta",
          action: `Early warning ${next.toLowerCase()}`,
          target: item.id,
          detail,
        },
      ),
    );
    setReason("");
    setValidation("");
  };
  const chart = (key: "category" | "region" | "severity") => {
    const grouped = filtered.reduce<Record<string, number>>((acc, item) => {
      const value = String(item[key] || "Unknown");
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  };
  return (
    <>
      <Header
        title="Proactive / Suo-Motu Intelligence"
        eyebrow="EARLY-WARNING CONSOLE"
      />
      <div className="demo-banner">
        <span className="live-dot" />
        Synthetic early-warning demonstration · deterministic seeded patterns,
        not real-time anomaly detection or a trained ML model.
      </div>
      <div className="warning-filters">
        <input
          placeholder="Search warning, signal, region…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option>All severity</option>
          {["Critical", "High", "Medium", "Low"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All categories</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>All statuses</option>
          {[
            "New",
            "Under review",
            "Escalated",
            "Monitoring",
            "Dismissed",
            "Resolved",
            "Triaged",
          ].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button
          className="button"
          onClick={() => {
            setQuery("");
            setSeverity("All severity");
            setCategory("All categories");
            setStatus("All statuses");
          }}
        >
          Reset filters
        </button>
      </div>
      <div className="metrics">
        <Metric
          label="Active warnings"
          value={String(
            rows.filter(
              (item) => !["Dismissed", "Resolved"].includes(item.status),
            ).length,
          )}
          note="Seeded patterns requiring attention"
          accent="blue"
        />
        <Metric
          label="New demo patterns"
          value={String(rows.filter((item) => item.status === "New").length)}
          note="Deterministic detections"
          accent="orange"
        />
        <Metric
          label="High severity"
          value={String(
            rows.filter((item) => ["Critical", "High"].includes(item.severity))
              .length,
          )}
          note="Review priority, not proof"
          accent="red"
        />
        <Metric
          label="Awaiting review"
          value={String(
            rows.filter((item) =>
              ["New", "Under review", "Triaged"].includes(item.status),
            ).length,
          )}
          note="Human assessment required"
          accent="green"
        />
        <Metric
          label="Multi-case warnings"
          value={String(
            rows.filter((item) => item.caseIds && item.caseIds.length > 1)
              .length,
          )}
          note="Linked through existing IDs"
          accent="purple"
        />
      </div>
      <div className="grid three warning-charts">
        <Section title="By category">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={chart("category")}
              onClick={(state) => {
                const name = (state?.activeLabel as string) || "";
                if (name) setCategory(name);
              }}
            >
              <XAxis dataKey="name" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#38c7da" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
        <Section title="By region">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={chart("region")}
              onClick={(state) => {
                const name = (state?.activeLabel as string) || "";
                if (name) {
                  setQuery(name);
                }
              }}
            >
              <XAxis dataKey="name" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#a681e4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
        <Section title="By severity">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={chart("severity")}
              onClick={(state) => {
                const name = (state?.activeLabel as string) || "";
                if (name) setSeverity(name);
              }}
            >
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#f3aa55" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>
      <div className="warning-layout">
        <Section title={`Traceable warning queue · ${filtered.length}`}>
          <div className="warning-list">
            {filtered.map((item) => (
              <button
                className={`warning-row ${selectedId === item.id ? "selected" : ""}`}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {item.id} · {item.category}
                  </small>
                  <small>
                    {item.signal} · detected {timeAgo(item.createdAt)}
                  </small>
                </div>
                <div>
                  <PriorityBadge value={item.severity} />
                  <strong>{item.confidence}%</strong>
                  <small>confidence · {item.region}</small>
                </div>
                <div>
                  <Badge tone={item.status.toLowerCase().replace(" ", "-")}>
                    {item.status}
                  </Badge>
                  <small>
                    {item.caseIds?.length || 1} linked case(s) · {item.entities}{" "}
                    entities
                  </small>
                </div>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <Empty text="No early warnings match these filters." />
          )}
        </Section>
        <div>
          {selected ? (
            <Section title="Warning detail">
              <div className="warning-detail">
                <div className="detail-title">
                  <div>
                    <strong>{selected.title}</strong>
                    <small>
                      {selected.id} · {selected.category}
                    </small>
                  </div>
                  <PriorityBadge value={selected.severity} />
                </div>
                <div className="detail-grid">
                  <div>
                    <small>Detected</small>
                    <strong>
                      {new Date(selected.createdAt).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <small>Period</small>
                    <strong>{selected.detectedPeriod}</strong>
                  </div>
                  <div>
                    <small>Confidence</small>
                    <strong>{selected.confidence}%</strong>
                  </div>
                  <div>
                    <small>Region</small>
                    <strong>{selected.region}</strong>
                  </div>
                  <div>
                    <small>Linked cases</small>
                    <strong>{selected.caseIds.length}</strong>
                  </div>
                  <div>
                    <small>Affected entities</small>
                    <strong>{selected.entities}</strong>
                  </div>
                </div>
                <div className="factor-box">
                  <strong>Why this deserves review</strong>
                  <p>{selected.explanation}</p>
                  <strong>Records that triggered it</strong>
                  <p>
                    {selected.transactions.length} transaction(s),{" "}
                    {selected.accounts.length} account(s), and{" "}
                    {selected.cases.length} complaint-linked case(s) from the
                    synthetic dataset.
                  </p>
                  <strong>Limitations</strong>
                  <p>{selected.limitations}</p>
                </div>
                <div className="detail-lines">
                  <span>
                    <b>Suggested first response:</b> {selected.recommendation}
                  </span>
                  <span>
                    <b>Current owner:</b> {selected.owner} · <b>Status:</b>{" "}
                    {selected.status}
                  </span>
                </div>
                <div className="warning-actions">
                  <select
                    value={selected.status}
                    onChange={(e) => update(selected, e.target.value)}
                  >
                    {[
                      "New",
                      "Under review",
                      "Escalated",
                      "Monitoring",
                      "Dismissed",
                      "Resolved",
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Reason for dismissal or review note"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <button
                    className="button"
                    onClick={() => update(selected, "Under review")}
                  >
                    Start review
                  </button>
                  <button
                    className="button primary"
                    onClick={() => update(selected, "Escalated")}
                  >
                    Escalate
                  </button>
                  <button
                    className="button danger"
                    onClick={() => update(selected, "Dismissed")}
                  >
                    Dismiss
                  </button>
                </div>
                {validation && (
                  <div className="validation-message">{validation}</div>
                )}
                <div className="warning-links">
                  <strong>Connected workflows</strong>
                  <button
                    className="text-button"
                    onClick={() =>
                      selected.caseIds[0] && openCase(selected.caseIds[0])
                    }
                  >
                    Open linked investigation →
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setPage("Predictive cash-out")}
                  >
                    Inspect predictive intelligence →
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setPage("GIS heatmap")}
                  >
                    Open geographic risk map →
                  </button>
                </div>
              </div>
            </Section>
          ) : (
            <Section title="Select a warning">
              <Empty text="Select a warning to inspect its traceable records and advisory response." />
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function AlternateExits({
  data,
  setData,
  setPage,
  openCase,
}: {
  data: Dataset;
  setData: (d: Dataset) => void;
  setPage: (p: string) => void;
  openCase: (id: string) => void;
}) {
  const [caseId, setCaseId] = useState(data.cases[0]?.id || "");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [eventType, setEventType] = useState("Cash withdrawal");
  const [scenario, setScenario] = useState("cash");
  const [timestamp, setTimestamp] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [accountId, setAccountId] = useState(data.accounts[0]?.id || "");
  const [amount, setAmount] = useState("50000");
  const [location, setLocation] = useState("Indiranagar Metro ATM");
  const [sourceNote, setSourceNote] = useState(
    "Synthetic observation entered by demo investigator.",
  );
  const [outcome, setOutcome] = useState("");
  const [message, setMessage] = useState("");
  const currentCase =
    data.cases.find((item) => item.id === caseId) || data.cases[0];
  const prediction = data.predictions.find((item) => item.caseId === caseId);
  const priorEvents = data.alternateExits.filter(
    (item) =>
      item.caseId === caseId ||
      (!item.caseId &&
        item.accountId &&
        currentCase?.accountIds.includes(item.accountId)),
  );
  const selected =
    priorEvents.find((item) => item.id === selectedId) || priorEvents[0];
  const account = data.accounts.find((item) => item.id === accountId);
  const timeline = [
    ...(currentCase
      ? [
          {
            id: "complaint",
            at:
              data.complaints.find((item) => item.caseId === caseId)
                ?.createdAt || currentCase.createdAt,
            label: "Initial complaint",
            kind: "Observed synthetic",
            detail:
              data.complaints.find((item) => item.caseId === caseId)
                ?.reference || "Complaint record",
          },
        ]
      : []),
    ...data.transactions
      .filter((item) => item.caseId === caseId)
      .map((item) => ({
        id: item.id,
        at: item.createdAt,
        label: "Known transaction event",
        kind: "Observed synthetic",
        detail: `${item.fromAccountId} → ${item.toAccountId} · ${money(item.amount)} · ${item.channel}`,
      })),
    ...(prediction
      ? [
          {
            id: prediction.id,
            at: prediction.createdAt,
            label: "Initial prediction",
            kind: "Inferred / predicted",
            detail: `${prediction.window} · ${prediction.confidence}% confidence`,
          },
        ]
      : []),
    ...priorEvents.map((item) => ({
      id: item.id,
      at: item.observedAt || item.createdAt,
      label: `New ${item.eventType || item.type} observation`,
      kind: "Observed synthetic",
      detail: `${item.route} · ${money(item.amount)} · ${item.location || "Location unknown"}`,
    })),
    ...(priorEvents.length
      ? [
          {
            id: "refresh",
            at: priorEvents[0].updatedAt,
            label: "Prediction refresh and route review",
            kind: "Inferred / predicted",
            detail:
              "Deterministic demo features recalculated from the observed event.",
          },
        ]
      : []),
    ...data.interventions
      .filter((item) => item.caseId === caseId)
      .map((item) => ({
        id: item.id,
        at: item.updatedAt,
        label: "Intervention decision",
        kind: "Decision record",
        detail: `${item.action} · ${item.status}`,
      })),
    ...data.outcomes
      .filter(
        (item) =>
          data.interventions.find((int) => int.id === item.interventionId)
            ?.caseId === caseId,
      )
      .map((item) => ({
        id: item.id,
        at: item.createdAt,
        label: "Recorded outcome",
        kind: "Observed synthetic outcome",
        detail: item.result,
      })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const submit = () => {
    if (
      !caseId ||
      !accountId ||
      !data.accounts.some(
        (item) => item.id === accountId && item.caseId === caseId,
      ) ||
      !amount ||
      Number(amount) <= 0 ||
      !timestamp
    ) {
      setMessage(
        "Select a case, an account linked to that case, a positive amount, and an event timestamp.",
      );
      return;
    }
    const route =
      scenario === "cash"
        ? "Cash withdrawal"
        : scenario === "wallet"
          ? "Wallet / merchant / POS"
          : scenario === "crypto"
            ? "Crypto or foreign route"
            : "Unknown / insufficiently observed";
    const isAlternate = scenario !== "cash";
    const event = {
      caseId,
      accountId,
      sourceAccountId: accountId,
      destinationEntity: location,
      amount: Number(amount),
      currency: "INR",
      riskScore: scenario === "cash" ? 88 : scenario === "unknown" ? 35 : 62,
      status: "Simulated new observation",
      type: route,
      route,
      eventType: eventType,
      location: scenario === "cash" ? location : undefined,
      sourceNote,
      observedAt: new Date(timestamp).toISOString(),
      predictionId: prediction?.id,
    };
    let next = addAlternateExit(data, event);
    const rationale = isAlternate
      ? `New ${route.toLowerCase()} observation changes the route assessment; ATM ranking is not asserted.`
      : `New withdrawal observation supports continued cash-out location review at ${location}.`;
    if (prediction) {
      next = addAudit(next, {
        actor: "A. Mehta",
        action: "Prediction refresh simulated",
        target: prediction.id,
        detail: rationale,
      });
    }
    next = addAudit(next, {
      actor: "A. Mehta",
      action: "Alternate-exit event simulated",
      target: caseId,
      detail: `${route}; ${money(Number(amount))}; ${sourceNote}`,
    });
    setData(next);
    setShowForm(false);
    setMessage(
      `Updated case state: ${route}. ${rationale} No model retraining occurred.`,
    );
  };
  const saveOutcome = () => {
    if (!outcome || !selected) {
      setMessage("Select an observed event before recording an outcome.");
      return;
    }
    const next = addAudit(data, {
      actor: "A. Mehta",
      action: "Alternate-exit outcome recorded",
      target: selected.id,
      detail: outcome,
    });
    setData(next);
    setMessage(
      `Outcome recorded for ${selected.id}. It is available for future evaluation only; no model training occurred.`,
    );
    setOutcome("");
  };
  return (
    <>
      <Header
        title="Adaptive / Alternate-Exit Intelligence"
        eyebrow="ROUTE ADAPTATION CONSOLE"
      />
      <div className="demo-banner">
        <span className="live-dot" />
        Deterministic synthetic simulation · observations update local demo
        state only; no live monitoring or automatic model retraining.
      </div>
      <div className="alternate-controls">
        <label>
          Selected case
          <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            {data.cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.reference} · {item.title}
              </option>
            ))}
          </select>
        </label>
        <button className="button primary" onClick={() => setShowForm(true)}>
          ＋ Simulate new event
        </button>
        {message && <span className="success-message">{message}</span>}
      </div>
      <div className="grid two">
        <Section
          title={`Live-state timeline · ${currentCase?.reference || "Unknown case"}`}
        >
          <div className="timeline adaptive-timeline">
            {timeline.map((item) => (
              <div key={item.id}>
                <span className="activity-dot" />
                <span>
                  <b>{item.label}</b>
                  <small>
                    {item.kind} · {new Date(item.at).toLocaleString()}
                  </small>
                  <small>{item.detail}</small>
                </span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Current route state">
          <div className="detail-grid">
            <div>
              <small>Current prediction</small>
              <strong>{prediction?.window || "No prediction"}</strong>
            </div>
            <div>
              <small>Confidence</small>
              <strong>{prediction?.confidence ?? "Unknown"}%</strong>
            </div>
            <div>
              <small>Observed alternate events</small>
              <strong>{priorEvents.length}</strong>
            </div>
            <div>
              <small>Recommended posture</small>
              <strong>
                {priorEvents.some((item) => item.type.includes("Crypto"))
                  ? "Specialist review"
                  : priorEvents.some((item) => item.type.includes("Wallet"))
                    ? "Authorised tracing"
                    : "Continue cash-out review"}
              </strong>
            </div>
          </div>
          <div className="case-callout">
            <strong>Interpretation boundary</strong>
            <span>
              Observed events and inferred route assessments are separated. A
              route signal is not a finding of wrongdoing.
            </span>
          </div>
        </Section>
      </div>
      <div className="grid two">
        <Section title="Prior and updated prediction comparison">
          {selected ? (
            <div className="comparison-grid">
              <div className="comparison-card">
                <strong>Previous snapshot</strong>
                <small>{prediction?.id || "No linked prediction"}</small>
                <dl>
                  <dt>Window</dt>
                  <dd>{prediction?.window || "Unknown"}</dd>
                  <dt>Confidence</dt>
                  <dd>{prediction?.confidence ?? "Unknown"}%</dd>
                  <dt>Route</dt>
                  <dd>Cash-out candidate review</dd>
                </dl>
              </div>
              <div className="comparison-card">
                <strong>Updated demo assessment</strong>
                <small>{selected.updatedAt}</small>
                <dl>
                  <dt>Route</dt>
                  <dd>{selected.route}</dd>
                  <dt>Score</dt>
                  <dd>{selected.riskScore}</dd>
                  <dt>Change reason</dt>
                  <dd>{selected.sourceNote}</dd>
                </dl>
              </div>
            </div>
          ) : (
            <Empty text="Simulate an event to compare the prior and updated route assessment." />
          )}
        </Section>
        <Section title="Recorded event observations">
          {priorEvents.length ? (
            priorEvents.map((item) => (
              <button
                className={`event-card ${selected?.id === item.id ? "selected" : ""}`}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <strong>{item.route}</strong>
                <small>
                  {item.id} · {item.eventType || item.type} ·{" "}
                  {new Date(item.observedAt || item.createdAt).toLocaleString()}
                </small>
                <span>
                  {money(item.amount)} {item.location && `· ${item.location}`}
                </span>
              </button>
            ))
          ) : (
            <Empty text="No alternate-exit observations for this case." />
          )}
          {selected && (
            <div className="outcome-form">
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="">Record simulated outcome…</option>
                <option>Cash withdrawal observed</option>
                <option>Predicted location not confirmed</option>
                <option>Alternative route identified</option>
                <option>Intervention completed</option>
                <option>No action taken</option>
                <option>Outcome unknown</option>
              </select>
              <button className="button small" onClick={saveOutcome}>
                Save outcome
              </button>
            </div>
          )}
        </Section>
      </div>
      {showForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <h2>Simulate new event</h2>
              <button onClick={() => setShowForm(false)}>×</button>
            </div>
            <p className="muted">
              Use a predefined scenario to demonstrate how an observation
              affects the case state. This is not live monitoring.
            </p>
            <label>
              Case
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
              >
                {data.cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.reference}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Demo scenario
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                <option value="cash">Cash withdrawal observed</option>
                <option value="wallet">Wallet / merchant / POS route</option>
                <option value="crypto">Crypto or foreign route</option>
                <option value="unknown">
                  Unknown / insufficiently observed
                </option>
              </select>
            </label>
            <label>
              Event type
              <input
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              />
            </label>
            <label>
              Timestamp
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
              />
            </label>
            <label>
              Source account
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {data.accounts
                  .filter((item) => item.caseId === caseId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id} · {item.number}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Amount (INR)
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Location reference
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <label>
              Evidence/source note
              <textarea
                value={sourceNote}
                onChange={(e) => setSourceNote(e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button className="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="button primary" onClick={submit}>
                Add synthetic event
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Network({
  data,
  openCase,
  setPage,
}: {
  data: Dataset;
  openCase: (id: string) => void;
  setPage: (p: string) => void;
}) {
  const nodes = [
    ...data.accounts.map((a, i) => ({
      id: a.id,
      label: a.number,
      type: "Account",
      x: 90 + (i % 4) * 170,
      y: 70 + Math.floor(i / 4) * 150,
      detail: `${a.bank} · ${a.type} · risk ${a.riskScore}`,
    })),
    ...data.cases.map((c, i) => ({
      id: c.id,
      label: c.reference,
      type: "Case",
      x: 120 + i * 250,
      y: 410,
      detail: c.title,
    })),
    ...data.candidates.map((c, i) => ({
      id: c.id,
      label: c.location,
      type: "Location",
      x: 110 + i * 210,
      y: 560,
      detail: `${c.type} · risk ${c.riskScore}`,
    })),
  ];
  const edges = [
    ...data.relationships.map((r) => ({
      from: r.sourceId,
      to: r.targetId,
      label: r.relationship,
      kind: "synthetic relationship",
    })),
    ...data.transactions.map((t) => ({
      from: t.fromAccountId,
      to: t.toAccountId,
      label: t.channel,
      kind: "observed transaction",
    })),
    ...data.cases.flatMap((c) =>
      c.accountIds.map((a) => ({
        from: c.id,
        to: a,
        label: "linked account",
        kind: "case link",
      })),
    ),
  ];
  const [selectedId, setSelectedId] = useState(nodes[0]?.id || "");
  const [relationship, setRelationship] = useState("All");
  const selected = nodes.find((n) => n.id === selectedId);
  const visibleEdges = edges.filter(
    (e) => relationship === "All" || e.kind === relationship,
  );
  const linked = visibleEdges.filter(
    (e) => e.from === selectedId || e.to === selectedId,
  );
  return (
    <>
      <Header title="Network Intelligence" eyebrow="CONNECTED ENTITY GRAPH" />
      <div className="demo-banner">
        <span className="live-dot" />
        Synthetic relationship graph · links are limited to recorded case,
        transaction, and relationship records. No live I4C or bank intelligence
        is connected.
      </div>
      <div className="network-controls">
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
        >
          <option>All</option>
          <option>observed transaction</option>
          <option>synthetic relationship</option>
          <option>case link</option>
        </select>
        <button
          className="button"
          onClick={() => setSelectedId(nodes[0]?.id || "")}
        >
          Reset selection
        </button>
      </div>
      <div className="network-layout">
        <Section title={`Relationship graph · ${nodes.length} entities`}>
          <svg
            className="network-graph"
            viewBox="0 0 800 650"
            role="img"
            aria-label="Synthetic relationship graph"
          >
            {visibleEdges.map((e, i) => {
              const a = nodes.find((n) => n.id === e.from),
                b = nodes.find((n) => n.id === e.to);
              return a && b ? (
                <g key={i}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className={
                      a.id === selectedId || b.id === selectedId
                        ? "edge active"
                        : "edge"
                    }
                  />
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2}
                    className="edge-label"
                  >
                    {e.label}
                  </text>
                </g>
              ) : null;
            })}
            {nodes.map((n) => (
              <g
                key={n.id}
                onClick={() => setSelectedId(n.id)}
                className="graph-node"
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.id === selectedId ? 24 : 18}
                  className={`node-${n.type.toLowerCase()} ${n.id === selectedId ? "selected" : ""}`}
                />
                <text x={n.x} y={n.y + 4} textAnchor="middle">
                  {n.type[0]}
                </text>
                <text
                  x={n.x}
                  y={n.y + 38}
                  textAnchor="middle"
                  className="node-label"
                >
                  {n.label}
                </text>
              </g>
            ))}
          </svg>
        </Section>
        <Section title="Selected entity">
          {selected ? (
            <div className="detail-lines">
              <strong>{selected.label}</strong>
              <span>
                {selected.type} · {selected.detail}
              </span>
              <span>Direct connections: {linked.length}</span>
              {linked.map((e, i) => (
                <span key={i}>
                  <b>{e.label}</b> · {e.kind} ·{" "}
                  {e.from === selectedId ? e.to : e.from}
                </span>
              ))}
              {selected.type === "Case" && (
                <button
                  className="button primary"
                  onClick={() => openCase(selected.id)}
                >
                  Open investigation workspace
                </button>
              )}
              {selected.type === "Account" &&
                data.accounts.find((a) => a.id === selected.id)?.caseId && (
                  <button
                    className="button"
                    onClick={() =>
                      openCase(
                        data.accounts.find((a) => a.id === selected.id)!.caseId,
                      )
                    }
                  >
                    Open linked case
                  </button>
                )}
              <button className="text-button" onClick={() => setPage("Cases")}>
                Open related transaction trail →
              </button>
            </div>
          ) : (
            <Empty text="Select a graph node to inspect its provenance." />
          )}
        </Section>
      </div>
    </>
  );
}

function Strategic({
  data,
  setData,
  openCase,
  setPage,
}: {
  data: Dataset;
  setData: (d: Dataset) => void;
  openCase: (id: string) => void;
  setPage: (p: string) => void;
}) {
  const [region, setRegion] = useState("All regions");
  const [category, setCategory] = useState("All categories");
  const regions = Array.from(new Set(data.complaints.map((c) => c.location)));
  const categories = Array.from(
    new Set(data.complaints.map((c) => c.category)),
  );
  const cases = data.cases.filter(
    (c) =>
      (region === "All regions" ||
        data.complaints.some(
          (x) => x.caseId === c.id && x.location === region,
        )) &&
      (category === "All categories" ||
        data.complaints.some(
          (x) => x.caseId === c.id && x.category === category,
        )),
  );
  const multiAccounts = data.accounts.filter(
    (a) =>
      new Set(
        data.transactions
          .filter((t) => t.fromAccountId === a.id || t.toAccountId === a.id)
          .map((t) => t.caseId),
      ).size > 1,
  );
  const pattern = Array.from(new Set(data.warnings.map((w) => w.title)));
  const trend = Array.from(new Set(data.complaints.map((c) => c.location))).map(
    (name) => ({
      name,
      value: data.complaints.filter((c) => c.location === name).length,
    }),
  );
  const geo = Array.from(new Set(data.candidates.map((c) => c.location))).map(
    (name) => ({
      name,
      value: data.candidates
        .filter((c) => c.location === name)
        .reduce((sum, c) => sum + c.riskScore, 0),
    }),
  );
  return (
    <>
      <Header
        title="Strategic Intelligence"
        eyebrow="AGGREGATED SYNTHETIC ANALYSIS"
      />
      <div className="demo-banner">
        <span className="live-dot" />
        Simulated analyst view · aggregates are derived from synthetic records
        and must not be treated as official I4C or bank intelligence.
      </div>
      <div className="strategic-filters">
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option>All regions</option>
          {regions.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          className="button"
          onClick={() => {
            setRegion("All regions");
            setCategory("All categories");
          }}
        >
          Reset filters
        </button>
      </div>
      <div className="metrics">
        <Metric
          label="Filtered cases"
          value={String(cases.length)}
          note="Selected synthetic scope"
          accent="blue"
        />
        <Metric
          label="Multi-case accounts"
          value={String(multiAccounts.length)}
          note="Shared transaction evidence"
          accent="red"
        />
        <Metric
          label="Warnings"
          value={String(data.warnings.length)}
          note="Seeded early-warning records"
          accent="orange"
        />
        <Metric
          label="Recorded outcomes"
          value={String(data.outcomes.length)}
          note="Feedback only, not proof"
          accent="green"
        />
      </div>
      <div className="grid two">
        <Section title="Complaint trend by region">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#38c7da" />
            </BarChart>
          </ResponsiveContainer>
        </Section>
        <Section title="Emerging cross-case patterns">
          <div className="pattern-grid">
            {pattern.map((p, i) => (
              <div className="pattern" key={p}>
                <strong>pattern-{i + 1}</strong>
                <h3>{p}</h3>
                <p>{data.warnings.find((w) => w.title === p)?.signal}</p>
                <small>
                  {data.warnings.find((w) => w.title === p)?.entities} linked
                  entities · synthetic evidence
                </small>
              </div>
            ))}
          </div>
        </Section>
      </div>{" "}
      <Section title="Geographic strategic concentration">
        <MapContainer
          center={[20.5, 78.9]}
          zoom={4}
          style={{ height: 240, marginBottom: 12 }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data.candidates.map((c) => (
            <CircleMarker
              key={c.id}
              center={[c.latitude, c.longitude]}
              radius={Math.max(5, c.riskScore / 15)}
              pathOptions={{ color: c.riskScore >= 80 ? "#ef6d77" : "#f3aa55" }}
            >
              <Popup>
                {c.location} · aggregated synthetic risk {c.riskScore}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        <div className="geo-summary">
          {geo.map((item) => (
            <button
              className="geo-item"
              key={item.name}
              onClick={() => setPage("GIS heatmap")}
            >
              <strong>{item.name}</strong>
              <span>Aggregated risk index {item.value}</span>
              <small>
                Contributing synthetic predicted locations · open GIS map
              </small>
            </button>
          ))}
        </div>
      </Section>
      <Section title={`Cross-case analysis · ${cases.length} cases`}>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Linked cases</th>
              <th>Entities</th>
              <th>Supporting records</th>
              <th>Follow-up</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Shared account activity</strong>
                <small>Observed transaction paths</small>
              </td>
              <td>
                {cases.map((c) => (
                  <button
                    className="text-button"
                    key={c.id}
                    onClick={() => openCase(c.id)}
                  >
                    {c.reference}
                  </button>
                ))}
              </td>
              <td>{multiAccounts.length}</td>
              <td>
                {data.transactions.length} transactions ·{" "}
                {data.relationships.length} relationships
              </td>
              <td>
                <button
                  className="button small"
                  onClick={() => setPage("Network")}
                >
                  Inspect graph
                </button>
              </td>
            </tr>
            {data.patterns.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <small>{p.description}</small>
                </td>
                <td>{cases.length} filtered cases</td>
                <td>{p.affectedDistricts} districts</td>
                <td>{p.confidence}% synthetic confidence</td>
                <td>
                  <Badge tone="green">Monitor</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}

function Generic({
  title,
  eyebrow,
  data,
  type,
  setData,
}: {
  title: string;
  eyebrow: string;
  data: Dataset;
  type: string;
  setData: (d: Dataset) => void;
}) {
  const [done, setDone] = useState(false);
  let content: React.ReactNode;
  if (type === "interventions")
    content = (
      <table>
        <thead>
          <tr>
            <th>Recommendation</th>
            <th>Owner</th>
            <th>Urgency</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.interventions.map((i) => (
            <tr key={i.id}>
              <td>
                <strong>{i.action}</strong>
                <small>Case linked · {i.caseId}</small>
              </td>
              <td>{i.owner}</td>
              <td>
                <PriorityBadge value={i.urgency} />
              </td>
              <td>
                <Badge tone={i.status.toLowerCase().replace(" ", "-")}>
                  {i.status}
                </Badge>
              </td>
              <td>
                <button className="text-button" onClick={() => setDone(true)}>
                  Mark complete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  else if (type === "alerts")
    content = (
      <div className="alert-list">
        {data.alerts.map((a) => (
          <div className="alert-row expanded" key={a.id}>
            <span className={`alert-icon ${a.priority.toLowerCase()}`}>!</span>
            <div>
              <strong>{a.title}</strong>
              <small>
                {a.detail} · {timeAgo(a.createdAt)}
              </small>
            </div>
            <PriorityBadge value={a.priority} />
            {a.acknowledged ? (
              <Badge tone="resolved">Acknowledged</Badge>
            ) : (
              <button
                className="button small"
                onClick={() => setData(acknowledgeAlert(data, a.id))}
              >
                Acknowledge
              </button>
            )}
          </div>
        ))}
      </div>
    );
  else if (type === "strategic")
    content = (
      <div className="pattern-grid">
        {data.patterns.map((p) => (
          <div className="pattern" key={p.id}>
            <span className="pattern-icon">◫</span>
            <strong>{p.name}</strong>
            <p>{p.description}</p>
            <div>
              <Badge tone="green">{p.trend}</Badge>
              <small>
                {p.confidence}% confidence · {p.affectedDistricts} districts
              </small>
            </div>
          </div>
        ))}
      </div>
    );
  else if (type === "alternate")
    content = (
      <table>
        <thead>
          <tr>
            <th>Exit route</th>
            <th>Linked account</th>
            <th>Amount</th>
            <th>Risk</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.alternateExits.map((e) => (
            <tr key={e.id}>
              <td>
                <strong>{e.type}</strong>
                <small>{e.route}</small>
              </td>
              <td>{data.accounts.find((a) => a.id === e.accountId)?.number}</td>
              <td>{money(e.amount)}</td>
              <td>
                <Badge tone="red">{e.riskScore}%</Badge>
              </td>
              <td>
                <Badge>{e.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  else
    content = (
      <div className="placeholder-grid">
        <div className="placeholder-main">
          <div className="big-number">
            {type === "network" ? "1,284" : "13"}
          </div>
          <p>
            {type === "network"
              ? "linked entities across active networks"
              : "signals requiring analyst triage today"}
          </p>
          <div className="progress">
            <i style={{ width: "72%" }} />
          </div>
        </div>
        <div className="placeholder-copy">
          <h3>
            {type === "network"
              ? "Network intelligence"
              : "Early warning signals"}
          </h3>
          <p>
            Explore connected entities, emerging patterns, and explainable
            synthetic signals from the shared demo data service.
          </p>
          <button className="button primary" onClick={() => setDone(true)}>
            Open analyst view
          </button>
        </div>
      </div>
    );
  return (
    <>
      <Header title={title} eyebrow={eyebrow} />
      {done && <div className="toast">✓ Demo action recorded locally</div>}
      <Section
        title={
          type === "alerts"
            ? "Active alerts"
            : type === "strategic"
              ? "Emerging strategic patterns"
              : type === "alternate"
                ? "Alternate exit events"
                : "Operational view"
        }
        action="Refresh"
      >
        {content}
      </Section>
    </>
  );
}

function AuditLog({ data }: { data: Dataset }) {
  return (
    <>
      <Header title="Activity and Audit Log" eyebrow="ACCOUNTABILITY" />
      <div className="demo-banner">
        <span className="live-dot" />
        Synthetic audit events only · no external security or compliance system
        is connected.
      </div>
      <Section title={`Audit events · ${data.audit.length}`}>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {data.audit.map((event) => (
              <tr key={event.id}>
                <td>{new Date(event.createdAt).toLocaleString()}</td>
                <td>{event.actor}</td>
                <td>{event.action}</td>
                <td>{event.target}</td>
                <td>{event.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </>
  );
}
function Reports({ data }: { data: Dataset }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "synthetic-intelligence-report.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <Header title="Reports and Evidence" eyebrow="SYNTHETIC DOSSIERS" />
      <div className="demo-banner">
        <span className="live-dot" />
        Exports contain synthetic demo records only and are not official
        evidence or live intelligence.
      </div>
      <Section title="Available report data">
        <div className="detail-grid">
          <div>
            <small>Cases</small>
            <strong>{data.cases.length}</strong>
          </div>
          <div>
            <small>Predictions</small>
            <strong>{data.predictions.length}</strong>
          </div>
          <div>
            <small>Interventions</small>
            <strong>{data.interventions.length}</strong>
          </div>
          <div>
            <small>Evidence records</small>
            <strong>{data.evidence.length}</strong>
          </div>
        </div>
        <button className="button primary" onClick={exportData}>
          Export synthetic report JSON
        </button>
      </Section>
    </>
  );
}

function Alerts({
  data,
  setData,
  setPage,
  openCase,
}: {
  data: Dataset;
  setData: (d: Dataset) => void;
  setPage: (p: string) => void;
  openCase: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(data.alerts[0]?.id || "");
  const [query, setQuery] = useState("");
  const [ack, setAck] = useState("All");
  const [severity, setSeverity] = useState("All severity");
  const [category, setCategory] = useState("All categories");
  const [reason, setReason] = useState("");
  const [validation, setValidation] = useState("");
  const rows: Alert[] = [
    ...data.alerts,
    ...data.predictions.map((p) => ({
      id: `prediction-${p.id}`,
      title: "Prediction update requires review",
      detail: p.rationale,
      priority: "High" as Priority,
      acknowledged: false,
      caseId: p.caseId,
      category: "Prediction",
      sourceType: "Prediction",
      sourceId: p.id,
      createdAt: p.updatedAt,
      updatedAt: p.updatedAt,
      recommendedNextStep:
        "Review the updated prediction and candidate locations.",
    })),
    ...data.warnings.map((w) => ({
      id: `warning-${w.id}`,
      title: "Proactive warning requires review",
      detail: w.signal,
      priority: w.severity,
      acknowledged: false,
      caseId: w.caseIds?.[0],
      category: "Early warning",
      sourceType: "Warning",
      sourceId: w.id,
      createdAt: w.updatedAt,
      updatedAt: w.updatedAt,
      recommendedNextStep:
        w.recommendation || "Review the warning source records.",
    })),
  ];
  const selected = rows.find((a) => a.id === selectedId);
  const filtered = rows.filter(
    (a) =>
      (severity === "All severity" || a.priority === severity) &&
      (category === "All categories" || a.category === category) &&
      (ack === "All" ||
        (ack === "Acknowledged" ? a.acknowledged : !a.acknowledged)) &&
      `${a.id} ${a.title} ${a.detail}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const save = (
    item: (typeof rows)[number],
    patch: Partial<typeof item>,
    action: string,
  ) => {
    if (
      (patch.status === "Resolved" || patch.status === "Dismissed") &&
      !reason.trim()
    ) {
      setValidation("A reason is required to resolve or dismiss an alert.");
      return;
    }
    const next = addAudit(
      upsertAlert(data, {
        ...item,
        ...patch,
        updatedAt: new Date().toISOString(),
      }),
      {
        actor: "A. Mehta",
        action,
        target: item.id,
        detail: reason || item.detail,
      },
    );
    setData(next);
    setReason("");
    setValidation("");
  };
  return (
    <>
      <Header
        title="Alerts and Notifications"
        eyebrow="CENTRAL NOTIFICATION CENTRE"
      />
      <div className="demo-banner">
        <span className="live-dot" />
        Synthetic notification centre · no SMS, email, or external API requests
        are sent.
      </div>
      <div className="alert-filters">
        <input
          placeholder="Search alert…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option>All severity</option>
          {["Critical", "High", "Medium", "Low"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All categories</option>
          {Array.from(new Set(rows.map((a) => a.category || "Configured"))).map(
            (v) => (
              <option key={v}>{v}</option>
            ),
          )}
        </select>
        <select value={ack} onChange={(e) => setAck(e.target.value)}>
          <option>All</option>
          <option>Unacknowledged</option>
          <option>Acknowledged</option>
        </select>
        <button
          className="button"
          onClick={() => {
            setQuery("");
            setSeverity("All severity");
            setCategory("All categories");
            setAck("All");
          }}
        >
          Reset filters
        </button>
      </div>
      <div className="metrics">
        <Metric
          label="Inbox alerts"
          value={String(rows.length)}
          note="Configured synthetic alerts"
          accent="blue"
        />
        <Metric
          label="Unacknowledged"
          value={String(rows.filter((a) => !a.acknowledged).length)}
          note="Notification centre count"
          accent="orange"
        />
        <Metric
          label="High severity"
          value={String(
            rows.filter((a) => ["Critical", "High"].includes(a.priority))
              .length,
          )}
          note="Triage indicator"
          accent="red"
        />
        <Metric
          label="Unresolved"
          value={String(
            rows.filter(
              (a) => !["Resolved", "Dismissed"].includes(a.status || "New"),
            ).length,
          )}
          note="Lifecycle review"
          accent="purple"
        />
      </div>
      <div className="alert-layout">
        <Section title={`Alert inbox · ${filtered.length}`}>
          <div className="alert-inbox">
            {filtered.map((item) => (
              <button
                className={`alert-card ${selectedId === item.id ? "selected" : ""}`}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span className={`alert-icon ${item.priority.toLowerCase()}`}>
                  !
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {item.id} · {timeAgo(item.createdAt)}
                  </small>
                  <small>{item.detail}</small>
                </div>
                <PriorityBadge value={item.priority} />
                <Badge tone={item.acknowledged ? "resolved" : "orange"}>
                  {item.acknowledged ? "Acknowledged" : "New"}
                </Badge>
              </button>
            ))}
          </div>
        </Section>
        <div>
          {selected ? (
            <Section title="Alert context">
              <div className="alert-detail">
                <div className="detail-title">
                  <div>
                    <strong>{selected.title}</strong>
                    <small>
                      {selected.id} ·{" "}
                      {selected.sourceType || "Configured demo alert"}
                    </small>
                  </div>
                  <PriorityBadge value={selected.priority} />
                </div>
                <div className="factor-box">
                  <strong>Why it was generated</strong>
                  <p>{selected.detail}</p>
                  <strong>Recommended next step</strong>
                  <p>
                    {selected.recommendedNextStep ||
                      "Review the linked synthetic record."}
                  </p>
                  <small>
                    Created {new Date(selected.createdAt).toLocaleString()} ·
                    Case {selected.caseId || "Cross-case"}
                  </small>
                </div>
                <div className="alert-actions">
                  {selected.caseId && (
                    <button
                      className="button"
                      onClick={() => openCase(selected.caseId!)}
                    >
                      Open linked case
                    </button>
                  )}
                  {!selected.acknowledged && (
                    <button
                      className="button primary"
                      onClick={() =>
                        save(
                          selected,
                          { acknowledged: true, status: "Under review" },
                          "Alert acknowledged",
                        )
                      }
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    className="button"
                    onClick={() =>
                      save(selected, { status: "Escalated" }, "Alert escalated")
                    }
                  >
                    Escalate
                  </button>
                  <button
                    className="button"
                    onClick={() =>
                      save(selected, { status: "Resolved" }, "Alert resolved")
                    }
                  >
                    Resolve
                  </button>
                </div>{" "}
                <input
                  placeholder="Internal reason or note"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {validation && (
                  <div className="validation-message">{validation}</div>
                )}
                {(selected.reviewHistory || []).map((r) => (
                  <div className="timeline" key={r.id}>
                    <b>{r.action}</b>
                    <small>
                      {r.actor} · {r.reason || "No reason supplied"}
                    </small>
                  </div>
                ))}
              </div>
            </Section>
          ) : (
            <Empty text="Select an alert to inspect its context." />
          )}
        </div>
      </div>
    </>
  );
}

export function App() {
  const routePage = (pathname: string) =>
    pathname.startsWith("/overview")
      ? "Overview"
      : pathname.startsWith("/cases/")
        ? "Workspace"
        : pathname.startsWith("/cases")
          ? "Cases"
        : pathname.startsWith("/investigations")
          ? "Workspace"
          : pathname.startsWith("/predictions")
            ? "Predictive cash-out"
            : pathname.startsWith("/map")
              ? "GIS heatmap"
              : pathname.startsWith("/interventions")
                ? "Interventions"
                : pathname.startsWith("/warnings")
                  ? "Suo-motu"
                  : pathname.startsWith("/adaptive-intelligence")
                    ? "Alternate exits"
                    : pathname.startsWith("/alerts")
                      ? "Alerts"
                      : pathname.startsWith("/network")
                        ? "Network"
                        : pathname.startsWith("/strategic-intelligence")
                          ? "Strategic"
                          : pathname.startsWith("/reports")
                            ? "Reports"
                            : pathname.startsWith("/audit")
                              ? "Audit log"
                              : pathname.startsWith("/settings")
                                ? "Settings"
                                : "Overview";
  const routePath = (next: string) =>
    ({
      Overview: "/overview",
      Cases: "/cases",
      Workspace: "/investigations/case-001",
      "Predictive cash-out": "/predictions",
      "GIS heatmap": "/map",
      Interventions: "/interventions",
      "Suo-motu": "/warnings",
      "Alternate exits": "/adaptive-intelligence",
      Alerts: "/alerts",
      Network: "/network",
      Strategic: "/strategic-intelligence",
      Reports: "/reports",
      "Audit log": "/audit",
      Settings: "/settings",
    })[next] || "/overview";
  const [page, setPageState] = useState(() => routePage(window.location.pathname));
  const [data, setData] = useState<Dataset>(() => loadData());
  const [selectedCaseId, setSelectedCaseId] = useState(
    () => window.location.pathname.match(/(?:cases|investigations)\/([^/]+)/)?.[1] || "case-001",
  );
  const setPage = (next: string) => {
    setPageState(next);
    if (window.location.pathname !== routePath(next)) window.history.pushState({}, "", routePath(next));
  };
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    localStorage.getItem("sentinel-theme") === "light" ? "light" : "dark",
  );
  const openCase = (id: string) => {
    setSelectedCaseId(id);
    setPageState("Workspace");
    window.history.pushState({}, "", `/investigations/${encodeURIComponent(id)}`);
  };
  useEffect(() => {
    const onPop = () => {
      setPageState(routePage(window.location.pathname));
      const match = window.location.pathname.match(/(?:cases|investigations)\/([^/]+)/);
      if (match) setSelectedCaseId(decodeURIComponent(match[1]));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    localStorage.setItem("sentinel-theme", theme);
  }, [theme]);
  const current = nav.find((x) => x[0] === page)!;
  const view =
    page === "Overview" ? (
      <Overview
        data={data}
        setData={setData}
        setPage={setPage}
        openCase={openCase}
      />
    ) : page === "Cases" ? (
      <Cases
        data={data}
        setData={setData}
        setPage={setPage}
        openCase={openCase}
      />
    ) : page === "Predictive cash-out" ? (
      <Predictive data={data} setPage={setPage} openCase={openCase} />
    ) : page === "GIS heatmap" ? (
      <Heatmap data={data} setPage={setPage} openCase={openCase} />
    ) : page === "Workspace" ? (
      <Workspace
        data={data}
        setData={setData}
        caseId={selectedCaseId}
        setPage={setPage}
      />
    ) : page === "Interventions" ? (
      <Interventions
        data={data}
        setData={setData}
        setPage={setPage}
        openCase={openCase}
      />
    ) : page === "Suo-motu" ? (
      <Proactive
        data={data}
        setData={setData}
        setPage={setPage}
        openCase={openCase}
      />
    ) : page === "Alternate exits" ? (
      <AlternateExits
        data={data}
        setData={setData}
        setPage={setPage}
        openCase={openCase}
      />
    ) : page === "Alerts" ? (
      <Alerts
        data={data}
        setData={setData}
        setPage={setPage}
        openCase={openCase}
      />
    ) : page === "Strategic" ? (
      <Strategic
        data={data}
        setData={setData}
        setPage={setPage}
        openCase={openCase}
      />
    ) : page === "Network" ? (
      <Network data={data} setPage={setPage} openCase={openCase} />
    ) : page === "Audit log" ? (
      <AuditLog data={data} />
    ) : page === "Reports" ? (
      <Reports data={data} />
    ) : page === "Settings" ? (
      <>
        <Header title={current[1]} eyebrow="DEMO CONTROLS" />
        <Section title="Synthetic environment">
          <div className="settings">
            <div>
              <strong>Environment status</strong>
              <p>
                All records are synthetic and stored in this browser only. No
                backend or live data source is connected.
              </p>
            </div>
            <Badge tone="green">Synthetic Data Demo</Badge>
            <button
              className="button danger"
              onClick={() => setData(resetDemo())}
            >
              Reset demo data
            </button>
          </div>
        </Section>
      </>
    ) : (
      <Generic
        title={current[1]}
        eyebrow="INTELLIGENCE CONSOLE"
        data={data}
        type="network"
        setData={setData}
      />
    );
  return (
    <div className="app" data-theme={theme}>
      <aside>
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>SENTINEL</strong>
            <small>FRAUD INTELLIGENCE</small>
          </div>
        </div>
        <div className="demo-tag">
          <span className="live-dot" />
          SYNTHETIC DATA DEMO
        </div>
        <nav>
          {nav.map(([id, label, icon]) => (
            <button
              className={page === id ? "active" : ""}
              key={id}
              onClick={() => setPage(id)}
            >
              <span>{icon}</span>
              {label}
              {id === "Alerts" && <b>2</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">AM</div>
          <div>
            <strong>A. Mehta</strong>
            <small>I4C Fusion Cell</small>
          </div>
          <span>⌄</span>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <div className="crumb">
            SENTINEL <span>/</span> {current[1].toUpperCase()}
          </div>
          <div className="top-actions">
            <span className="secure">
              <i /> Secure workspace
            </span>
            <button
              className="theme-toggle"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "☼" : "☾"}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <button aria-label="Search" title="Search">
              ⌕
            </button>
            <button aria-label="Notifications" title="Notifications">
              ◌
            </button>
          </div>
        </div>
        <div className="content">{view}</div>
      </main>
    </div>
  );
}
