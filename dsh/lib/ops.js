// dsh-xhs-ops - operations.
// One implementation for both callers: the workbench page calls these through
// /dsh-xhs-ops/api/*, and the agent calls the same functions through the
// `xhs_ops` tool.

import {
  loadState, saveState, readAccountSecret, writeAccountSecret, clearAccountSecret, defaultState,
  readAccounts, publicAccounts, upsertAccount, switchAccount, removeAccount,
} from './store.js'
import { checkCompliance, rewriteCompliance, ruleCatalog } from './compliance.js'
import { researchSummary, reviewSummary, rankForSeize, rankForMonitor, composeDraft, replyStrategies, hybridEngine } from './analysis.js'
import {
  normalizeCookie,
  probeAccount,
  crawlSearchPage,
  crawlExplorePage,
  crawlProfilePage,
  crawlNotePage,
  extractNoteId,
  extractUserId,
  normalizeImportedComment,
  normalizeImportedNote,
  buildDraftPackage,
} from './xhs.js'

function publicAccount(state) {
  const account = state.account || {}
  return {
    status: account.status || 'unlinked',
    nickname: account.nickname || '',
    userId: account.userId || '',
    checkedAt: account.checkedAt || 0,
    lastError: account.lastError || '',
    lastProbe: account.lastProbe || '',
  }
}

export function snapshot() {
  const state = loadState()
  const accounts = readAccounts()
  return {
    ok: true,
    account: publicAccount(state),
    accounts: publicAccounts(accounts),
    settings: state.settings,
    research: state.research,
    notes: state.notes,
    metrics: state.metrics || [],
    reviews: state.reviews,
    comments: {
      count: state.comments && state.comments.captured ? state.comments.captured.length : 0,
      noteTitle: state.comments ? state.comments.noteTitle : '',
      updatedAt: state.comments ? state.comments.updatedAt : 0,
    },
    reply: state.reply || { persona: '专业顾问', replyRatio: 0.6, lastDraft: null },
    rules: ruleCatalog(),
    now: Date.now(),
  }
}

function withState(mutate) {
  const state = loadState()
  const next = mutate(state) || state
  return saveState(next)
}

function interactionOf(note) {
  return (Number(note.likes) || 0) + (Number(note.collects) || 0) + (Number(note.comments) || 0) + (Number(note.shares) || 0)
}

// Login: Xiaohongshu's web client exposes no password endpoint that works
// without the request signature, so this reports the two paths that do work
// instead of pretending to authenticate. The password is never stored.
export function loginAttempt(input) {
  const phone = String((input && input.phone) || '').trim()
  return {
    ok: false,
    reason: 'no-password-endpoint',
    message: phone === ''
      ? '小红书网页端没有对第三方开放的账号密码登录接口，请用下面两种可用方式之一。'
      : '小红书网页端没有对第三方开放的账号密码登录接口（只有扫码 / 短信验证码，且接口需要 x-s 签名）。密码不会被保存，也不会发到任何地方。',
    ways: [
      '方式一：粘贴 Cookie（本机 0600 保存），插件带 Cookie 抓取页面数据',
      '方式二：在对话里说「登录小红书」，我打开浏览器由你登录，然后代抓并把数据写回工作台',
    ],
  }
}

export async function linkAccount(input) {
  const cookie = normalizeCookie(input && input.cookie)
  if (cookie === '') {
    return { ok: false, reason: 'bad-cookie', message: 'Cookie 为空或格式不对。请粘贴形如 a1=...; web_session=... 的一整行。' }
  }
  const probe = await probeAccount(cookie)
  if (probe.ok) {
    writeAccountSecret(cookie)
    withState((state) => {
      state.account = {
        status: 'linked',
        nickname: probe.user.nickname,
        userId: probe.user.userId || state.settings.profileUserId || '',
        checkedAt: Date.now(),
        lastError: '',
        lastProbe: 'user/me ok',
      }
      if (probe.user.userId) state.settings.profileUserId = probe.user.userId
    })
    return { ok: true, account: probe.user, message: '账号已连接：' + (probe.user.nickname || probe.user.userId) }
  }
  if (probe.cookieAccepted) {
    writeAccountSecret(cookie)
    withState((state) => {
      state.account = {
        ...state.account,
        status: 'risk',
        checkedAt: Date.now(),
        lastError: probe.message,
        lastProbe: 'HTTP ' + probe.status,
      }
    })
    return { ok: false, reason: 'risk', message: probe.message, saved: true }
  }
  return { ok: false, reason: probe.reason || 'probe-failed', message: probe.message || '账号校验失败' }
}

