import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const MONTHLY_AMOUNT = Number(import.meta.env.VITE_MONTHLY_AMOUNT) || 0
const CURRENCY = import.meta.env.VITE_CURRENCY_SYMBOL || '₹'

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

  function shareOnWhatsApp() {
    const paid = members.filter((m) => paidMemberIds.has(m.id))
    const total = paid.length * MONTHLY_AMOUNT
    const lines = [
      `*PPM Charity Fund — ${monthLabel(month)}*`,
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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-20 pt-8">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-900">PPM Charity Fund</h1>
        <p className="text-sm text-zinc-500">Track who's paid the monthly group fund.</p>
      </header>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {tab === 'home' ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Month
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-md border border-zinc-300 px-2 py-1"
              />
            </label>
            <button
              onClick={shareOnWhatsApp}
              disabled={!members.length}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Share on WhatsApp
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="mb-4 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />

          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : filteredMembers.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {members.length === 0
                ? 'No members yet — add one below.'
                : 'No members match your search.'}
            </p>
          ) : (
            <ul className="mb-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
              {filteredMembers.map((member) => {
                const paid = paidMemberIds.has(member.id)
                return (
                  <li key={member.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-zinc-800">{member.name}</span>
                    <button
                      onClick={() => togglePaid(member)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        paid
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                      }`}
                    >
                      {paid ? 'Paid ✓' : 'Mark as paid'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <form onSubmit={addMember} className="flex gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Add a member"
              className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Add
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Total members</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">{members.length}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Collected to date</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {CURRENCY}
                {totalCollected}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Last month's total</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {CURRENCY}
                {lastMonthTotal}
              </p>
            </div>
          </div>

          <label className="mb-4 flex items-center gap-2 text-sm text-zinc-600">
            View month
            <input
              type="month"
              value={historyMonth}
              onChange={(e) => setHistoryMonth(e.target.value)}
              className="rounded-md border border-zinc-300 px-2 py-1"
            />
          </label>

          <p className="mb-2 text-sm text-zinc-500">
            {historyMonthPayments.length} paid in {monthLabel(historyMonth)} · {CURRENCY}
            {historyMonthTotal} collected
          </p>

          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {historyMonthPayments.length === 0 ? (
              <li className="px-4 py-3 text-sm text-zinc-500">
                No payments recorded for this month.
              </li>
            ) : (
              historyMonthPayments.map((p) => {
                const member = members.find((m) => m.id === p.member_id)
                return (
                  <li key={p.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-zinc-800">{member?.name ?? 'Unknown member'}</span>
                    <span className="text-sm text-zinc-500">
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

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-2xl border-t border-zinc-200 bg-white">
        <button
          onClick={() => setTab('home')}
          className={`flex-1 py-3 text-sm font-medium ${
            tab === 'home' ? 'text-emerald-600' : 'text-zinc-500'
          }`}
        >
          Home
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-3 text-sm font-medium ${
            tab === 'history' ? 'text-emerald-600' : 'text-zinc-500'
          }`}
        >
          History
        </button>
      </nav>
    </div>
  )
}
