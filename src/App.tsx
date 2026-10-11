import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

type Page = "home" | "dashboard" | "schedule" | "reports"
type Status = "Pending" | "Approved" | "Confirmed" | "Cancelled"

type User = {
  id: string
  name: string
  email: string
  password: string
  course: string
  role?: "student" | "staff"
}

type Appointment = {
  id: string
  student: string
  studentId: string
  course: string
  date: string
  time: string
  status: Status
  createdAt: string
}

type SaveResult = "saved" | "conflict" | "past" | "error"

type StorageResult = string | { value?: string } | null
type MakeStorage = {
  get: (key: string, shared?: boolean) => Promise<StorageResult>
  set: (key: string, value: string, shared?: boolean) => Promise<void>
  delete?: (key: string, shared?: boolean) => Promise<void>
}

declare global {
  interface Window {
    storage?: MakeStorage
  }
}

const USERS_KEY = "users"
const SESSION_KEY = "session"
const APPOINTMENTS_KEY = "appointments-list"
const TIMES = ["9:00 AM", "10:30 AM", "1:00 PM", "2:30 PM"]
const SAVE_MESSAGES: Record<SaveResult, string> = {
  saved: "Appointment booked successfully.",
  conflict: "That time slot is already booked. Please choose another.",
  past: "Appointments can't be booked for a past date.",
  error: "We couldn't save your appointment. Please try again.",
}
const seedUsers: User[] = [
  {
    id: "STAFF-001",
    name: "Registrar Office",
    email: "registrar@sjc.edu.ph",
    password: "staff123",
    course: "Registrar's Office",
    role: "staff",
  },
  {
    id: "2026-001",
    name: "Prince Sinforoso",
    email: "prince@sjc.edu.ph",
    password: "student123",
    course: "BS Computer Science",
  },
  {
    id: "2026-002",
    name: "Mark Caluscusao",
    email: "mark@sjc.edu.ph",
    password: "student123",
    course: "BS Information Technology",
  },
  {
    id: "2026-003",
    name: "Jamaica Maglalang",
    email: "jamaica@sjc.edu.ph",
    password: "student123",
    course: "BS Education",
  },
]

const storage = {
  async read<T,>(key: string, shared: boolean, fallback: T): Promise<T> {
    try {
      const result = window.storage
        ? await window.storage.get(key, shared)
        : localStorage.getItem(`${shared ? "shared" : "private"}:${key}`)
      if (result == null) return fallback
      const value = typeof result === "string" ? result : result.value
      return value ? JSON.parse(value) as T : fallback
    } catch (error) {
      console.error(`Unable to read ${key}`, error)
      return fallback
    }
  },
  async write<T,>(key: string, value: T, shared: boolean) {
    try {
      if (window.storage) {
        await window.storage.set(key, JSON.stringify(value), shared)
      } else {
        localStorage.setItem(
          `${shared ? "shared" : "private"}:${key}`,
          JSON.stringify(value),
        )
      }
      return true
    } catch (error) {
      console.error(`Unable to save ${key}`, error)
      return false
    }
  },
  async clear(key: string, shared: boolean) {
    try {
      if (window.storage?.delete) await window.storage.delete(key, shared)
      else if (window.storage)
        await window.storage.set(key, JSON.stringify(null), shared)
      else localStorage.removeItem(`${shared ? "shared" : "private"}:${key}`)
      return true
    } catch (error) {
      console.error(`Unable to clear ${key}`, error)
      return false
    }
  },
}

function Button({
  children,
  className = "",
  type = "button",
  onClick,
  disabled,
  title,
}: {
  children: ReactNode
  className?: string
  type?: "button" | "submit"
  onClick?: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      className={`button ${className}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ""}`} />
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`input select ${props.className ?? ""}`} />
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <Button className="icon-button" onClick={onClose} title="Close">
            ×
          </Button>
        </div>
        {children}
      </section>
    </div>
  )
}

