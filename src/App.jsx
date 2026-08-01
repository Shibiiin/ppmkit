import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const MONTHLY_AMOUNT = Number(import.meta.env.VITE_MONTHLY_AMOUNT) || 0
const CURRENCY = import.meta.env.VITE_CURRENCY_SYMBOL || '₹'

const COLORS = {
  bg: '#FBF7EE',
  dark: '#1F3B2C',
  green: '#2E9E6B',
  greenTint: '#E9F5EF',
  gold: '#F4A727',
  border: '#E4DCC8',
  muted: '#6B7A6F',
  mutedLight: '#8A9A8D',
  error: '#C0392B',
  errorBg: '#FBEAE8',
}

function monthLabel(monthStr) {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function monthStrOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function currentMonthStr() {
  return monthStrOf(new Date())
}

function lastMonthStr() {
  const now = new Date()
  return monthStrOf(new Date(now.getFullYear(), now.getMonth() - 1, 1))
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function CheckCircleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CircleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 11l8-7 8 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HistoryIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 2h6" strokeLinecap="round" />
    </svg>
  )
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [members, setMembers] = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [month, setMonth] = useState(currentMonthStr())
  const [historyMonth, setHistoryMonth] = useState(currentMonthStr())
  const [search, setSearch] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const monthDate = `${month}-01`
  const historyMonthDate = `${historyMonth}-01`
  const lastMonthDate = `${lastMonthStr()}-01`

  useEffect(() => {
    loadMembers()
    loadAllPayments()
  }, [])

  async function loadMembers() {
    const { data, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('active', true)
      .order('name')
    if (fetchError) setError(fetchError.message)
    else setMembers(data)
    setLoading(false)
  }

  async function loadAllPayments() {
    const { data, error: fetchError } = await supabase.from('payments').select('*')
    if (fetchError) setError(fetchError.message)
    else setAllPayments(data)
  }

  const paymentsForMonth = useMemo(
    () => allPayments.filter((p) => p.month === monthDate),
    [allPayments, monthDate]
  )

  const paidMemberIds = useMemo(
    () => new Set(paymentsForMonth.map((p) => p.member_id)),
    [paymentsForMonth]
  )

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? members.filter((m) => m.name.toLowerCase().includes(term)) : members
  }, [members, search])

  const monthTotal = useMemo(
    () => paymentsForMonth.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [paymentsForMonth]
  )

  const paidPercent = members.length
    ? Math.round((paidMemberIds.size / members.length) * 100)
    : 0

  const totalCollected = useMemo(
    () => allPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [allPayments]
  )

  const lastMonthTotal = useMemo(
    () =>
      allPayments
        .filter((p) => p.month === lastMonthDate)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [allPayments, lastMonthDate]
  )

  const historyMonthPayments = useMemo(
    () => allPayments.filter((p) => p.month === historyMonthDate),
    [allPayments, historyMonthDate]
  )

  const historyMonthTotal = useMemo(
    () => historyMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [historyMonthPayments]
  )

  async function togglePaid(member) {
    setError('')
    const existing = paymentsForMonth.find((p) => p.member_id === member.id)
    if (existing) {
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', existing.id)
      if (deleteError) setError(deleteError.message)
      else setAllPayments((prev) => prev.filter((p) => p.id !== existing.id))
    } else {
      const { data, error: insertError } = await supabase
        .from('payments')
        .insert({ member_id: member.id, month: monthDate, amount: MONTHLY_AMOUNT })
        .select()
        .single()
      if (insertError) setError(insertError.message)
      else setAllPayments((prev) => [...prev, data])
    }
  }

  async function addMember(e) {
    e.preventDefault()
    const name = newMemberName.trim()
    if (!name) return
    const { data, error: insertError } = await supabase
      .from('members')
      .insert({ name })
      .select()
      .single()
    if (insertError) setError(insertError.message)
    else {
      setMembers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewMemberName('')
    }
  }

  async function removeMember(member) {
    setError('')
    const { error: updateError } = await supabase
      .from('members')
      .update({ active: false })
      .eq('id', member.id)
    if (updateError) setError(updateError.message)
    else setMembers((prev) => prev.filter((m) => m.id !== member.id))
  }

  function shareOnWhatsApp() {
    const paid = members.filter((m) => paidMemberIds.has(m.id))
    const total = paid.length * MONTHLY_AMOUNT
    const lines = [
      `*കിറ്റ് ഫണ്ട് — ${monthLabel(month)}*`,
      '',
      `✅ Paid (${paid.length}/${members.length})`,
      ...(paid.length
        ? paid.map((m) => `- ${m.name}: ${CURRENCY}${MONTHLY_AMOUNT}`)
        : ['- none yet']),
      '',
      `Total collected: ${CURRENCY}${total}`,
    ]
    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-24 pt-8"
      style={{ backgroundColor: COLORS.bg }}
    >
      <header className="mb-5 flex flex-col gap-1">
        <h1 className="text-2xl font-bold" style={{ color: COLORS.dark }}>
          കിറ്റ് ഫണ്ട്
        </h1>
        {tab === 'home' ? (
          <label className="w-fit">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="cursor-pointer border-none bg-transparent p-0 text-sm outline-none"
              style={{ color: COLORS.mutedLight }}
            />
          </label>
        ) : (
          <p className="text-sm" style={{ color: COLORS.mutedLight }}>
            Payment history
          </p>
        )}
      </header>

      {error && (
        <div
          className="mb-4 rounded-xl px-3 py-2 text-sm"
          style={{ backgroundColor: COLORS.errorBg, color: COLORS.error }}
        >
          {error}
        </div>
      )}

      {tab === 'home' ? (
        <>
          <div
            className="mb-4 rounded-2xl p-5"
            style={{ backgroundColor: COLORS.green, color: '#FFFFFF' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-bold leading-tight">
                  {CURRENCY}
                  {monthTotal}
                </p>
                <p className="mt-0.5 text-xs opacity-80">collected this month</p>
              </div>
              <p className="pt-1 text-sm font-medium opacity-95">
                {paidMemberIds.size}/{members.length} have paid
              </p>
            </div>
            <div
              className="mt-4 h-1.5 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
            >
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ backgroundColor: COLORS.gold, width: `${paidPercent}%` }}
              />
            </div>
          </div>

          <div
            className="mb-4 rounded-2xl bg-white p-3"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <form onSubmit={addMember} className="flex gap-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Add a member"
                className="flex-1 rounded-xl border-none bg-transparent px-2 py-1.5 text-sm outline-none"
                style={{ color: COLORS.dark }}
              />
              <button
                type="submit"
                aria-label="Add member"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-medium text-white"
                style={{ backgroundColor: COLORS.dark }}
              >
                +
              </button>
            </form>
            <p className="mt-2 px-2 text-xs" style={{ color: COLORS.muted }}>
              {CURRENCY}
              {MONTHLY_AMOUNT} per member
            </p>
          </div>

          <div className="relative mb-4">
            <SearchIcon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: COLORS.mutedLight }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="w-full rounded-full bg-white py-2.5 pl-10 pr-4 text-sm outline-none"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.dark }}
            />
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: COLORS.mutedLight }}>
              Loading…
            </p>
          ) : filteredMembers.length === 0 ? (
            <p className="text-sm" style={{ color: COLORS.mutedLight }}>
              {members.length === 0
                ? 'No members yet — add one above.'
                : 'No members match your search.'}
            </p>
          ) : (
            <ul className="mb-4 flex flex-col gap-2">
              {filteredMembers.map((member) => {
                const paid = paidMemberIds.has(member.id)
                return (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3"
                    style={{
                      backgroundColor: paid ? COLORS.greenTint : '#FFFFFF',
                      border: `1px solid ${paid ? COLORS.green : COLORS.border}`,
                    }}
                  >
                    <button
                      onClick={() => togglePaid(member)}
                      aria-label={paid ? 'Mark as unpaid' : 'Mark as paid'}
                      className="shrink-0"
                      style={{ color: paid ? COLORS.green : COLORS.mutedLight }}
                    >
                      {paid ? (
                        <CheckCircleIcon className="h-6 w-6" />
                      ) : (
                        <CircleIcon className="h-6 w-6" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: COLORS.dark }}>
                        {member.name}
                      </p>
                      <p className="text-xs" style={{ color: paid ? COLORS.green : COLORS.muted }}>
                        {paid ? 'Paid' : 'Pending'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeMember(member)}
                      aria-label={`Remove ${member.name}`}
                      className="shrink-0"
                      style={{ color: COLORS.mutedLight }}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <button
            onClick={shareOnWhatsApp}
            disabled={!members.length}
            className="w-full rounded-full py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: COLORS.gold, color: COLORS.dark }}
          >
            Share on WhatsApp
          </button>
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div
              className="rounded-2xl bg-white p-4"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.muted }}>
                Total members
              </p>
              <p className="mt-1 text-2xl font-bold" style={{ color: COLORS.dark }}>
                {members.length}
              </p>
            </div>
            <div
              className="rounded-2xl bg-white p-4"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.muted }}>
                Collected to date
              </p>
              <p className="mt-1 text-2xl font-bold" style={{ color: COLORS.green }}>
                {CURRENCY}
                {totalCollected}
              </p>
            </div>
            <div
              className="rounded-2xl bg-white p-4"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.muted }}>
                Last month's total
              </p>
              <p className="mt-1 text-2xl font-bold" style={{ color: COLORS.green }}>
                {CURRENCY}
                {lastMonthTotal}
              </p>
            </div>
          </div>

          <div
            className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-3"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <label className="flex items-center gap-2 text-sm" style={{ color: COLORS.muted }}>
              View month
              <input
                type="month"
                value={historyMonth}
                onChange={(e) => setHistoryMonth(e.target.value)}
                className="rounded-lg border-none bg-transparent px-1 py-1 text-sm outline-none"
                style={{ color: COLORS.dark }}
              />
            </label>
            <span className="text-sm font-medium" style={{ color: COLORS.dark }}>
              {historyMonthPayments.length} paid · {CURRENCY}
              {historyMonthTotal}
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {historyMonthPayments.length === 0 ? (
              <li
                className="rounded-2xl bg-white px-4 py-3 text-sm"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.mutedLight }}
              >
                No payments recorded for {monthLabel(historyMonth)}.
              </li>
            ) : (
              historyMonthPayments.map((p) => {
                const member = members.find((m) => m.id === p.member_id)
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3"
                    style={{ backgroundColor: COLORS.greenTint, border: `1px solid ${COLORS.green}` }}
                  >
                    <CheckCircleIcon className="h-5 w-5 shrink-0" style={{ color: COLORS.green }} />
                    <span className="flex-1 truncate text-sm font-medium" style={{ color: COLORS.dark }}>
                      {member?.name ?? 'Unknown member'}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: COLORS.green }}>
                      {CURRENCY}
                      {p.amount ?? MONTHLY_AMOUNT}
                    </span>
                  </li>
                )
              })
            )}
          </ul>
        </>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 mx-auto flex max-w-2xl bg-white"
        style={{ borderTop: `1px solid ${COLORS.border}` }}
      >
        <button
          onClick={() => setTab('home')}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium"
          style={{ color: tab === 'home' ? COLORS.green : COLORS.mutedLight }}
        >
          <HomeIcon className="h-5 w-5" />
          Home
        </button>
        <button
          onClick={() => setTab('history')}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium"
          style={{ color: tab === 'history' ? COLORS.green : COLORS.mutedLight }}
        >
          <HistoryIcon className="h-5 w-5" />
          History
        </button>
      </nav>
    </div>
  )
}
