// dsh-xhs-ops - Host half.
// Wires the workbench page and the Settings > 小红书账号 page (same-origin
// routes under /dsh-xhs-ops/api) and the `xhs_ops` model tool onto one
// implementation in dsh/lib/ops.js.
//
// The plugin never posts, comments or publishes on Xiaohongshu. Publishing is
// a draft package handed to the official creator page for a manual publish;
// comment replies are draft-only (copy-to-clipboard), never auto-sent.

import * as ops from './lib/ops.js'

export const name = 'dsh-xhs-ops'
export const inject = []

const BODY_LIMIT = 1_000_000

function sendJson(res, code, body) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > BODY_LIMIT) throw new Error('body too large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') return {}
  return JSON.parse(text)
}

const ROUTES = [
  { path: '/dsh-xhs-ops/api/state', method: 'GET', run: () => ops.snapshot() },
  { path: '/dsh-xhs-ops/api/account/login', method: 'POST', run: (body) => ops.loginAttempt(body) },
  { path: '/dsh-xhs-ops/api/account/link', method: 'POST', run: (body) => ops.linkAccount(body) },
  { path: '/dsh-xhs-ops/api/account/profile', method: 'POST', run: (body) => ops.setProfile(body) },
  { path: '/dsh-xhs-ops/api/account/check', method: 'POST', run: () => ops.checkAccount() },
  { path: '/dsh-xhs-ops/api/account/unlink', method: 'POST', run: () => ops.unlinkAccount() },
  { path: '/dsh-xhs-ops/api/research/run', method: 'POST', run: (body) => ops.runResearch(body) },
  { path: '/dsh-xhs-ops/api/research/import', method: 'POST', run: (body) => ops.importResearch(body) },
  { path: '/dsh-xhs-ops/api/hot/rank', method: 'POST', run: () => ops.hotRank() },
  { path: '/dsh-xhs-ops/api/compose/generate', method: 'POST', run: (body) => ops.compose(body) },
  { path: '/dsh-xhs-ops/api/compliance/check', method: 'POST', run: (body) => ops.compliance(body) },
  { path: '/dsh-xhs-ops/api/compliance/rewrite', method: 'POST', run: (body) => ops.complianceRewrite(body) },
  { path: '/dsh-xhs-ops/api/notes/save', method: 'POST', run: (body) => ops.saveNote(body) },
  { path: '/dsh-xhs-ops/api/notes/delete', method: 'POST', run: (body) => ops.deleteNote(body) },
  { path: '/dsh-xhs-ops/api/publish/draft', method: 'POST', run: (body) => ops.publishDraft(body) },
  { path: '/dsh-xhs-ops/api/publish/queue', method: 'POST', run: (body) => ops.queueNote(body) },
  { path: '/dsh-xhs-ops/api/review/summary', method: 'POST', run: (body) => ops.review(body) },
  { path: '/dsh-xhs-ops/api/review/import', method: 'POST', run: (body) => ops.importMyMetrics(body) },
  { path: '/dsh-xhs-ops/api/comments/scan', method: 'POST', run: (body) => ops.scanComments(body) },
  { path: '/dsh-xhs-ops/api/comments/import', method: 'POST', run: (body) => ops.importComments(body) },
  { path: '/dsh-xhs-ops/api/rank', method: 'POST', run: (body) => ops.rank(body) },
  { path: '/dsh-xhs-ops/api/accounts/add', method: 'POST', run: (body) => ops.accountAdd(body) },
  { path: '/dsh-xhs-ops/api/accounts/list', method: 'POST', run: () => ops.accountList() },
  { path: '/dsh-xhs-ops/api/accounts/switch', method: 'POST', run: (body) => ops.accountSwitch(body) },
  { path: '/dsh-xhs-ops/api/accounts/remove', method: 'POST', run: (body) => ops.accountRemove(body) },
  { path: '/dsh-xhs-ops/api/reply/draft', method: 'POST', run: (body) => ops.replyDraft(body) },
  { path: '/dsh-xhs-ops/api/reply/hybrid', method: 'POST', run: (body) => ops.hybrid(body) },
  { path: '/dsh-xhs-ops/api/reply/persona', method: 'POST', run: (body) => ops.setReplyPersona(body) },
  { path: '/dsh-xhs-ops/api/export', method: 'GET', run: () => ops.exportAll() },
  { path: '/dsh-xhs-ops/api/reset', method: 'POST', run: () => ops.resetLocal() },
]

function registerRoutes(webServer) {
  for (const route of ROUTES) {
    webServer.register({
      name: 'dsh-xhs-ops' + route.path.replace(/[^a-z0-9]+/gi, '-'),
      kind: 'exact',
      path: route.path,
      handler: async (req, res) => {
        try {
          const method = (req.method || 'GET').toUpperCase()
          if (method !== route.method) {
            sendJson(res, 405, { ok: false, message: 'method not allowed' })
            return
          }
          const body = route.method === 'POST' ? await readBody(req) : {}
          const result = await route.run(body)
          sendJson(res, 200, result)
        } catch (err) {
          sendJson(res, 500, { ok: false, message: String(err && err.message ? err.message : err) })
        }
      },
    })
  }
}

