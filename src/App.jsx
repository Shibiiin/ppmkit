import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabaseClient'

const MONTHLY_AMOUNT = Number(import.meta.env.VITE_MONTHLY_AMOUNT) || 0
const CURRENCY = import.meta.env.VITE_CURRENCY_SYMBOL || '₹'
const LONG_PRESS_MS = 500

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

const inputClass =
  'w-full bg-white px-3 py-2 text-sm outline-none transition-shadow ' +
  'focus:ring-2 focus:ring-[#2E9E6B]/40 focus:border-[#2E9E6B]'

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
  const [showRemoved, setShowRemoved] = useState(false)
  const [members, setMembers] = useState([])
  const [removedMembers, setRemovedMembers] = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [month, setMonth] = useState(currentMonthStr())
  const [historyMonth, setHistoryMonth] = useState(currentMonthStr())
  const [search, setSearch] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberAmount, setNewMemberAmount] = useState(String(MONTHLY_AMOUNT))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [amountOverrides, setAmountOverrides] = useState({})
  const [actionMenuMember, setActionMenuMember] = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [editAmountValue, setEditAmountValue] = useState('')

  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const pressTimerRef = useRef(null)
  const longPressFiredRef = useRef(false)
  const touchStartYRef = useRef(null)

  const monthDate = `${month}-01`
  const historyMonthDate = `${historyMonth}-01`
  const lastMonthDate = `${lastMonthStr()}-01`

  useEffect(() => {
    loadMembers()
    loadRemovedMembers()
    loadAllPayments()
  }, [])

  useEffect(() => {
    setAmountOverrides({})
  }, [month])

  useEffect(() => {
    function upsert(list, row) {
      const exists = list.some((item) => item.id === row.id)
      return exists ? list.map((item) => (item.id === row.id ? row : item)) : [...list, row]
    }
    function byName(a, b) {
      return a.name.localeCompare(b.name)
    }

    const channel = supabase
      .channel('kit-fund-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setMembers((prev) => prev.filter((m) => m.id !== payload.old.id))
            setRemovedMembers((prev) => prev.filter((m) => m.id !== payload.old.id))
            return
          }
          const row = payload.new
          if (row.active) {
            setRemovedMembers((prev) => prev.filter((m) => m.id !== row.id))
            setMembers((prev) => upsert(prev, row).sort(byName))
          } else {
            setMembers((prev) => prev.filter((m) => m.id !== row.id))
            setRemovedMembers((prev) => upsert(prev, row).sort(byName))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setAllPayments((prev) => prev.filter((p) => p.id !== payload.old.id))
            return
          }
          setAllPayments((prev) => upsert(prev, payload.new))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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

  async function loadRemovedMembers() {
    const { data, error: fetchError } = await supabase
      .from('members')
      .select('*')
      .eq('active', false)
      .order('name')
    if (fetchError) setError(fetchError.message)
    else setRemovedMembers(data)
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
      const amount = amountOverrides[member.id] ?? member.default_amount ?? MONTHLY_AMOUNT
      const { data, error: insertError } = await supabase
        .from('payments')
        .insert({ member_id: member.id, month: monthDate, amount })
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
    const amount = Number(newMemberAmount)
    const default_amount = Number.isFinite(amount) && amount >= 0 ? amount : MONTHLY_AMOUNT
    const { data, error: insertError } = await supabase
      .from('members')
      .insert({ name, default_amount })
      .select()
      .single()
    if (insertError) setError(insertError.message)
    else {
      setMembers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewMemberName('')
      setNewMemberAmount(String(MONTHLY_AMOUNT))
    }
  }

  async function removeMember(member) {
    setError('')
    const { error: updateError } = await supabase
      .from('members')
      .update({ active: false })
      .eq('id', member.id)
    if (updateError) setError(updateError.message)
    else {
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      setRemovedMembers((prev) =>
        [...prev, { ...member, active: false }].sort((a, b) => a.name.localeCompare(b.name))
      )
    }
  }

  async function restoreMember(member) {
    setError('')
    const { error: updateError } = await supabase
      .from('members')
      .update({ active: true })
      .eq('id', member.id)
    if (updateError) setError(updateError.message)
    else {
      setRemovedMembers((prev) => prev.filter((m) => m.id !== member.id))
      setMembers((prev) =>
        [...prev, { ...member, active: true }].sort((a, b) => a.name.localeCompare(b.name))
      )
    }
  }

  function startPress(member) {
    longPressFiredRef.current = false
    pressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true
      setActionMenuMember(member)
    }, LONG_PRESS_MS)
  }

  function cancelPress() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  function handleRowClick(member) {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false
      return
    }
    togglePaid(member)
  }

  function openEdit(member) {
    const existing = paymentsForMonth.find((p) => p.member_id === member.id)
    const currentAmount =
      existing?.amount ?? amountOverrides[member.id] ?? member.default_amount ?? MONTHLY_AMOUNT
    setEditAmountValue(String(currentAmount))
    setEditingMember(member)
    setActionMenuMember(null)
  }

  async function saveEditedAmount(e) {
    e.preventDefault()
    if (!editingMember) return
    const amount = Number(editAmountValue)
    if (!Number.isFinite(amount) || amount < 0) return

    const existing = paymentsForMonth.find((p) => p.member_id === editingMember.id)
    if (existing) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({ amount })
        .eq('id', existing.id)
      if (updateError) setError(updateError.message)
      else
        setAllPayments((prev) =>
          prev.map((p) => (p.id === existing.id ? { ...p, amount } : p))
        )
    } else {
      setAmountOverrides((prev) => ({ ...prev, [editingMember.id]: amount }))
    }
    setEditingMember(null)
  }

  function confirmDeleteFromMenu(member) {
    setActionMenuMember(null)
    if (window.confirm(`Remove ${member.name} from the list?`)) {
      removeMember(member)
    }
  }

  function handleTouchStart(e) {
    if (tab !== 'home' || refreshing || window.scrollY > 0) {
      touchStartYRef.current = null
      return
    }
    touchStartYRef.current = e.touches[0].clientY
  }

  function handleTouchMove(e) {
    if (touchStartYRef.current == null) return
    const delta = e.touches[0].clientY - touchStartYRef.current
    if (delta > 0 && window.scrollY <= 0) {
      setPullDistance(Math.min(delta * 0.5, 80))
    }
  }

  async function handleTouchEnd() {
    if (touchStartYRef.current == null) return
    touchStartYRef.current = null
    if (pullDistance > 50) {
      setRefreshing(true)
      await Promise.all([loadMembers(), loadRemovedMembers(), loadAllPayments()])
      setRefreshing(false)
    }
    setPullDistance(0)
  }

  function shareOnWhatsApp() {
    const paid = members.filter((m) => paidMemberIds.has(m.id))
    const lines = [
      `*കിറ്റ് ഫണ്ട് — ${monthLabel(month)}*`,
      '',
      `✅ Paid (${paid.length}/${members.length})`,
      ...(paid.length
        ? paid.map((m) => {
            const payment = paymentsForMonth.find((p) => p.member_id === m.id)
            const amount = payment?.amount ?? m.default_amount ?? MONTHLY_AMOUNT
            return `- ${m.name}: ${CURRENCY}${amount}`
          })
        : ['- none yet']),
      '',
      `Total collected: ${CURRENCY}${monthTotal}`,
    ]
    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-24 pt-8"
      style={{ backgroundColor: COLORS.bg }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
              className="cursor-pointer rounded-lg border-none bg-transparent p-0 text-sm outline-none focus:ring-2 focus:ring-[#2E9E6B]/40"
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
          {(pullDistance > 0 || refreshing) && (
            <div
              className="flex items-center justify-center overflow-hidden"
              style={{
                height: refreshing ? 32 : pullDistance,
                transition: refreshing ? 'none' : 'height 0.15s ease-out',
              }}
            >
              <span className="text-xs font-medium" style={{ color: COLORS.green }}>
                {refreshing
                  ? 'Refreshing…'
                  : pullDistance > 50
                    ? 'Release to refresh'
                    : 'Pull to refresh'}
              </span>
            </div>
          )}

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
                className={`flex-1 rounded-xl ${inputClass}`}
                style={{ color: COLORS.dark, border: `1px solid ${COLORS.border}` }}
              />
              <div className="relative w-24 shrink-0">
                <span
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: COLORS.mutedLight }}
                >
                  {CURRENCY}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newMemberAmount}
                  onChange={(e) => setNewMemberAmount(e.target.value)}
                  aria-label="Amount"
                  className={`rounded-xl ${inputClass}`}
                  style={{
                    color: COLORS.dark,
                    border: `1px solid ${COLORS.border}`,
                    paddingLeft: '1.5rem',
                  }}
                />
              </div>
              <button
                type="submit"
                aria-label="Add member"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: COLORS.dark }}
              >
                +
              </button>
            </form>
            <p className="mt-2 px-2 text-xs" style={{ color: COLORS.muted }}>
              Defaults to {CURRENCY}
              {MONTHLY_AMOUNT} per member — editable above
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
              className={`rounded-full pl-10 ${inputClass}`}
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
                const payment = paymentsForMonth.find((p) => p.member_id === member.id)
                const amount =
                  payment?.amount ?? amountOverrides[member.id] ?? member.default_amount ?? MONTHLY_AMOUNT
                return (
                  <li
                    key={member.id}
                    onMouseDown={() => startPress(member)}
                    onMouseUp={cancelPress}
                    onMouseLeave={cancelPress}
                    onTouchStart={() => startPress(member)}
                    onTouchEnd={cancelPress}
                    onTouchCancel={cancelPress}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={() => handleRowClick(member)}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 select-none"
                    style={{
                      backgroundColor: paid ? COLORS.greenTint : '#FFFFFF',
                      border: `1px solid ${paid ? COLORS.green : COLORS.border}`,
                    }}
                  >
                    <span className="shrink-0" style={{ color: paid ? COLORS.green : COLORS.mutedLight }}>
                      {paid ? (
                        <CheckCircleIcon className="h-6 w-6" />
                      ) : (
                        <CircleIcon className="h-6 w-6" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: COLORS.dark }}>
                        {member.name}
                      </p>
                      <p className="text-xs" style={{ color: paid ? COLORS.green : COLORS.muted }}>
                        {paid ? 'Paid' : 'Pending'} · {CURRENCY}
                        {amount}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <button
            onClick={shareOnWhatsApp}
            disabled={!members.length}
            className="w-full rounded-full py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: COLORS.gold, color: COLORS.dark }}
          >
            Share on WhatsApp
          </button>

          <p className="mt-3 text-center text-xs" style={{ color: COLORS.mutedLight }}>
            Press and hold a member to edit or remove them
          </p>
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setShowRemoved((v) => !v)}
              aria-pressed={showRemoved}
              aria-label="Toggle removed members"
              className="cursor-pointer rounded-2xl bg-white p-3 text-left transition-transform active:scale-95"
              style={{ border: `1px solid ${showRemoved ? COLORS.green : COLORS.border}` }}
            >
              <p
                className="text-[10px] font-medium uppercase leading-tight tracking-wide"
                style={{ color: COLORS.muted }}
              >
                Members
              </p>
              <p className="mt-1 text-lg font-bold sm:text-2xl" style={{ color: COLORS.dark }}>
                {members.length}
              </p>
            </button>
            <div
              className="rounded-2xl bg-white p-3"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <p
                className="text-[10px] font-medium uppercase leading-tight tracking-wide"
                style={{ color: COLORS.muted }}
              >
                To date
              </p>
              <p className="mt-1 text-lg font-bold sm:text-2xl" style={{ color: COLORS.green }}>
                {CURRENCY}
                {totalCollected}
              </p>
            </div>
            <div
              className="rounded-2xl bg-white p-3"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <p
                className="text-[10px] font-medium uppercase leading-tight tracking-wide"
                style={{ color: COLORS.muted }}
              >
                Last month
              </p>
              <p className="mt-1 text-lg font-bold sm:text-2xl" style={{ color: COLORS.green }}>
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
                className="rounded-lg border-none bg-transparent px-1 py-1 text-sm outline-none focus:ring-2 focus:ring-[#2E9E6B]/40"
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

          {showRemoved && (
            <div className="mt-6">
              <p
                className="mb-2 text-xs font-medium uppercase tracking-wide"
                style={{ color: COLORS.muted }}
              >
                Removed members
              </p>
              {removedMembers.length === 0 ? (
                <p
                  className="rounded-2xl bg-white px-4 py-3 text-sm"
                  style={{ border: `1px solid ${COLORS.border}`, color: COLORS.mutedLight }}
                >
                  No removed members.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {removedMembers.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3"
                      style={{ backgroundColor: '#FFFFFF', border: `1px solid ${COLORS.border}` }}
                    >
                      <span className="flex-1 truncate text-sm font-medium" style={{ color: COLORS.mutedLight }}>
                        {member.name}
                      </span>
                      <button
                        onClick={() => restoreMember(member)}
                        className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-90"
                        style={{ backgroundColor: COLORS.greenTint, color: COLORS.green }}
                      >
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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

      {actionMenuMember && (
        <div
          className="fixed inset-0 z-10 flex items-end justify-center bg-black/30 sm:items-center"
          onClick={() => setActionMenuMember(null)}
        >
          <div
            className="mb-24 w-full max-w-xs rounded-2xl bg-white p-4 sm:mb-0"
            style={{ border: `1px solid ${COLORS.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 truncate text-sm font-semibold" style={{ color: COLORS.dark }}>
              {actionMenuMember.name}
            </p>
            <button
              onClick={() => openEdit(actionMenuMember)}
              className="mb-2 w-full rounded-xl py-2.5 text-sm font-medium"
              style={{ backgroundColor: COLORS.greenTint, color: COLORS.green }}
            >
              Edit amount
            </button>
            <button
              onClick={() => confirmDeleteFromMenu(actionMenuMember)}
              className="mb-2 w-full rounded-xl py-2.5 text-sm font-medium"
              style={{ backgroundColor: COLORS.errorBg, color: COLORS.error }}
            >
              Delete member
            </button>
            <button
              onClick={() => setActionMenuMember(null)}
              className="w-full rounded-xl py-2.5 text-sm font-medium"
              style={{ color: COLORS.muted }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingMember && (
        <div
          className="fixed inset-0 z-10 flex items-end justify-center bg-black/30 sm:items-center"
          onClick={() => setEditingMember(null)}
        >
          <form
            onSubmit={saveEditedAmount}
            className="mb-24 w-full max-w-xs rounded-2xl bg-white p-4 sm:mb-0"
            style={{ border: `1px solid ${COLORS.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 truncate text-sm font-semibold" style={{ color: COLORS.dark }}>
              {editingMember.name}
            </p>
            <p className="mb-3 text-xs" style={{ color: COLORS.muted }}>
              Amount for {monthLabel(month)} only — doesn't change their default amount
            </p>
            <div className="relative mb-3">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: COLORS.mutedLight }}
              >
                {CURRENCY}
              </span>
              <input
                type="number"
                min="0"
                step="1"
                autoFocus
                value={editAmountValue}
                onChange={(e) => setEditAmountValue(e.target.value)}
                className={`rounded-xl ${inputClass}`}
                style={{ color: COLORS.dark, border: `1px solid ${COLORS.border}`, paddingLeft: '1.75rem' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium"
                style={{ color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: COLORS.green }}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
