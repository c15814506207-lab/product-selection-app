import { supabase } from '../lib/supabase'

function isMissingWalletSchema(error) {
  const msg = String(error?.message || '').toLowerCase()
  return (
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('wallet_accounts') ||
    msg.includes('wallet_transactions')
  )
}

async function ensureWalletAccount(userId) {
  const { data: existing, error: qErr } = await supabase
    .from('wallet_accounts')
    .select('user_id, balance')
    .eq('user_id', userId)
    .maybeSingle()
  if (qErr) throw qErr
  if (existing) return existing

  const { data: inserted, error: iErr } = await supabase
    .from('wallet_accounts')
    .insert([{ user_id: userId, balance: 0 }])
    .select('user_id, balance')
    .single()
  if (iErr) throw iErr
  return inserted
}

export async function fetchWalletBalanceSafe(userId) {
  if (!userId) return { supported: false, balance: 0 }
  try {
    const account = await ensureWalletAccount(userId)
    return { supported: true, balance: Number(account?.balance) || 0 }
  } catch (error) {
    if (isMissingWalletSchema(error)) return { supported: false, balance: 0 }
    throw error
  }
}

export async function appendWalletTransactionSafe({
  userId,
  type,
  amount,
  description,
  externalRef,
  meta,
}) {
  if (!userId) return { supported: false, applied: false, balance: 0 }
  const normalizedAmount = Math.max(0, Number(amount) || 0)
  if (normalizedAmount <= 0) return { supported: true, applied: false, balance: 0 }
  const txType = type === 'debit' ? 'debit' : 'credit'

  try {
    const account = await ensureWalletAccount(userId)
    const currentBalance = Number(account?.balance) || 0

    if (externalRef) {
      const { data: existingTx, error: txErr } = await supabase
        .from('wallet_transactions')
        .select('id, balance_after')
        .eq('user_id', userId)
        .eq('external_ref', String(externalRef))
        .maybeSingle()
      if (txErr && !isMissingWalletSchema(txErr)) throw txErr
      if (existingTx) {
        return {
          supported: true,
          applied: false,
          balance: Number(existingTx.balance_after) || currentBalance,
        }
      }
    }

    const nextBalance =
      txType === 'debit'
        ? Math.max(0, currentBalance - normalizedAmount)
        : currentBalance + normalizedAmount

    const { error: upErr } = await supabase
      .from('wallet_accounts')
      .update({ balance: nextBalance })
      .eq('user_id', userId)
    if (upErr) throw upErr

    const { error: insErr } = await supabase.from('wallet_transactions').insert([
      {
        user_id: userId,
        type: txType,
        amount: normalizedAmount,
        balance_after: nextBalance,
        description: description || null,
        external_ref: externalRef ? String(externalRef) : null,
        meta: meta || null,
      },
    ])
    if (insErr) throw insErr

    return { supported: true, applied: true, balance: nextBalance }
  } catch (error) {
    if (isMissingWalletSchema(error)) return { supported: false, applied: false, balance: 0 }
    throw error
  }
}

export async function fetchWalletTransactionsSafe(userId, limit = 30) {
  if (!userId) return { supported: false, rows: [] }
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('id, type, amount, balance_after, description, external_ref, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(100, Number(limit) || 30)))
    if (error) throw error
    return { supported: true, rows: Array.isArray(data) ? data : [] }
  } catch (error) {
    if (isMissingWalletSchema(error)) return { supported: false, rows: [] }
    throw error
  }
}
