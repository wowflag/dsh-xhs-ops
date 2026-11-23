// dsh-xhs-ops - local persistence.
// One JSON document for the workbench plus one 0600 file for the account
// cookie. Nothing is written into the profile config; the cookie never
// appears in a response body or a log line.

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const STATE_VERSION = 1

export function dataDir() {
  const override = process.env.DSH_XHS_OPS_DIR
  const dir = typeof override === 'string' && override.trim() !== ''
    ? override.trim()
    : join(homedir(), '.dsh', 'xhs-ops')
  mkdirSync(dir, { recursive: true })
  return dir
}

function statePath() {
  return join(dataDir(), 'state.json')
}

function secretPath() {
  return join(dataDir(), 'account.json')
}

export function defaultState() {
  return {
    version: STATE_VERSION,
    updatedAt: 0,
    account: {
      status: 'unlinked',
      nickname: '',
      userId: '',
      checkedAt: 0,
      lastError: '',
      lastProbe: '',
    },
    settings: {
      aiEnabled: true,
      publishMode: 'draft',
      creatorUrl: 'https://creator.xiaohongshu.com/publish/publish',
      crawlFirst: true,
      profileUserId: '',
    },
    research: { keyword: '', type: '', items: [], updatedAt: 0 },
    notes: [],
    metrics: [],
    reviews: [],
    comments: { captured: [], monitor: [], noteTitle: '', updatedAt: 0 },
    reply: { persona: '专业顾问', replyRatio: 0.6, lastDraft: null },
  }
}

function mergeState(raw) {
  const base = defaultState()
  if (!raw || typeof raw !== 'object') return base
  const out = { ...base, ...raw }
  out.account = { ...base.account, ...(raw.account || {}) }
  out.settings = { ...base.settings, ...(raw.settings || {}) }
  out.research = { ...base.research, ...(raw.research || {}) }
  out.comments = { ...base.comments, ...(raw.comments || {}) }
  out.reply = { ...base.reply, ...(raw.reply || {}) }
  out.notes = Array.isArray(raw.notes) ? raw.notes : []
  out.metrics = Array.isArray(raw.metrics) ? raw.metrics : []
  out.reviews = Array.isArray(raw.reviews) ? raw.reviews : []
  return out
}

export function loadState() {
  const path = statePath()
  if (!existsSync(path)) return defaultState()
  try {
    return mergeState(JSON.parse(readFileSync(path, 'utf8')))
  } catch (err) {
    return defaultState()
  }
}

export function saveState(next) {
  const state = { ...mergeState(next), version: STATE_VERSION, updatedAt: Date.now() }
  const path = statePath()
  const tmp = path + '.tmp'
  writeFileSync(tmp, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 })
  renameSync(tmp, path)
  return state
}

// Plain assignment on a fresh copy: callers keep their own references.
export function patchState(current, mutate) {
  const next = JSON.parse(JSON.stringify(current))
  const result = mutate(next)
  return saveState(result && typeof result === 'object' ? result : next)
}

export function readAccountSecret() {
  const path = secretPath()
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    if (!raw || typeof raw.cookie !== 'string' || raw.cookie === '') return null
    return raw
  } catch (err) {
    return null
  }
}

export function writeAccountSecret(cookie) {
  const path = secretPath()
  const tmp = path + '.tmp'
  const body = JSON.stringify({ cookie, savedAt: Date.now() }, null, 2)
  writeFileSync(tmp, body, { encoding: 'utf8', mode: 0o600 })
  renameSync(tmp, path)
  try { chmodSync(path, 0o600) } catch (err) { /* best effort on non-POSIX */ }
}

export function clearAccountSecret() {
  const path = secretPath()
  if (!existsSync(path)) return
  try {
    writeFileSync(path, JSON.stringify({ cookie: '', savedAt: Date.now() }), { encoding: 'utf8', mode: 0o600 })
  } catch (err) { /* ignore */ }
}