export function setProfile(input) {
  const url = String((input && input.url) || '')
  const userId = extractUserId(url) || String((input && input.userId) || '')
  if (userId === '') return { ok: false, reason: 'bad-url', message: '没识别到用户 ID，请粘贴主页链接（形如 /user/profile/xxxx）。' }
  withState((state) => {
    state.settings.profileUserId = userId
    state.account.userId = userId
  })
  return { ok: true, userId, message: '已记录主页 ID：' + userId }
}

export function unlinkAccount() {
  clearAccountSecret()
  withState((state) => {
    state.account = { status: 'unlinked', nickname: '', userId: '', checkedAt: 0, lastError: '', lastProbe: '' }
  })
  return { ok: true, message: '已断开账号，本地凭据已清除' }
}

export async function checkAccount() {
  const secret = readAccountSecret()
  if (!secret) return { ok: false, reason: 'unlinked', message: '还没有保存 Cookie，请先在设置里授权。' }
  const probe = await probeAccount(secret.cookie)
  withState((state) => {
    if (probe.ok) {
      state.account = {
        ...state.account,
        status: 'linked',
        nickname: probe.user.nickname,
        userId: probe.user.userId || state.account.userId,
        checkedAt: Date.now(),
        lastError: '',
        lastProbe: 'user/me ok',
      }
    } else {
      state.account = {
        ...state.account,
        status: probe.cookieAccepted ? 'risk' : 'expired',
        checkedAt: Date.now(),
        lastError: probe.message || '',
        lastProbe: 'HTTP ' + probe.status,
      }
    }
  })
  return probe
}

// Research: keyword -> search page crawl. Falls back to stored data, then to
// an explicit import request with the reason the crawl could not run.
export async function runResearch(input) {
  const keyword = String((input && input.keyword) || '').trim()
  const type = String((input && input.type) || '').trim()
  const secret = readAccountSecret()
  const state = loadState()

  if (keyword !== '') {
    const crawled = await crawlSearchPage(secret ? secret.cookie : '', keyword)
    if (crawled.ok) {
      withState((current) => {
        current.research = { keyword, type, items: crawled.notes, topics: crawled.topics || [], updatedAt: Date.now() }
      })
      return { ...researchSummary(crawled.notes, keyword), mode: 'crawl', count: crawled.notes.length, topics: crawled.topics || [] }
    }
    if (crawled.reason === 'client-rendered' || crawled.reason === 'login-required') {
      return { ok: false, reason: crawled.reason, mode: 'crawl', message: crawled.message, needsImport: true, keyword }
    }
    // A typed keyword that yields nothing new can still reuse stored rows.
    const stored = (state.research.items || []).filter((note) => note.title.includes(keyword) || (note.desc || '').includes(keyword))
    if (stored.length > 0) {
      return { ...researchSummary(stored, keyword), mode: 'stored', reason: crawled.reason, message: crawled.message }
    }
    return { ok: false, reason: crawled.reason, mode: 'crawl', message: crawled.message, needsImport: true, keyword }
  }

  const items = (state.research.items || [])
  if (items.length > 0) return { ...researchSummary(items, state.research.keyword), mode: 'stored' }
  return {
    ok: false,
    reason: 'no-data',
    needsImport: true,
    message: '还没有数据：填写关键词抓取，或直接导入竞品笔记。',
    hint: '粘贴格式：标题 | 作者 | 赞 | 收藏 | 评论',
  }
}

export function importResearch(input) {
  const raw = input && Array.isArray(input.items) ? input.items : []
  const items = raw.map((row) => normalizeImportedNote(row)).filter((item) => item.title !== '' || item.id !== '')
  if (items.length === 0) return { ok: false, reason: 'empty', message: '没有识别到有效笔记行。每行至少要有标题。' }
  const keyword = String((input && input.keyword) || '')
  withState((state) => {
    state.research = { keyword, type: String((input && input.type) || '导入'), items, updatedAt: Date.now() }
  })
  return { ...researchSummary(items, keyword), mode: 'import', count: items.length }
}

