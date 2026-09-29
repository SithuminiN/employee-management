"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, CircleAlert, Clock3, Eye, Filter, LayoutDashboard, Mail, Menu, MoreHorizontal, Pencil, Phone, Plus, Search, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import { createEmployee, deleteEmployee, getEmployee, getEmployees, updateEmployee, type Employee, type EmployeeInput, type EmployeeStatus } from "@/lib/employees";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table } from "@/components/ui/table";

type View = "dashboard" | "employees";
const emptyForm: EmployeeInput = { name: "", email: "", phone: "", department: "Engineering", position: "", status: "Active" };
const departments = ["Engineering", "Design", "People", "Marketing", "Finance", "Operations"];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={`avatar avatar-${initials(name).charCodeAt(0) % 5}${large ? " avatar-large" : ""}`}>{initials(name)}</span>;
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  return <span className={`status-badge status-${status.toLowerCase().replace(" ", "-")}`}><span />{status}</span>;
}

function EmployeeForm({ initial, saving, onCancel, onSubmit }: { initial: EmployeeInput; saving: boolean; onCancel: () => void; onSubmit: (input: EmployeeInput) => Promise<void> }) {
  const [form, setForm] = useState(initial);
  function update<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(form);
  }
  return <form onSubmit={submit} className="employee-form">
    <div className="form-grid">
      <label className="field field-wide">Full name<Input autoFocus required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Amaya Perera" /></label>
      <label className="field">Email address<Input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="name@company.com" /></label>
      <label className="field">Phone number<Input required type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+94 77 123 4567" /></label>
      <div className="field"><span>Department</span><Select value={form.department} onValueChange={(value) => update("department", value)}><SelectTrigger aria-label="Department"><span>{form.department}</span></SelectTrigger><SelectContent>{departments.map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}</SelectContent></Select></div>
      <label className="field">Position<Input required value={form.position} onChange={(event) => update("position", event.target.value)} placeholder="e.g. Product Designer" /></label>
      <div className="field field-wide"><span>Status</span><Select value={form.status} onValueChange={(value) => update("status", value as EmployeeStatus)}><SelectTrigger aria-label="Status"><span>{form.status}</span></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="On leave">On leave</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
    </div>
    <div className="dialog-actions"><Button type="button" className="button button-secondary" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : <><Check size={16} /> Save employee</>}</Button></div>
  </form>;
}

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [view, setView] = useState<View>("dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All departments");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [details, setDetails] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function loadEmployees() {
    setLoading(true);
    setError("");
    try { setEmployees(await getEmployees()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load employees."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let cancelled = false;
    getEmployees()
      .then((result) => { if (!cancelled) setEmployees(result); })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load employees."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const activeCount = employees.filter((employee) => employee.status === "Active").length;
  const departmentCount = new Set(employees.map((employee) => employee.department)).size;
  const onLeaveCount = employees.filter((employee) => employee.status === "On leave").length;
  const visibleEmployees = useMemo(() => employees.filter((employee) => {
    const matchesQuery = `${employee.name} ${employee.email} ${employee.position} ${employee.department}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (departmentFilter === "All departments" || employee.department === departmentFilter) && (statusFilter === "All statuses" || employee.status === statusFilter);
  }), [employees, query, departmentFilter, statusFilter]);
  const distribution = departments.map((department) => ({ department, count: employees.filter((employee) => employee.department === department).length })).filter(({ count }) => count > 0).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...distribution.map(({ count }) => count));

  function openAdd() { setEditing(null); setFormOpen(true); }
  function edit(employee: Employee) { setEditing(employee); setFormOpen(true); setDetails(null); }
  async function openDetails(employee: Employee) {
    setDetails(employee);
    try { setDetails(await getEmployee(employee.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load this employee."); }
  }

  async function save(input: EmployeeInput) {
    setSaving(true); setError("");
    try {
      if (editing) {
        const updated = await updateEmployee(editing.id, input);
        setEmployees((current) => current.map((employee) => employee.id === updated.id ? updated : employee));
        setNotice(`${updated.name}'s details have been updated.`);
      } else {
        const created = await createEmployee(input);
        setEmployees((current) => [created, ...current]);
        setNotice(`${created.name} has been added to the team.`);
      }
      setFormOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this employee."); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteEmployee(deleteTarget.id);
      setEmployees((current) => current.filter((employee) => employee.id !== deleteTarget.id));
      setNotice(`${deleteTarget.name} has been removed.`);
      setDeleteTarget(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete this employee."); setDeleteTarget(null); }
    finally { setSaving(false); }
  }

  const table = <div className="table-wrap"><Table>
    <thead><tr><th>Employee</th><th>Department</th><th>Position</th><th>Status</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead>
    <tbody>{visibleEmployees.map((employee) => <tr key={employee.id}>
      <td><button className="employee-cell" onClick={() => void openDetails(employee)}><Avatar name={employee.name} /><span><strong>{employee.name}</strong><small>{employee.email}</small></span></button></td>
      <td><span className="department-label"><i />{employee.department}</span></td><td className="position-cell">{employee.position}</td><td><StatusBadge status={employee.status} /></td><td className="date-cell">{dateLabel(employee.joinedAt)}</td>
      <td><div className="row-actions"><button className="icon-button" title="View details" aria-label={`View ${employee.name}`} onClick={() => void openDetails(employee)}><Eye size={16} /></button><button className="icon-button" title="Edit employee" aria-label={`Edit ${employee.name}`} onClick={() => edit(employee)}><Pencil size={16} /></button><button className="icon-button danger-hover" title="Delete employee" aria-label={`Delete ${employee.name}`} onClick={() => setDeleteTarget(employee)}><Trash2 size={16} /></button></div></td>
    </tr>)}</tbody>
  </Table>
  {loading && <div className="loading-state"><span className="spinner" />Loading your team…</div>}
  {!loading && visibleEmployees.length === 0 && <div className="empty-state"><span className="empty-icon"><UsersRound size={22} /></span><strong>{employees.length ? "No matching employees" : "Your team is ready to grow"}</strong><p>{employees.length ? "Try changing your search or filters." : "Add your first employee to get the directory started."}</p>{!employees.length && <button className="button button-primary" onClick={openAdd}><Plus size={16} /> Add employee</button>}</div>}
  </div>;

  return <div className="app-shell">
    {mobileMenuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
    <aside className={`sidebar${mobileMenuOpen ? " sidebar-open" : ""}`}>
      <div className="brand-lockup"><span className="brand-mark"><i /><i /><i /><i /></span><span>northstar<span className="brand-dot">.</span></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation"><button className={`nav-link${view === "dashboard" ? " nav-active" : ""}`} onClick={() => { setView("dashboard"); setMobileMenuOpen(false); }}><LayoutDashboard size={18} />Overview</button><button className={`nav-link${view === "employees" ? " nav-active" : ""}`} onClick={() => { setView("employees"); setMobileMenuOpen(false); }}><UsersRound size={18} />Employees<span className="nav-count">{employees.length}</span></button></nav>
      <div className="sidebar-bottom"><div className="sidebar-divider" /><button className="nav-link"><BriefcaseBusiness size={18} />Departments</button><button className="nav-link"><MoreHorizontal size={18} />More</button><div className="sidebar-profile"><Avatar name="Maya Perera" /><span><strong>Maya Perera</strong><small>Workspace admin</small></span><ChevronDown size={15} /></div></div>
    </aside>

    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button><div className="breadcrumb">Workspace <span>/</span> <strong>{view === "dashboard" ? "Overview" : "Employees"}</strong></div></div><div className="topbar-actions"><span className="today-label"><CalendarDays size={15} /> Monday, September 28</span><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button><span className="topbar-divider" /><Avatar name="Maya Perera" /></div></header>
      <div className="page-content">
        {error && <div className="alert-banner" role="alert"><CircleAlert size={17} /><span>{error}</span><button className="alert-retry" onClick={() => void loadEmployees()}>Try again</button><button className="icon-button" aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
        {notice && <div className="notice-banner" role="status"><Check size={16} /><span>{notice}</span><button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16} /></button></div>}
        {view === "dashboard" ? <>
          <section className="page-heading"><div><div className="eyebrow"><span /> PEOPLE OVERVIEW</div><h1>Good morning, Maya <span className="heading-sparkle">✳</span></h1><p>Here&apos;s what&apos;s happening with your team today.</p></div><button className="button button-primary" onClick={openAdd}><Plus size={17} /> Add employee</button></section>
          <section className="stat-grid" aria-label="Team summary">
            <article className="stat-card"><div className="stat-top"><span className="stat-icon stat-icon-green"><UsersRound size={18} /></span><span className="stat-trend"><ArrowUpRight size={14} /> 12%</span></div><div className="stat-number">{loading ? "—" : employees.length}</div><div className="stat-label">Total employees</div><div className="stat-foot">Compared to last quarter</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon stat-icon-yellow"><BriefcaseBusiness size={18} /></span><span className="stat-period">Across the company</span></div><div className="stat-number">{loading ? "—" : departmentCount}</div><div className="stat-label">Departments</div><div className="stat-foot">Teams working together</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon stat-icon-blue"><UserPlus size={18} /></span><span className="stat-trend"><ArrowUpRight size={14} /> 2 this month</span></div><div className="stat-number">{loading ? "—" : activeCount}</div><div className="stat-label">Active members</div><div className="stat-foot">{employees.length ? Math.round(activeCount / employees.length * 100) : 0}% of your workforce</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon stat-icon-coral"><Clock3 size={18} /></span><span className="stat-period">Currently away</span></div><div className="stat-number">{loading ? "—" : onLeaveCount}</div><div className="stat-label">On leave</div><div className="stat-foot">Back soon, refreshed later</div></article>
          </section>
          <section className="dashboard-panels">
            <article className="panel dashboard-panel"><div className="panel-heading"><div><span className="panel-kicker">YOUR ORGANIZATION</span><h2>Team distribution</h2></div><button className="text-button" onClick={() => setView("employees")}>View all <ArrowUpRight size={15} /></button></div>
              {loading ? <div className="loading-state"><span className="spinner" />Loading departments…</div> : distribution.length === 0 ? <div className="compact-empty">Add employees to see your team distribution.</div> : <div className="department-list">{distribution.slice(0, 5).map(({ department, count }, index) => <div className="department-row" key={department}><div className="department-row-label"><span className={`department-dot department-dot-${index % 5}`} />{department}<strong>{count}</strong></div><div className="bar-track"><span className={`bar-fill bar-fill-${index % 5}`} style={{ width: `${Math.max(8, count / maxCount * 100)}%` }} /></div></div>)}</div>}
              <div className="panel-footer"><span><i className="live-dot" />Live headcount</span><span>{employees.length} people</span></div>
            </article>
            <article className="panel dashboard-panel"><div className="panel-heading"><div><span className="panel-kicker">FRESH FACES</span><h2>Recently joined</h2></div><button className="icon-button" aria-label="More recently joined options"><MoreHorizontal size={19} /></button></div>
              {loading ? <div className="loading-state"><span className="spinner" />Loading people…</div> : employees.length === 0 ? <div className="compact-empty">New teammates will show up here.</div> : <div className="newcomer-list">{[...employees].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)).slice(0, 3).map((employee) => <button className="newcomer-row" key={employee.id} onClick={() => void openDetails(employee)}><Avatar name={employee.name} /><span className="newcomer-copy"><strong>{employee.name}</strong><small>{employee.position}</small></span><span className="newcomer-date">{dateLabel(employee.joinedAt).split(",")[0]}</span></button>)}</div>}
              <div className="panel-footer"><span>Welcome to the team</span><span className="footer-heart">♥</span></div>
            </article>
          </section>
          <section className="panel recent-panel"><div className="panel-heading"><div><span className="panel-kicker">THE PEOPLE BEHIND THE WORK</span><h2>Team directory</h2></div><button className="text-button" onClick={() => setView("employees")}>See all employees <ArrowUpRight size={15} /></button></div>{table}</section>
        </> : <>
          <section className="page-heading"><div><div className="eyebrow"><span /> PEOPLE OPERATIONS</div><h1>Employees</h1><p>Everyone on your team, all in one place.</p></div><button className="button button-primary" onClick={openAdd}><Plus size={17} /> Add employee</button></section>
          <Card className="panel directory-panel"><div className="directory-toolbar"><div><span className="panel-kicker">DIRECTORY</span><h2>All employees <span className="title-count">{employees.length}</span></h2></div><div className="toolbar-controls"><label className="search-field"><Search size={17} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people…" aria-label="Search employees" />{query && <button aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}</label><div className="filter-select"><Filter size={15} /><Select value={departmentFilter} onValueChange={setDepartmentFilter}><SelectTrigger aria-label="Filter by department"><span>{departmentFilter}</span></SelectTrigger><SelectContent><SelectItem value="All departments">All departments</SelectItem>{departments.map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}</SelectContent></Select></div><div className="filter-select status-filter"><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger aria-label="Filter by status"><span>{statusFilter}</span></SelectTrigger><SelectContent><SelectItem value="All statuses">All statuses</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="On leave">On leave</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div></div></div>{table}<div className="directory-footer"><span>Showing <strong>{visibleEmployees.length ? `1–${visibleEmployees.length}` : "0"}</strong> of <strong>{employees.length}</strong> employees</span><span>Updated just now</span></div></Card>
          <div className="directory-note"><span className="note-mark">i</span>Employee details are visible to workspace administrators.</div>
        </>}
        <footer className="page-footer"><span>Northstar People <i>·</i> Internal directory</span><span>Made for teams that move forward <b>✳</b></span></footer>
      </div>
    </main>

    <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="dialog form-dialog" aria-labelledby="form-title"><header className="dialog-header"><div><span className="dialog-icon"><UserPlus size={18} /></span><div><span className="panel-kicker">TEAM DIRECTORY</span><h2 id="form-title">{editing ? "Edit employee" : "Add a teammate"}</h2></div></div><button className="icon-button" aria-label="Close dialog" onClick={() => setFormOpen(false)}><X size={18} /></button></header><p className="dialog-description">{editing ? "Keep this employee's information up to date." : "Add someone new to your Northstar workspace."}</p><EmployeeForm key={editing?.id ?? "new"} initial={editing ?? emptyForm} saving={saving} onCancel={() => setFormOpen(false)} onSubmit={save} /></DialogContent></Dialog>

    <Dialog open={Boolean(details)} onOpenChange={(open) => { if (!open) setDetails(null); }}><DialogContent className="dialog details-dialog" aria-labelledby="details-title"><header className="dialog-header"><span className="panel-kicker">EMPLOYEE PROFILE</span><button className="icon-button" aria-label="Close details" onClick={() => setDetails(null)}><X size={18} /></button></header>{details && <><div className="profile-hero"><Avatar name={details.name} large /><h2 id="details-title">{details.name}</h2><p>{details.position}</p><StatusBadge status={details.status} /></div><div className="profile-details"><div><Mail size={17} /><span><small>Email address</small><a href={`mailto:${details.email}`}>{details.email}</a></span></div><div><Phone size={17} /><span><small>Phone number</small><a href={`tel:${details.phone}`}>{details.phone}</a></span></div><div><BriefcaseBusiness size={17} /><span><small>Department</small><strong>{details.department}</strong></span></div><div><CalendarDays size={17} /><span><small>Joined</small><strong>{dateLabel(details.joinedAt)}</strong></span></div></div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setDetails(null)}>Close</button><button className="button button-primary" onClick={() => edit(details)}><Pencil size={15} /> Edit profile</button></div></>}</DialogContent></Dialog>

    <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><DialogContent className="dialog confirm-dialog" aria-labelledby="delete-title">{deleteTarget && <><span className="confirm-icon"><Trash2 size={20} /></span><h2 id="delete-title">Remove {deleteTarget.name}?</h2><p>This will permanently remove this employee from your directory. This action can&apos;t be undone.</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setDeleteTarget(null)}>Keep employee</button><button className="button button-danger" disabled={saving} onClick={() => void confirmDelete()}>{saving ? "Removing…" : <><Trash2 size={15} /> Remove</>}</button></div></>}</DialogContent></Dialog>
  </div>;
}