function Login({
  users,
  onLogin,
}: {
  users: User[]
  onLogin: (user: User) => Promise<void>
}) {
  const [identity, setIdentity] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [forgotOpen, setForgotOpen] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!identity.trim() || !password) {
      setError("Enter your student ID or email and password.")
      return
    }
    const match = users.find(
      (user) =>
        (user.id.toLowerCase() === identity.trim().toLowerCase() ||
          user.email.toLowerCase() === identity.trim().toLowerCase()) &&
        user.password === password,
    )
    if (!match) {
      setError("The student ID, email, or password is incorrect.")
      return
    }
    setError("")
    await onLogin(match)
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="St. Jude College campus">
        <div className="campus-brand">
          <img src="/assets/94cab.png" alt="St. Jude College seal" />
          <div>
            <strong>St. Jude College</strong>
            <span>
              Carlos Trinidad Avenue, Salitran IV, City of Dasmariñas, Cavite
            </span>
          </div>
        </div>
      </section>
      <section className="login-content">
        <div className="login-heading">
          <h1>Student Appointment</h1>
          <h2>Scheduling System</h2>
          <p>Manage appointments, schedules, and records.</p>
        </div>
        <form className="login-card" onSubmit={submit}>
          <h2>Welcome</h2>
          <p>Sign in to continue to your account.</p>
          <label>
            Student ID or Student Email
            <TextInput
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              placeholder="Enter your ID or email"
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <TextInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              type="password"
              autoComplete="current-password"
            />
          </label>
          <Button
            className="text-button forgot"
            onClick={() => setForgotOpen(true)}
          >
            Forgot password?
          </Button>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <Button type="submit" className="primary login-submit">
            Sign In
          </Button>
          <small>Demo student: 2026-001 / student123 · Staff: STAFF-001 / staff123</small>
          <span className="phinma">PHINMA Education</span>
        </form>
      </section>
      {forgotOpen && (
        <Modal title="Forgot password?" onClose={() => setForgotOpen(false)}>
          <p className="modal-copy">
            Please contact the Registrar or Student Services office to reset
            your account password.
          </p>
          <Button className="primary full" onClick={() => setForgotOpen(false)}>
            Got it
          </Button>
        </Modal>
      )}
    </main>
  )
}

function Sidebar({
  page,
  setPage,
  logout,
}: {
  page: Page
  setPage: (page: Page) => void
  logout: () => void
}) {
  const items: { id: Page; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "dashboard", label: "Dashboard" },
    { id: "schedule", label: "Schedule" },
    { id: "reports", label: "Reports" },
  ]
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/assets/35157.png" alt="St. Jude College seal" />
        <div>
          <strong>St. Jude College</strong>
          <span>
            Student Appointment
            <br />
            Scheduling System
          </span>
        </div>
      </div>
      <nav aria-label="Main navigation">
        {items.map((item) => (
          <Button
            key={item.id}
            className={`nav-button ${page === item.id ? "active" : ""}`}
            onClick={() => setPage(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </nav>
      <Button className="nav-button logout" onClick={logout}>
        Logout
      </Button>
    </aside>
  )
}

function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </header>
  )
}

function Home({
  user,
  navigate,
  openNew,
}: {
  user: User
  navigate: (page: Page) => void
  openNew: () => void
}) {
  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Manage your student appointments and schedules."
      />
      <section className="hero-card">
        <span className="eyebrow">WELCOME</span>
        <h2>
          Student Appointment
          <br />
          Scheduling System
        </h2>
        <p>Create and manage appointments in one place.</p>
      </section>
      <Button className="primary new-appointment" onClick={openNew}>
        + New Appointment
      </Button>
      <section className="link-grid">
        {([
          [
            "dashboard",
            "Dashboard",
            "View appointment overview and statistics.",
          ],
          ["schedule", "Schedule", "View and manage appointment schedules."],
          ["reports", "Reports", "View, search, and print records."],
        ] as const).map(([id, title, copy]) => (
          <Button className="link-card" key={id} onClick={() => navigate(id)}>
            <strong>{title}</strong>
            <span>{copy}</span>
            <i>View page →</i>
          </Button>
        ))}
      </section>
    </>
  )
}