// Hot: the explore feed ranks by engagement; topics come along when present.
export async function hotRank() {
  const secret = readAccountSecret()
  const crawled = await crawlExplorePage(secret ? secret.cookie : '')
  if (!crawled.ok) return { ok: false, reason: crawled.reason, message: crawled.message }
  const notes = crawled.notes
    .map((note) => ({ ...note, interaction: interactionOf(note) }))
    .sort((a, b) => b.interaction - a.interaction)
  const topics = crawled.topics || []
  return {
    ok: true,
    total: notes.length,
    notes: notes.slice(0, 20),
    topics: topics.slice(0, 20),
    insights: notes.length === 0
      ? ['首页没有返回推荐笔记。']
      : [
        '抓到 ' + notes.length + ' 篇推荐笔记，互动最高 ' + notes[0].interaction + '。',
        topics.length > 0 ? '同时抓到 ' + topics.length + ' 个热词，可挑选与账号定位相关的做选题。' : '这次没有解析到热词，热词区可能改为前端渲染。',
      ],
  }
}

// Review: pull the account's own notes from its profile page.
export async function review(input) {
  const days = Number((input && input.days) || 0)
  const state = loadState()
  const secret = readAccountSecret()
  const userId = (state.settings && state.settings.profileUserId) || (state.account && state.account.userId) || ''

  let rows = null
  let mode = 'stored'
  if (secret && userId) {
    const crawled = await crawlProfilePage(secret.cookie, userId)
    if (crawled.ok) {
      rows = crawled.notes
      mode = 'crawl'
      withState((current) => {
        current.metrics = crawled.notes
      })
    } else {
      const storedMetrics = state.metrics || []
      if (storedMetrics.length > 0) rows = storedMetrics
      else return { ok: false, reason: crawled.reason, message: crawled.message + '（先在设置里填写主页链接，或用「导入我的数据」）' }
    }
  } else {
    rows = (state.metrics && state.metrics.length > 0) ? state.metrics : null
    if (!rows) {
      return {
        ok: false,
        reason: secret ? 'no-user' : 'unlinked',
        message: secret ? '还没有主页 ID：请在设置里粘贴你的主页链接。' : '还没有授权账号，复盘需要先连接账号或导入数据。',
      }
    }
  }

  const summary = reviewSummary(rows, days)
  if (summary.ok) {
    withState((current) => {
      current.reviews = [{
        id: 'r' + Date.now().toString(36),
        range: summary.range,
        totals: summary.totals,
        collectLikeRatio: summary.collectLikeRatio,
        createdAt: Date.now(),
      }].concat(current.reviews || []).slice(0, 20)
    })
  }
  return { ...summary, mode }
}

export async function scanComments(input) {
  const url = String((input && input.url) || '')
  const noteId = extractNoteId(url)
  if (url.trim() === '') return { ok: false, reason: 'bad-url', message: '请粘贴笔记页地址栏里的完整链接（含 xsec_token）。' }

  const secret = readAccountSecret()
  if (!secret) {
    return { ok: false, reason: 'unlinked', needsImport: true, noteId, message: '还没有授权账号，无法抓取评论区。可以先授权，或直接导入评论。' }
  }
  // Pass the raw URL through: the crawl needs the xsec_token it carries.
  const crawled = await crawlNotePage(secret.cookie, url)
  if (!crawled.ok) {
    return { ok: false, reason: crawled.reason, needsImport: true, noteId, message: crawled.message }
  }
  withState((state) => {
    state.comments = {
      ...state.comments,
      captured: crawled.comments,
      noteId,
      noteTitle: crawled.note ? crawled.note.title : '',
      updatedAt: Date.now(),
    }
  })
  return { ok: true, noteId, count: crawled.comments.length, noteTitle: crawled.note ? crawled.note.title : '', comments: crawled.comments }
}

export function importComments(input) {
  const raw = input && Array.isArray(input.items) ? input.items : []
  const noteTitle = String((input && input.noteTitle) || '')
  const items = raw.map((row) => normalizeImportedComment(row, noteTitle)).filter((item) => item.content !== '')
  if (items.length === 0) return { ok: false, reason: 'empty', message: '没有识别到有效评论行。' }
  withState((state) => {
    state.comments = { ...state.comments, captured: items, noteTitle, updatedAt: Date.now() }
  })
  return { ok: true, count: items.length, comments: items }
}

