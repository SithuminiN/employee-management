export type EmployeeStatus = "Active" | "On leave" | "Inactive";

export type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: EmployeeStatus;
  joinedAt: string;
};

export type EmployeeInput = Omit<Employee, "id" | "joinedAt">;

const storageKey = "peopleboard-employees";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export const demoEmployees: Employee[] = [
  { id: "EMP-1042", name: "Amaya Perera", email: "amaya.perera@northstar.io", phone: "+94 77 234 8190", department: "Design", position: "Product Designer", status: "Active", joinedAt: "2024-03-18" },
  { id: "EMP-1038", name: "Kavindu Silva", email: "kavindu.silva@northstar.io", phone: "+94 71 582 4301", department: "Engineering", position: "Frontend Engineer", status: "Active", joinedAt: "2023-11-06" },
  { id: "EMP-1035", name: "Hiruni Fernando", email: "hiruni.fernando@northstar.io", phone: "+94 76 918 2754", department: "People", position: "People Partner", status: "On leave", joinedAt: "2023-08-21" },
  { id: "EMP-1029", name: "Dilan Jayawardena", email: "dilan.j@northstar.io", phone: "+94 70 345 6812", department: "Marketing", position: "Growth Manager", status: "Active", joinedAt: "2023-04-12" },
  { id: "EMP-1026", name: "Nethmi de Silva", email: "nethmi.desilva@northstar.io", phone: "+94 75 024 1998", department: "Engineering", position: "Backend Engineer", status: "Active", joinedAt: "2023-02-27" },
  { id: "EMP-1019", name: "Ravindu Peris", email: "ravindu.peris@northstar.io", phone: "+94 77 802 6643", department: "Finance", position: "Financial Analyst", status: "Inactive", joinedAt: "2022-10-03" },
  { id: "EMP-1014", name: "Sanjana Wickramasinghe", email: "sanjana.w@northstar.io", phone: "+94 72 347 1150", department: "Design", position: "Visual Designer", status: "Active", joinedAt: "2022-06-14" },
  { id: "EMP-1008", name: "Tharushi Gunasekara", email: "tharushi.g@northstar.io", phone: "+94 76 410 9382", department: "Operations", position: "Operations Lead", status: "Active", joinedAt: "2022-01-10" },
];

function endpoint(id?: string) {
  return `${apiBaseUrl}/api/employees${id ? `/${encodeURIComponent(id)}` : ""}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}). Please try again.`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function unwrap(value: Employee[] | { data: Employee[] }): Employee[] {
  return Array.isArray(value) ? value : value.data;
}

function readLocal(): Employee[] {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    window.localStorage.setItem(storageKey, JSON.stringify(demoEmployees));
    return demoEmployees;
  }
  return JSON.parse(saved) as Employee[];
}

function writeLocal(employees: Employee[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(employees));
}

export async function getEmployees(): Promise<Employee[]> {
  if (apiBaseUrl) return unwrap(await request<Employee[] | { data: Employee[] }>(endpoint(), { cache: "no-store" }));
  return readLocal();
}

export async function getEmployee(id: string): Promise<Employee> {
  if (apiBaseUrl) {
    const result = await request<Employee | { data: Employee }>(endpoint(id), { cache: "no-store" });
    return "data" in result ? result.data : result;
  }
  const employee = readLocal().find((item) => item.id === id);
  if (!employee) throw new Error("This employee could not be found.");
  return employee;
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  if (apiBaseUrl) return request<Employee>(endpoint(), { method: "POST", body: JSON.stringify(input) });
  const employees = readLocal();
  const nextId = Math.max(1000, ...employees.map(({ id }) => Number(id.replace("EMP-", "")) || 0)) + 1;
  const employee: Employee = { ...input, id: `EMP-${nextId}`, joinedAt: new Date().toISOString().slice(0, 10) };
  writeLocal([employee, ...employees]);
  return employee;
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
  if (apiBaseUrl) return request<Employee>(endpoint(id), { method: "PUT", body: JSON.stringify(input) });
  const employees = readLocal();
  const current = employees.find((employee) => employee.id === id);
  if (!current) throw new Error("This employee could not be found.");
  const updated = { ...current, ...input };
  writeLocal(employees.map((employee) => employee.id === id ? updated : employee));
  return updated;
}

export async function deleteEmployee(id: string): Promise<void> {
  if (apiBaseUrl) return request<void>(endpoint(id), { method: "DELETE" });
  writeLocal(readLocal().filter((employee) => employee.id !== id));
}