function Dashboard({ appointments }: { appointments: Appointment[] }) {
  const summary = [
    ["Total Appointments", appointments.length, "all"],
    [
      "Pending",
      appointments.filter((item) => item.status === "Pending").length,
      "pending",
    ],
    [
      "Approved",
      appointments.filter((item) => item.status === "Approved").length,
      "approved",
    ],
    [
      "Confirmed",
      appointments.filter((item) => item.status === "Confirmed").length,
      "confirmed",
    ],
  ]
  const upcoming = [...appointments]
    .filter((item) => item.status !== "Cancelled" && item.date >= todayKey())
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 5)
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="A live overview of all shared appointments."
      />
      <section className="summary-grid">
        {summary.map(([label, value, tone]) => (
          <article className={`summary-card ${tone}`} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Upcoming appointments</h2>
            <p>Next bookings across all students.</p>
          </div>
        </div>
        {upcoming.length ? (
          <div className="appointment-list">
            {upcoming.map((item) => (
              <div key={item.id}>
                <span className="date-block">
                  {formatDate(item.date)}
                  <small>{item.time}</small>
                </span>
                <strong>{item.student}</strong>
                <span>{item.course}</span>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No appointments yet"
            copy="Create an appointment from Home or Schedule to see it here."
          />
        )}
      </section>
    </>
  )
}

function todayKey() {
  const now = new Date()
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate())
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function formatDate(value: string) {
  if (!value) return "—"
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function Schedule({
  user,
  appointments,
  saveAppointment,
  openNew,
}: {
  user: User
  appointments: Appointment[]
  saveAppointment: (appointment: Appointment) => Promise<SaveResult>
  openNew: () => void
}) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [selectedTime, setSelectedTime] = useState("")
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  )
  const isPast = selectedDate < todayKey()
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from(
    { length: Math.ceil((firstDay + daysInMonth) / 7) * 7 },
    (_, index) => index - firstDay + 1,
  )
  const selectedAppointments = appointments.filter(
    (item) => item.date === selectedDate && item.status !== "Cancelled",
  )

  const book = async () => {
    if (!selectedTime) {
      setNotice({ ok: false, text: "Choose an available time first." })
      return
    }
    const result = await saveAppointment({
      id: crypto.randomUUID(),
      student: user.name,
      studentId: user.id,
      course: user.course,
      date: selectedDate,
      time: selectedTime,
      status: "Pending",
      createdAt: new Date().toISOString(),
    })
    setNotice({ ok: result === "saved", text: SAVE_MESSAGES[result] })
    if (result === "saved") setSelectedTime("")
  }

  const goToday = () => {
    const today = new Date()
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(todayKey())
    setSelectedTime("")
    setNotice(null)
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle="View available dates and manage student appointments."
        action={
          <Button className="primary" onClick={openNew}>
            + New Appointment
          </Button>
        }
      />
      <div className="schedule-layout">
        <section className="panel calendar-panel">
          <div className="panel-title">
            <div>
              <h2>Appointment Calendar</h2>
              <p>Select a date to view available appointments.</p>
            </div>
          </div>
          <div className="calendar-toolbar">
            <strong>{monthName}</strong>
            <div>
              <Button className="secondary" onClick={goToday}>
                Today
              </Button>
              <Button
                className="icon-button bordered"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
              >
                ‹
              </Button>
              <Button
                className="icon-button bordered"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
              >
                ›
              </Button>
            </div>
          </div>
          <div className="calendar-grid weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <strong key={day}>{day}</strong>
            ))}
          </div>
          <div className="calendar-grid days">
            {cells.map((day, index) => {
              if (day < 1 || day > daysInMonth)
                return <span className="calendar-empty" key={index} />
              const key = toDateKey(year, month, day)
              const count = appointments.filter(
                (item) => item.date === key && item.status !== "Cancelled",
              ).length
              return (
                <Button
                  key={key}
                  className={`calendar-day ${
                    selectedDate === key ? "selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedDate(key)
                    setSelectedTime("")
                    setNotice(null)
                  }}
                >
                  <span>{day}</span>
                  {count > 0 && (
                    <small>
                      <i />
                      {count} {count === 1 ? "appt" : "appts"}
                    </small>
                  )}
                </Button>
              )
            })}
          </div>
        </section>
        <section className="panel slots-panel">
          <span className="eyebrow muted">SELECTED DATE</span>
          <h2>{formatDate(selectedDate)}</h2>
          <p>
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", {
              weekday: "long",
            })}
          </p>
          <hr />
          <h3>Available Appointments</h3>
          <div className="slots">
            {TIMES.map((time) => {
              const booked = selectedAppointments.find(
                (item) => item.time === time,
              )
              return (
                <Button
                  key={time}
                  disabled={Boolean(booked) || isPast}
                  className={`slot ${selectedTime === time ? "chosen" : ""} ${
                    booked ? "booked" : ""
                  }`}
                  onClick={() => {
                    setSelectedTime(time)
                    setNotice(null)
                  }}
                >
                  <strong>{time}</strong>
                  <span>
                    {booked
                      ? booked.student
                      : selectedTime === time
                        ? "Selected"
                        : "Available"}
                  </span>
                  {booked && <small>Booked</small>}
                </Button>
              )
            })}
          </div>
          {isPast && (
            <div className="form-error">
              This date has passed, so it can't be booked.
            </div>
          )}
          {notice && (
            <div className={notice.ok ? "form-success" : "form-error"}>
              {notice.text}
            </div>
          )}
          <Button
            className="primary full"
            onClick={book}
            disabled={!selectedTime || isPast}
          >
            Book Appointment
          </Button>
        </section>
      </div>
    </>
  )
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
  )
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">○</div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  )
}

function Reports({
  user,
  appointments,
  onStatus,
  reset,
}: {
  user: User
  appointments: Appointment[]
  onStatus: (id: string, status: Status) => Promise<void>
  reset: () => Promise<void>
}) {
  const isStaff = user.role === "staff"
  const cancel = (id: string) => {
    if (window.confirm("Cancel this appointment?")) void onStatus(id, "Cancelled")
  }
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("All Status")
  const filtered = useMemo(
    () =>
      appointments.filter((item) => {
        const text =
          `${item.student} ${item.studentId} ${item.course}`.toLowerCase()
        return (
          text.includes(query.toLowerCase()) &&
          (status === "All Status" || item.status === status)
        )
      }),
    [appointments, query, status],
  )

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Search, filter, and print appointment records."
        action={
          <Button
            className="primary print-button"
            onClick={() => window.print()}
          >
            Print Report
          </Button>
        }
      />
      <section className="panel reports-panel">
        <div className="filters">
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search student, ID, or course..."
            aria-label="Search reports"
          />
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            {[
              "All Status",
              "Pending",
              "Approved",
              "Confirmed",
              "Cancelled",
            ].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Course</th>
                <th>Status</th>
                <th>Appointment Date</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.student}</strong>
                    <small>{item.time}</small>
                  </td>
                  <td>{item.studentId}</td>
                  <td>{item.course}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>{formatDate(item.date)}</td>
                  <td className="actions-col">
                    <div className="row-actions">
                      {isStaff && item.status === "Pending" && (
                        <Button
                          className="mini mini-approve"
                          onClick={() => void onStatus(item.id, "Approved")}
                        >
                          Approve
                        </Button>
                      )}
                      {isStaff && item.status === "Approved" && (
                        <Button
                          className="mini mini-confirm"
                          onClick={() => void onStatus(item.id, "Confirmed")}
                        >
                          Confirm
                        </Button>
                      )}
                      {item.status !== "Cancelled" &&
                        (isStaff || item.studentId === user.id) && (
                          <Button
                            className="mini mini-cancel"
                            onClick={() => cancel(item.id)}
                          >
                            Cancel
                          </Button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <EmptyState
              title="No appointments found"
              copy={
                appointments.length
                  ? "Try changing your search or status filter."
                  : "Shared appointments will appear here after the first booking."
              }
            />
          )}
        </div>
        <div className="report-footer">
          <span>
            {filtered.length} {filtered.length === 1 ? "record" : "records"} ·
            Appointment data is shared and visible to anyone using this app.
          </span>
          {isStaff && (
            <Button className="reset-button" onClick={reset}>
              Reset Data
            </Button>
          )}
        </div>
      </section>
    </>
  )
}

function NewAppointmentModal({
  user,
  onClose,
  onSave,
}: {
  user: User
  onClose: () => void
  onSave: (item: Appointment) => Promise<SaveResult>
}) {
  const [name, setName] = useState(user.name)
  const [course, setCourse] = useState(user.course)
  const [date, setDate] = useState(todayKey())
  const [time, setTime] = useState(TIMES[0])
  const [error, setError] = useState("")
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !course.trim() || !date || !time) {
      setError("Complete every field before saving.")
      return
    }
    const result = await onSave({
      id: crypto.randomUUID(),
      student: name.trim(),
      studentId: user.id,
      course: course.trim(),
      date,
      time,
      status: "Pending",
      createdAt: new Date().toISOString(),
    })
    if (result === "saved") onClose()
    else setError(SAVE_MESSAGES[result])
  }
  return (
    <Modal title="New Appointment" onClose={onClose}>
      <p className="modal-copy">
        Book a student appointment. New bookings begin with Pending status.
      </p>
      <form className="appointment-form" onSubmit={submit}>
        <label>
          Student name
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Course
          <TextInput
            value={course}
            onChange={(event) => setCourse(event.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Date
            <TextInput
              type="date"
              min={todayKey()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            Time slot
            <Select
              value={time}
              onChange={(event) => setTime(event.target.value)}
            >
              {TIMES.map((slot) => (
                <option key={slot}>{slot}</option>
              ))}
            </Select>
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <Button className="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button className="primary" type="submit">
            Save Appointment
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [session, setSession] = useState<User | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [page, setPage] = useState<Page>("home")
  const [newOpen, setNewOpen] = useState(false)
  const [storageError, setStorageError] = useState("")

  const loadAppointments = useCallback(async () => {
    setAppointments(
      await storage.read<Appointment[]>(APPOINTMENTS_KEY, true, []),
    )
  }, [])

  useEffect(() => {
    ;(async () => {
      let savedUsers = await storage.read<User[]>(USERS_KEY, true, [])
      if (!savedUsers.length) {
        const seeded = await storage.write(USERS_KEY, seedUsers, true)
        savedUsers = seedUsers
        if (!seeded)
          setStorageError(
            "Shared storage is unavailable. Data may not persist.",
          )
      }
      setUsers(savedUsers)
      const saved = await storage.read<string | { id?: string } | null>(
        SESSION_KEY,
        false,
        null,
      )
      const sessionId = typeof saved === "string" ? saved : saved?.id
      setSession(savedUsers.find((user) => user.id === sessionId) ?? null)
      await loadAppointments()
      setLoading(false)
    })()
  }, [loadAppointments])

  const login = async (user: User) => {
    await storage.write(SESSION_KEY, user.id, false)
    setSession(user)
    setPage("home")
  }

  const logout = async () => {
    await storage.clear(SESSION_KEY, false)
    setSession(null)
    setPage("home")
  }

  const saveAppointment = async (item: Appointment): Promise<SaveResult> => {
    if (item.date < todayKey()) return "past"
    const current = await storage.read<Appointment[]>(
      APPOINTMENTS_KEY,
      true,
      [],
    )
    if (
      current.some(
        (appointment) =>
          appointment.date === item.date &&
          appointment.time === item.time &&
          appointment.status !== "Cancelled",
      )
    )
      return "conflict"
    const updated = [...current, item]
    const ok = await storage.write(APPOINTMENTS_KEY, updated, true)
    if (ok) setAppointments(updated)
    return ok ? "saved" : "error"
  }

  const updateStatus = async (id: string, status: Status) => {
    const current = await storage.read<Appointment[]>(
      APPOINTMENTS_KEY,
      true,
      [],
    )
    const updated = current.map((item) =>
      item.id === id ? { ...item, status } : item,
    )
    if (await storage.write(APPOINTMENTS_KEY, updated, true))
      setAppointments(updated)
  }

  // Keep the list fresh when other tabs or users change shared data.
  useEffect(() => {
    if (!session) return
    const refresh = () => {
      void loadAppointments()
    }
    const timer = window.setInterval(refresh, 5000)
    window.addEventListener("storage", refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("storage", refresh)
    }
  }, [session, loadAppointments])

  const reset = async () => {
    if (
      !window.confirm(
        "Clear all shared appointments? User accounts will remain available.",
      )
    )
      return
    const ok = await storage.write(APPOINTMENTS_KEY, [], true)
    if (ok) setAppointments([])
  }

  if (loading)
    return (
      <main className="loading">
        <div className="spinner" />
        <strong>Loading appointment system…</strong>
      </main>
    )
  if (!session) return <Login users={users} onLogin={login} />

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} logout={logout} />
      <main className="content">
        {storageError && <div className="storage-warning">{storageError}</div>}
        {page === "home" && (
          <Home
            user={session}
            navigate={setPage}
            openNew={() => setNewOpen(true)}
          />
        )}
        {page === "dashboard" && <Dashboard appointments={appointments} />}
        {page === "schedule" && (
          <Schedule
            user={session}
            appointments={appointments}
            saveAppointment={saveAppointment}
            openNew={() => setNewOpen(true)}
          />
        )}
        {page === "reports" && (
          <Reports
            user={session}
            appointments={appointments}
            onStatus={updateStatus}
            reset={reset}
          />
        )}
      </main>
      {newOpen && (
        <NewAppointmentModal
          user={session}
          onClose={() => setNewOpen(false)}
          onSave={saveAppointment}
        />
      )}
    </div>
  )
}