// Ranking: one entry point, three modes.
export function rank(input) {
  const mode = ['keyword', 'hot'].includes(input && input.mode) ? input.mode : 'comment'
  const state = loadState()
  const captured = (state.comments && state.comments.captured) || []
  if (mode === 'hot') {
    const rows = (state.research.items || []).map((note) => ({ ...note, interaction: interactionOf(note) }))
    if (rows.length === 0) return { ok: false, reason: 'empty', message: '还没有热点数据：去「调研」抓一次，或导入笔记。' }
    rows.sort((a, b) => b.interaction - a.interaction)
    return {
      ok: true,
      mode: 'hot',
      total: rows.length,
      items: rows.slice(0, 20).map((note) => ({
        title: note.title,
        author: note.author,
        likes: Number(note.likes) || 0,
        collects: Number(note.collects) || 0,
        comments: Number(note.comments) || 0,
        interaction: note.interaction,
        url: note.url || '',
      })),
    }
  }
  if (mode === 'keyword') {
    return { ...rankForMonitor(captured, (input && input.keywords) || ''), mode: 'keyword' }
  }
  return { ...rankForSeize(captured, state.comments ? state.comments.noteTitle : ''), mode: 'comment' }
}

// Compose: draft plus an automatic compliance pass, so the two are one step.
export function compose(input) {
  const draft = composeDraft(input)
  if (!draft.ok) return draft
  const checked = checkCompliance(draft.title + '\n' + draft.body)
  return { ...draft, compliance: checked }
}

export function compliance(input) {
  return checkCompliance(input && input.text)
}

export function complianceRewrite(input) {
  return rewriteCompliance(input && input.text)
}