// ============================================================================
// 多账号矩阵（v0.3 新增）
// 单账号 account.json 之上再叠一个 accounts.json（0600），存多账号 Cookie 池。
// 每个账号：{ id, label, nickname, userId, cookie, savedAt, active }
// active 账号的 cookie 会被写入 account.json，作为「当前账号」供抓取使用，
// 从而与既有的 readAccountSecret / writeAccountSecret 无缝衔接。
// ============================================================================

function accountsPath() {
  return join(dataDir(), 'accounts.json')
}

export function readAccounts() {
  const path = accountsPath()
  if (!existsSync(path)) return []
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(raw) ? raw : []
  } catch (err) {
    return []
  }
}

function writeAccounts(list) {
  const path = accountsPath()
  const tmp = path + '.tmp'
  writeFileSync(tmp, JSON.stringify(list, null, 2), { encoding: 'utf8', mode: 0o600 })
  renameSync(tmp, path)
  try { chmodSync(path, 0o600) } catch (err) { /* best effort */ }
}

// 生成一个稳定但不可猜测的账号 id（不含 cookie 内容）
function accountId(label, seq) {
  return 'acct_' + Date.now().toString(36) + '_' + seq.toString(36)
}

// 新增/更新一个账号。返回账号列表（脱敏：cookie 不进返回值）。
export function upsertAccount(input) {
  const list = readAccounts()
  const label = String((input && input.label) || '').trim() || '账号 ' + (list.length + 1)
  const cookie = normalizeCookieForStore(input && input.cookie)
  if (cookie === '') {
    return { ok: false, reason: 'bad-cookie', message: 'Cookie 为空或格式不对。', accounts: publicAccounts(list) }
  }
  const existing = list.find((a) => a.label === label)
  if (existing) {
    existing.cookie = cookie
    existing.savedAt = Date.now()
    if (input && input.nickname) existing.nickname = String(input.nickname)
    if (input && input.userId) existing.userId = String(input.userId)
  } else {
    list.push({
      id: accountId(label, list.length),
      label,
      nickname: String((input && input.nickname) || ''),
      userId: String((input && input.userId) || ''),
      cookie,
      savedAt: Date.now(),
      active: list.length === 0,
    })
  }
  writeAccounts(list)
  return { ok: true, accounts: publicAccounts(list), activeId: activeAccountId(list) }
}

// 切换到某个账号：把该账号 cookie 写入 account.json 作为当前账号。
export function switchAccount(id) {
  const list = readAccounts()
  const target = list.find((a) => a.id === id)
  if (!target) return { ok: false, reason: 'not-found', message: '账号不存在：' + String(id), accounts: publicAccounts(list) }
  list.forEach((a) => { a.active = a.id === id })
  writeAccounts(list)
  writeAccountSecret(target.cookie)
  return { ok: true, accounts: publicAccounts(list), active: publicAccountOne(target) }
}

export function removeAccount(id) {
  const list = readAccounts()
  const idx = list.findIndex((a) => a.id === id)
  if (idx === -1) return { ok: false, reason: 'not-found', message: '账号不存在', accounts: publicAccounts(list) }
  const wasActive = list[idx].active
  list.splice(idx, 1)
  if (list.length > 0 && wasActive) {
    list[0].active = true
    writeAccountSecret(list[0].cookie)
  }
  writeAccounts(list)
  return { ok: true, accounts: publicAccounts(list), activeId: activeAccountId(list) }
}

function activeAccountId(list) {
  const a = list.find((x) => x.active)
  return a ? a.id : (list[0] ? list[0].id : null)
}

// 脱敏：对外只暴露元信息，绝不带 cookie。
function publicAccountOne(a) {
  return { id: a.id, label: a.label, nickname: a.nickname, userId: a.userId, active: !!a.active, savedAt: a.savedAt }
}

export function publicAccounts(list) {
  return (Array.isArray(list) ? list : readAccounts()).map(publicAccountOne)
}

// 与 xhs.js 的 normalizeCookie 解耦，store 只做「非空 + 含 =」的轻校验，
// 真正的归一化在 link 时由 xhs.js 完成。
function normalizeCookieForStore(cookie) {
  const s = String(cookie || '').trim()
  return s.includes('=') ? s : ''
}
