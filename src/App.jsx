import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

function monthLabel(monthStr) {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function App() {
  const [members, setMembers] = useState([])
  const [payments, setPayments] = useState([])
  const [month, setMonth] = useState(currentMonthStr())
  const [newMemberName, setNewMemberName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const monthDate = `${month}-01`

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    loadPayments(monthDate)
  }, [monthDate])

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

  async function loadPayments(forMonth) {
    const { data, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('month', forMonth)
    if (fetchError) setError(fetchError.message)
    else setPayments(data)
  }

  const paidMemberIds = useMemo(
    () => new Set(payments.map((p) => p.member_id)),
    [payments]
  )

  async function togglePaid(member) {
    setError('')
    const existing = payments.find((p) => p.member_id === member.id)
    if (existing) {
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', existing.id)
      if (deleteError) setError(deleteError.message)
      else setPayments((prev) => prev.filter((p) => p.id !== existing.id))
    } else {
      const { data, error: insertError } = await supabase
        .from('payments')
        .insert({ member_id: member.id, month: monthDate })
        .select()
        .single()
      if (insertError) setError(insertError.message)
      else setPayments((prev) => [...prev, data])
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
    const unpaid = members.filter((m) => !paidMemberIds.has(m.id))
    const lines = [
      `*PPM Charity Fund — ${monthLabel(month)}*`,
      '',
      `✅ Paid (${paid.length}/${members.length})`,
      ...(paid.length ? paid.map((m) => `- ${m.name}`) : ['- none yet']),
      '',
      `❌ Not paid (${unpaid.length}/${members.length})`,
      ...(unpaid.length ? unpaid.map((m) => `- ${m.name}`) : ['- none, everyone paid!']),
    ]
    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-900">PPM Charity Fund</h1>
        <p className="text-sm text-zinc-500">Track who's paid the monthly group fund.</p>
      </header>

      <div className="mb-6 flex items-center justify-between gap-3">
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

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-zinc-500">No members yet — add one below.</p>
      ) : (
        <ul className="mb-6 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {members.map((member) => {
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
    </div>
  )
}