const ACTIONS = {
  status: () => ops.snapshot(),
  login: (args) => ops.loginAttempt(args),
  link: (args) => ops.linkAccount(args),
  check: () => ops.checkAccount(),
  unlink: () => ops.unlinkAccount(),
  set_profile: (args) => ops.setProfile(args),
  research: (args) => ops.runResearch(args),
  research_import: (args) => ops.importResearch(args),
  hot_rank: () => ops.hotRank(),
  compose: (args) => ops.compose(args),
  compliance: (args) => ops.compliance(args),
  compliance_rewrite: (args) => ops.complianceRewrite(args),
  save_note: (args) => ops.saveNote(args),
  delete_note: (args) => ops.deleteNote(args),
  publish_draft: (args) => ops.publishDraft(args),
  queue_note: (args) => ops.queueNote(args),
  review: (args) => ops.review(args),
  review_import: (args) => ops.importMyMetrics(args),
  comments_scan: (args) => ops.scanComments(args),
  comments_import: (args) => ops.importComments(args),
  rank: (args) => ops.rank(args),
  account_add: (args) => ops.accountAdd(args),
  account_list: () => ops.accountList(),
  account_switch: (args) => ops.accountSwitch(args),
  account_remove: (args) => ops.accountRemove(args),
  reply_draft: (args) => ops.replyDraft(args),
  hybrid: (args) => ops.hybrid(args),
  reply_persona: (args) => ops.setReplyPersona(args),
  export: () => ops.exportAll(),
  reset: () => ops.resetLocal(),
}

function registerTool(tools) {
  tools.register({
    name: 'xhs_ops',
    description: 'Xiaohongshu (小红书) operations workbench: research by keyword, hot ranking, compose a note with an automatic compliance pass, build a publish draft package for manual publishing, review the account\'s own notes, rank comments / keywords / hot notes, generate comment reply drafts (五类回复策略 + 人设 + 合规自检), plan a comment hybrid rhythm (真人感回复节奏 + 舆论监测分级), and manage a multi-account matrix. Read-only against Xiaohongshu: it never posts, comments or publishes — reply drafts are copy-to-clipboard only, the human pastes and sends manually. Crawls server-rendered pages with the saved cookie; when a page is client-rendered or login-walled it returns the reason so you can fall back to the browser or to an import.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: Object.keys(ACTIONS),
          description: 'status | login | link | check | unlink | set_profile | research | research_import | hot_rank | compose | compliance | compliance_rewrite | save_note | delete_note | publish_draft | queue_note | review | review_import | comments_scan | comments_import | rank | account_add | account_list | account_switch | account_remove | reply_draft | hybrid | reply_persona | export | reset',
        },
        cookie: { type: 'string', description: 'action=link: the full Cookie header copied from a logged-in xiaohongshu.com page.' },
        phone: { type: 'string', description: 'action=login: account phone. The password is never stored; this only explains the available authorization paths.' },
        password: { type: 'string', description: 'action=login: never stored, never sent anywhere. Present only so the tool mirrors the form.' },
        url: { type: 'string', description: 'action=comments_scan: a note URL copied from the address bar. It must carry xsec_token, otherwise the page 404s. action=set_profile: a profile URL.' },
        userId: { type: 'string', description: 'action=set_profile: a bare profile user id.' },
        keyword: { type: 'string', description: 'Research keyword.' },
        type: { type: 'string', description: 'Research type label, or note form (图文/视频/长文) for compose.' },
        text: { type: 'string', description: 'action=compliance / compliance_rewrite: the copy to scan.' },
        title: { type: 'string', description: 'action=compose: note title.' },
        template: { type: 'string', description: 'action=compose: 种草测评 | 干货教程 | 避坑清单 | 日常 vlog | 对比横评' },
        points: { type: 'string', description: 'action=compose: selling points separated by newline or comma.' },
        tags: { type: 'string', description: 'action=compose: topic tags separated by space or comma.' },
        id: { type: 'string', description: 'Note id for publish_draft / queue_note / delete_note.' },
        date: { type: 'string', description: 'action=queue_note: planned date, e.g. 2026-11-12.' },
        slot: { type: 'string', description: 'action=queue_note: planned time slot, e.g. 19:00-21:00.' },
        days: { type: 'number', description: 'action=review: window in days; 0 or omitted means all.' },
        noteTitle: { type: 'string', description: 'action=comments_import: the note these comments belong to.' },
        keywords: { type: 'string', description: 'action=rank mode=keyword: comma separated keywords.' },
        mode: { type: 'string', enum: ['comment', 'keyword', 'hot'], description: 'action=rank: which ranking to build.' },
        label: { type: 'string', description: 'action=account_add: a human label for this account (e.g. 主号 / 小号A).' },
        nickname: { type: 'string', description: 'action=account_add: account nickname, optional.' },
        accountId: { type: 'string', description: 'action=account_switch / account_remove: the account id (from account_list).' },
        persona: { type: 'string', enum: ['专业顾问', '亲切姐妹', '干货老司机', '品牌官方'], description: 'action=reply_draft / reply_persona: reply persona (tone/话术).' },
        replyRatio: { type: 'number', description: 'action=hybrid: how many comments to reply to, 0.1-1.0 (default 0.6).' },
        items: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Rows for research_import / comments_import / review_import.' },
        note: { type: 'object', additionalProperties: true, description: 'action=save_note: {id?, title, body, tags[], noteType}' },
      },
      required: ['action'],
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    timeoutMs: 90000,
    async execute(args) {
      const action = args && args.action
      const run = ACTIONS[action]
      if (!run) return { ok: false, message: '未知 action：' + String(action) }
      return run(args || {})
    },
  })
}

export function apply(ctx) {
  if (typeof ctx.inject !== 'function') return

  ctx.inject(['webServer'], (scope) => {
    const webServer = scope.webServer
    if (!webServer || typeof webServer.register !== 'function') {
      console.error('[dsh-xhs-ops] webServer unavailable; routes skipped')
      return
    }
    registerRoutes(webServer)
  })

  ctx.inject(['tools'], (scope) => {
    const tools = scope.tools
    if (!tools || typeof tools.register !== 'function') {
      console.error('[dsh-xhs-ops] tools unavailable; xhs_ops skipped')
      return
    }
    registerTool(tools)
  })
}