export function saveNote(input) {
  const note = (input && input.note) || {}
  const title = String(note.title || '').trim()
  if (title === '') return { ok: false, reason: 'empty', message: '标题为空，先起一个标题。' }
  const tags = Array.isArray(note.tags) ? note.tags.map((tag) => String(tag).replace(/^#/, '').trim()).filter(Boolean) : []
  const body = String(note.body || '')
  const checked = checkCompliance(body + ' ' + title)

  const saved = withState((state) => {
    const list = Array.isArray(state.notes) ? state.notes : []
    const existing = note.id ? list.find((item) => item.id === note.id) : null
    if (existing) {
      existing.title = title
      existing.body = body
      existing.tags = tags
      existing.noteType = String(note.noteType || existing.noteType || '图文')
      existing.template = String(note.template || existing.template || '')
      existing.updatedAt = Date.now()
      existing.compliance = { score: checked.score, level: checked.level }
      return state
    }
    list.unshift({
      id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      body,
      tags,
      noteType: String(note.noteType || '图文'),
      template: String(note.template || ''),
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      compliance: { score: checked.score, level: checked.level },
    })
    state.notes = list
    return state
  })

  const created = (saved.notes || []).find((item) => item.title === title && item.body === body)
  return { ok: true, notes: saved.notes, noteId: created ? created.id : '', message: '已存入草稿箱' }
}

export function deleteNote(input) {
  const id = String((input && input.id) || '')
  const saved = withState((state) => {
    state.notes = (state.notes || []).filter((note) => note.id !== id)
    return state
  })
  return { ok: true, notes: saved.notes }
}

export function publishDraft(input) {
  const id = String((input && input.id) || '')
  const state = loadState()
  const note = (state.notes || []).find((item) => item.id === id)
  if (!note) return { ok: false, reason: 'not-found', message: '找不到这篇草稿。' }
  const pkg = buildDraftPackage(note, state.settings)
  const checked = checkCompliance((note.body || '') + ' ' + (note.title || ''))
  withState((current) => {
    const target = (current.notes || []).find((item) => item.id === id)
    if (target) {
      target.draftPackage = pkg
      target.draftGeneratedAt = Date.now()
    }
    return current
  })
  return {
    ok: true,
    id,
    package: pkg,
    compliance: { score: checked.score, level: checked.level, high: checked.summary.high },
    mode: 'draft-manual',
    message: '已生成发布包，请到创作平台存草稿后人工发布',
  }
}

export function queueNote(input) {
  const id = String((input && input.id) || '')
  const date = String((input && input.date) || '').trim()
  const slot = String((input && input.slot) || '').trim()
  const saved = withState((state) => {
    const note = (state.notes || []).find((item) => item.id === id)
    if (note) {
      note.status = 'queued'
      note.scheduledFor = [date, slot].filter(Boolean).join(' ')
      note.updatedAt = Date.now()
    }
    return state
  })
  const note = (saved.notes || []).find((item) => item.id === id)
  if (!note) return { ok: false, reason: 'not-found', message: '找不到这篇草稿。' }
  return { ok: true, notes: saved.notes, scheduledFor: note.scheduledFor, message: '已加入发布队列（草稿模式）' }
}

export function importMyMetrics(input) {
  const raw = input && Array.isArray(input.items) ? input.items : []
  const rows = raw.map((row) => normalizeImportedNote(row)).filter((item) => item.title !== '')
  if (rows.length === 0) return { ok: false, reason: 'empty', message: '没有识别到有效数据行。' }
  withState((state) => {
    state.metrics = rows
  })
  return { ok: true, count: rows.length, message: '已导入 ' + rows.length + ' 篇自有笔记数据' }
}

export function exportAll() {
  return { ok: true, state: loadState() }
}

export function resetLocal() {
  clearAccountSecret()
  saveState(defaultState())
  return { ok: true, message: '已清空本地数据与账号凭据' }
}

// ============================================================================
// 多账号矩阵（v0.3 新增）
// ============================================================================

// 新增/更新一个账号（多账号池）。返回脱敏的账号列表。
export function accountAdd(input) {
  return upsertAccount(input)
}

// 列出所有账号（脱敏）。
export function accountList() {
  return { ok: true, accounts: publicAccounts(readAccounts()) }
}

// 切换当前账号。
export function accountSwitch(input) {
  return switchAccount((input && (input.id || input.accountId)))
}

// 移除一个账号。
export function accountRemove(input) {
  return removeAccount((input && (input.id || input.accountId)))
}

// ============================================================================
// 评论运营：回复策略 + 评论混动（v0.3 新增）
// 只生成草稿，绝不自动发送。
// ============================================================================

// 对已抓取/已导入的评论，生成回复草稿（五类策略 + 人设 + 合规提示）。
export function replyDraft(input) {
  const state = loadState()
  const comments = (state.comments && state.comments.captured) || []
  if (comments.length === 0) {
    return { ok: false, reason: 'empty', message: '还没有评论数据，先去「评论·热点」抓取或导入评论。' }
  }
  const persona = String((input && input.persona) || state.reply?.persona || '专业顾问')
  const result = replyStrategies(comments, { persona })

  // 对每条回复草稿做合规自检（复用现有合规引擎，保证回复本身不踩红线）
  if (result.ok) {
    result.replies = result.replies.map((row) => {
      const check = checkCompliance(row.reply)
      return { ...row, compliance: { score: check.score, level: check.level, hits: check.hits.map((h) => h.term) } }
    })
  }

  withState((s) => {
    s.reply = { ...(s.reply || {}), persona, lastDraft: { at: Date.now(), ready: result.ok ? result.ready : 0 } }
  })
  return result
}

// 评论混动：节奏规划 + 舆论监测分级。
export function hybrid(input) {
  const state = loadState()
  const comments = (state.comments && state.comments.captured) || []
  if (comments.length === 0) {
    return { ok: false, reason: 'empty', message: '还没有评论数据。' }
  }
  const replyRatio = input && input.replyRatio != null ? Number(input.replyRatio) : (state.reply?.replyRatio ?? 0.6)
  const result = hybridEngine(comments, { replyRatio })
  withState((s) => {
    s.reply = { ...(s.reply || {}), replyRatio }
  })
  return result
}

// 保存回复人设偏好（persisted 到 state.reply.persona）。
export function setReplyPersona(input) {
  const persona = String((input && input.persona) || '专业顾问')
  withState((s) => {
    s.reply = { ...(s.reply || {}), persona }
  })
  return { ok: true, persona, message: '回复人设已设为：' + persona }
}
