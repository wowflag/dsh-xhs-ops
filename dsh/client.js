// dsh-xhs-ops - Browser half.
// Two surfaces, one implementation:
//   * main panel  -> the workbench (调研 / 创作 / 发布 / 复盘 / 评论·热点)
//   * settings.section -> 小红书账号 authorization (login form, cookie, profile)

window.__ModuleLoader__.load({
  id: 'dsh-xhs-ops',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var API = '/dsh-xhs-ops/api'
    var TABS = [
      ['research', '调研'],
      ['compose', '创作'],
      ['publish', '发布'],
      ['review', '复盘'],
      ['rank', '评论·热点'],
    ]

    var CSS = [
      '.xhs-page{padding:22px 26px 48px;max-width:1120px;box-sizing:border-box;font-size:13px;}',
      '.xhs-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}',
      '.xhs-title{font-size:17px;font-weight:600;margin:0;}',
      '.xhs-sub{font-size:12px;color:var(--dsw-alias-label-secondary,rgba(140,140,150,.95));}',
      '.xhs-pill{font-size:11.5px;padding:2px 9px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));}',
      '.xhs-tabs{display:flex;gap:2px;margin:16px 0;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));flex-wrap:wrap;}',
      '.xhs-tab{border:0;background:transparent;color:inherit;font:inherit;font-size:13px;padding:7px 13px;cursor:pointer;border-radius:7px 7px 0 0;opacity:.72;}',
      '.xhs-tab:hover{opacity:1;}',
      '.xhs-tab.active{opacity:1;font-weight:600;background:var(--dsw-alias-bg-layer-1,rgba(128,128,128,.1));}',
      '.xhs-card{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:11px;padding:14px 16px;margin-bottom:14px;}',
      '.xhs-card-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;}',
      '.xhs-card-title{font-size:13.5px;font-weight:600;}',
      '.xhs-grow{flex:1;}',
      '.xhs-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;}',
      '.xhs-field{display:flex;flex-direction:column;gap:5px;margin-bottom:10px;min-width:170px;flex:1;}',
      '.xhs-field>span{font-size:12px;color:var(--dsw-alias-label-secondary,rgba(140,140,150,.95));}',
      '.xhs-input,.xhs-select,.xhs-textarea{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));border-radius:8px;background:var(--dsw-alias-bg-layer-1,rgba(128,128,128,.06));color:inherit;padding:7px 9px;font:inherit;font-size:13px;}',
      '.xhs-textarea{min-height:110px;resize:vertical;line-height:1.65;}',
      '.xhs-textarea.tall{min-height:150px;}',
      '.xhs-btn{border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));background:var(--dsw-alias-bg-layer-1,rgba(128,128,128,.08));color:inherit;border-radius:8px;padding:6px 12px;font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap;}',
      '.xhs-btn:hover{background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.16));}',
      '.xhs-btn:disabled{opacity:.45;cursor:not-allowed;}',
      '.xhs-btn.primary{font-weight:600;}',
      '.xhs-btn.tiny{padding:3px 8px;font-size:11.5px;}',
      '.xhs-btn.danger{opacity:.8;}',
      '.xhs-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}',
      '.xhs-table-wrap{overflow:auto;border-radius:8px;}',
      '.xhs-table{width:100%;border-collapse:collapse;font-size:12.5px;}',
      '.xhs-table th{text-align:left;font-weight:600;padding:7px 9px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));white-space:nowrap;color:var(--dsw-alias-label-secondary,rgba(140,140,150,.95));}',
      '.xhs-table td{padding:7px 9px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.07));vertical-align:top;line-height:1.55;}',
      '.xhs-empty{padding:18px 4px;font-size:12.5px;color:var(--dsw-alias-label-secondary,rgba(140,140,150,.95));}',
      '.xhs-stats{display:flex;gap:22px;flex-wrap:wrap;margin:4px 0 12px;}',
      '.xhs-stat-label{font-size:11.5px;color:var(--dsw-alias-label-secondary,rgba(140,140,150,.95));}',
      '.xhs-stat-value{font-size:19px;font-weight:600;line-height:1.5;}',
      '.xhs-list{margin:0;padding-left:18px;line-height:1.85;font-size:12.5px;}',
      '.xhs-list li{margin-bottom:2px;}',
      '.xhs-hint{font-size:12px;line-height:1.75;color:var(--dsw-alias-label-secondary,rgba(140,140,150,.95));}',
      '.xhs-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.7;white-space:pre-wrap;word-break:break-word;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:8px;padding:10px;margin:8px 0;max-height:260px;overflow:auto;}',
      '.xhs-toast{font-size:12px;padding:6px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.12));margin-bottom:12px;}',
      '.xhs-split{display:grid;grid-template-columns:1.15fr .85fr;gap:14px;align-items:start;}',
      '@media (max-width:820px){.xhs-split{grid-template-columns:1fr;}}',
      '.xhs-reply-item{border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:9px;padding:10px 12px;margin-bottom:10px;}',
      '.xhs-reply-meta{display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap;}',
      '.xhs-reply-src{font-size:12px;color:var(--dsw-alias-label-secondary,rgba(140,140,150,.95));margin-bottom:6px;padding-left:10px;border-left:2px solid var(--dsw-alias-border-l2,rgba(0,0,0,.14));}',
      '.xhs-reply-text{font-size:12.5px;line-height:1.7;white-space:pre-wrap;word-break:break-word;}',
      '.xhs-alert{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:8px;margin-bottom:8px;font-size:12.5px;line-height:1.6;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));}',
      '.xhs-alert-high{background:rgba(220,60,60,.08);border-color:rgba(220,60,60,.28);}',
      '.xhs-alert-medium{background:rgba(230,150,40,.08);border-color:rgba(230,150,40,.28);}',
      '.xhs-alert-low{background:rgba(120,140,180,.07);border-color:rgba(120,140,180,.25);}',
      '.xhs-alert-none{background:rgba(90,180,120,.06);border-color:rgba(90,180,120,.25);}',
      '.xhs-account-row{display:flex;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));border-radius:8px;margin-bottom:8px;}',
      '.xhs-pill-active{font-weight:600;border-color:var(--dsw-alias-brand,rgba(64,128,255,.5));}',
    ].join('\n')

    function api(path, body) {
      var init = { method: body === undefined ? 'GET' : 'POST', headers: {} }
      if (body !== undefined) {
        init.headers['content-type'] = 'application/json'
        init.body = JSON.stringify(body)
      }
      return fetch(path, init).then(function (res) {
        return res.json().then(
          function (data) { return data },
          function () { return { ok: res.ok, message: 'HTTP ' + res.status } },
        )
      })
    }

    function toNum(value) {
      if (typeof value === 'number') return value
      var text = String(value === undefined || value === null ? '' : value).trim().toLowerCase()
      if (text === '') return 0
      var mult = 1
      if (text.indexOf('w') !== -1 || text.indexOf('万') !== -1) mult = 10000
      else if (text.indexOf('k') !== -1) mult = 1000
      var num = parseFloat(text.replace(/[^0-9.]/g, ''))
      return isFinite(num) ? Math.round(num * mult) : 0
    }

    function fmtNum(value) {
      var n = Number(value) || 0
      if (n >= 10000) return (Math.round(n / 100) / 100) + 'w'
      return String(n)
    }

    function fmtTime(ms) {
      if (!ms) return '—'
      var d = new Date(ms)
      var p = function (v) { return v < 10 ? '0' + v : String(v) }
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    }

    function lines(text) {
      return String(text || '').split(/\r?\n/).map(function (l) { return l.trim() }).filter(function (l) { return l !== '' })
    }

    function copy(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(String(text === undefined ? '' : text))
          return true
        }
      } catch (err) { /* fall through */ }
      return false
    }

    function apply(ctx) {
      var React
      try {
        React = require('react')
      } catch (error) {
        console.error('[dsh-xhs-ops] react unavailable: ' + error)
        return
      }
      var h = React.createElement

      var styleTag = document.createElement('style')
      styleTag.dataset.plugin = 'dsh-xhs-ops'
      styleTag.textContent = CSS
      document.head.appendChild(styleTag)
      if (typeof ctx.effect === 'function') {
        ctx.effect(function () {
          return function () { styleTag.remove() }
        }, 'dsh-xhs-ops: styles')
      }
      if (typeof ctx.inject !== 'function') return

      // ---- atoms ------------------------------------------------------
      function Btn(props) {
        var cn = 'xhs-btn' + (props.primary ? ' primary' : '') + (props.tiny ? ' tiny' : '') + (props.danger ? ' danger' : '')
        return h('button', {
          className: cn, type: 'button', disabled: props.disabled === true, onClick: props.onClick,
        }, props.children)
      }

      function Field(props) {
        return h('label', { className: 'xhs-field' }, h('span', null, props.label), props.children)
      }

      function Card(props) {
        var head = props.title
          ? h('div', { className: 'xhs-card-head' },
            h('div', { className: 'xhs-card-title' }, props.title),
            h('div', { className: 'xhs-grow' }),
            props.extra || null)
          : null
        return h('div', { className: 'xhs-card' }, head, props.children)
      }

      function Stat(props) {
        return h('div', null,
          h('div', { className: 'xhs-stat-label' }, props.label),
          h('div', { className: 'xhs-stat-value' }, props.value))
      }

      function DataTable(props) {
        var columns = props.columns || []
        var rows = props.rows || []
        if (rows.length === 0) return h('div', { className: 'xhs-empty' }, props.empty || '暂无数据')
        return h('div', { className: 'xhs-table-wrap' },
          h('table', { className: 'xhs-table' },
            h('thead', null, h('tr', null, columns.map(function (col, i) {
              return h('th', { key: i }, col.title)
            }))),
            h('tbody', null, rows.map(function (row, ri) {
              return h('tr', { key: ri }, columns.map(function (col, ci) {
                var value = typeof col.render === 'function' ? col.render(row) : row[col.field]
                var empty = value === undefined || value === null || value === ''
                return h('td', { key: ci }, empty ? '—' : value)
              }))
            }))))
      }

      function Hint(props) {
        return h('div', { className: 'xhs-hint', style: props.style || null }, props.children)
      }

      function Bullets(props) {
        var items = props.items || []
        if (items.length === 0) return null
        return h('ul', { className: 'xhs-list' }, items.map(function (item, i) {
          return h('li', { key: i }, item)
        }))
      }

      var LEVEL = { high: '高风险', medium: '中风险', low: '低风险', safe: '未发现问题' }

      // ---- research ---------------------------------------------------
      function ResearchTab(props) {
        var kw = React.useState('')
        var type = React.useState('选题挖掘')
        var importText = React.useState('')
        var result = React.useState(null)
        var busy = React.useState(false)
        var msg = React.useState('')

        function run() {
          busy[1](true)
          msg[1]('')
          api(API + '/research/run', { keyword: kw[0], type: type[0] }).then(function (data) {
            result[1](data)
            msg[1]((data && data.message) || '')
            return props.refresh()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function doImport() {
          var rows = lines(importText[0]).map(function (line) {
            var parts = line.split(/\s*[|\t]\s*/)
            if (parts.length < 2) parts = line.split(/\s{2,}/)
            return { title: parts[0] || '', author: parts[1] || '', likes: toNum(parts[2]), collects: toNum(parts[3]), comments: toNum(parts[4]), url: parts[5] || '' }
          }).filter(function (r) { return r.title !== '' })
          if (rows.length === 0) { msg[1]('没有识别到有效行'); return }
          busy[1](true)
          api(API + '/research/import', { items: rows, keyword: kw[0], type: type[0] }).then(function (data) {
            result[1](data)
            msg[1]((data && data.message) || '已导入 ' + rows.length + ' 条')
            importText[1]('')
            return props.refresh()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        var res = result[0]
        var fetched = res && res.ok

        return h('div', null,
          h(Card, { title: '调研笔记' },
            h('div', { className: 'xhs-row' },
              h(Field, { label: '关键词 / 赛道' }, h('input', {
                className: 'xhs-input', placeholder: '例如：秋冬通勤穿搭',
                value: kw[0], onChange: function (e) { kw[1](e.target.value) },
              })),
              h(Field, { label: '类型' }, h('select', {
                className: 'xhs-select', value: type[0], onChange: function (e) { type[1](e.target.value) },
              }, ['选题挖掘', '竞品拆解', '热点追踪', '爆文分析'].map(function (n) {
                return h('option', { key: n, value: n }, n)
              }))),
              h(Btn, { primary: true, onClick: run, disabled: busy[0] }, busy[0] ? '抓取中…' : '抓取并分析')),
            msg[0] ? h(Hint, { style: { marginTop: '8px' } }, msg[0]) : null,
            h(Hint, { style: { marginTop: '8px' } },
              '抓取走「带 Cookie 的页面解析」：需要先在 设置 → 小红书账号 里授权。若搜索页是前端渲染（常见），在对话里说「抓取关键词：' + (kw[0] || '关键词') + '」，我用浏览器打开后把结果写回工作台。')),
          h(Card, { title: '导入竞品笔记', extra: h('span', { className: 'xhs-sub' }, '抓取不到时用这个') },
            h('textarea', {
              className: 'xhs-textarea',
              placeholder: '每行一篇：标题 | 作者 | 赞 | 收藏 | 评论 | 链接\n支持 1.2w / 3.4k 写法',
              value: importText[0], onChange: function (e) { importText[1](e.target.value) },
            }),
            h('div', { className: 'xhs-actions', style: { marginTop: '8px' } },
              h(Btn, { onClick: doImport, disabled: busy[0] }, '导入并分析'))),

          fetched ? h('div', null,
            h(Card, { title: '调研结论' },
              h('div', { className: 'xhs-stats' },
                h(Stat, { label: '样本', value: res.total }),
                h(Stat, { label: '场均互动', value: fmtNum(res.avgInteraction) }),
                h(Stat, { label: '互动中位数', value: fmtNum(res.medianInteraction) })),
              h(Bullets, { items: res.insights })),
            h(Card, { title: '角度表现' },
              h(DataTable, {
                columns: [
                  { title: '角度', field: 'name' },
                  { title: '篇数', field: 'count' },
                  { title: '场均互动', field: 'avgInteraction' },
                  { title: '收藏赞比', field: 'collectLikeRatio' },
                ],
                rows: res.angles || [],
              })),
            h(Card, { title: '头部笔记' },
              h(DataTable, {
                columns: [
                  { title: '标题', field: 'title' },
                  { title: '作者', field: 'author' },
                  { title: '互动', field: 'interaction' },
                  { title: '赞', field: 'likes' },
                  { title: '收藏', field: 'collects' },
                ],
                rows: res.top || [],
              }))) : null)
      }

      // ---- compose + compliance --------------------------------------
      function ComposeTab(props) {
        var title = React.useState('')
        var noteType = React.useState('图文')
        var template = React.useState('种草测评')
        var points = React.useState('')
        var tags = React.useState('')
        var draft = React.useState(null)
        var busy = React.useState(false)
        var msg = React.useState('')

        function generate() {
          busy[1](true)
          msg[1]('')
          api(API + '/compose/generate', {
            title: title[0], type: noteType[0], template: template[0], points: points[0], tags: tags[0],
          }).then(function (data) {
            if (data && data.ok) draft[1](data)
            else msg[1]((data && data.message) || '生成失败')
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function publishDraft() {
          if (!draft[0]) { msg[1]('先生成草稿'); return }
          busy[1](true)
          api(API + '/notes/save', {
            note: {
              title: draft[0].title,
              body: draft[0].body,
              tags: draft[0].tags,
              noteType: draft[0].noteType,
              template: draft[0].template,
            },
          }).then(function (data) {
            if (data && data.ok) {
              msg[1]('已存入草稿箱')
              return props.refresh().then(function () { props.goPublish(data.noteId) })
            }
            msg[1]((data && data.message) || '保存失败')
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        var d = draft[0]
        var c = d && d.compliance

        var left = h('div', null,
          h(Card, { title: '创作笔记' },
            h(Field, { label: '标题' }, h('input', {
              className: 'xhs-input', placeholder: '例如：被问爆的秋冬通勤 3 套',
              value: title[0], onChange: function (e) { title[1](e.target.value) },
            })),
            h('div', { className: 'xhs-row' },
              h(Field, { label: '形式' }, h('select', {
                className: 'xhs-select', value: noteType[0], onChange: function (e) { noteType[1](e.target.value) },
              }, ['图文', '视频', '长文'].map(function (n) { return h('option', { key: n, value: n }, n) }))),
              h(Field, { label: '模板' }, h('select', {
                className: 'xhs-select', value: template[0], onChange: function (e) { template[1](e.target.value) },
              }, ['种草测评', '干货教程', '避坑清单', '日常 vlog', '对比横评'].map(function (n) {
                return h('option', { key: n, value: n }, n)
              })))),
            h(Field, { label: '要点（换行或逗号分隔）' }, h('textarea', {
              className: 'xhs-textarea', placeholder: '版型显瘦\n面料不扎\n洗后不变形',
              value: points[0], onChange: function (e) { points[1](e.target.value) },
            })),
            h(Field, { label: '话题标签' }, h('input', {
              className: 'xhs-input', placeholder: '秋冬穿搭 通勤OOTD',
              value: tags[0], onChange: function (e) { tags[1](e.target.value) },
            })),
            h('div', { className: 'xhs-actions' },
              h(Btn, { primary: true, onClick: generate, disabled: busy[0] }, busy[0] ? '生成中…' : '生成并自检'),
              h(Btn, { onClick: publishDraft, disabled: busy[0] || !d }, '发布至草稿箱')),
            msg[0] ? h(Hint, { style: { marginTop: '8px' } }, msg[0]) : null))

        var right = h('div', null,
          h(Card, { title: '撰写提示' },
            h('ul', { className: 'xhs-list' },
              h('li', null, '先写钩子：痛点或反差'),
              h('li', null, '再给结论：一句话立场'),
              h('li', null, '分点给证据：3 条以内'),
              h('li', null, '结尾提问：引导评论')),
            h(Hint, null, '生成后会自动跑一遍合规检测；改完再点「发布至草稿箱」。')))

        var preview = null
        if (d) {
          preview = h('div', null,
            h(Card, { title: '草稿与合规', extra: h('span', { className: 'xhs-pill' }, '合规分 ' + (c ? c.score : '-')) },
              h('div', { className: 'xhs-code' }, d.body),
              h('div', { className: 'xhs-actions' },
                h(Btn, { tiny: true, onClick: function () { copy(d.body) } }, '复制正文')),
              c && c.summary ? h('div', { className: 'xhs-stats', style: { marginTop: '12px' } },
                h(Stat, { label: '判定', value: LEVEL[c.level] || c.level }),
                h(Stat, { label: '高风险', value: c.summary.high }),
                h(Stat, { label: '中风险', value: c.summary.medium })) : null,
              h(DataTable, {
                empty: '没有命中风险规则',
                columns: [
                  { title: '片段', field: 'term' },
                  { title: '类别', render: function (row) { return (row.categories && row.categories.length ? row.categories : [row.category]).join(' / ') } },
                  { title: '等级', render: function (row) { return LEVEL[row.level] || row.level } },
                  { title: '建议', field: 'suggestion' },
                ],
                rows: c ? (c.hits || []).slice(0, 20) : [],
              })))
        }

        return h('div', null,
          h('div', { className: 'xhs-split' }, left, right),
          preview)
      }

      // ---- publish ----------------------------------------------------
      function PublishTab(props) {
        var notes = props.snap.notes || []
        var selected = React.useState(props.pendingId || (notes[0] ? notes[0].id : ''))
        var date = React.useState('')
        var slot = React.useState('19:00-21:00')
        var pkg = React.useState(null)
        var busy = React.useState(false)
        var msg = React.useState('')

        React.useEffect(function () {
          if (props.pendingId) selected[1](props.pendingId)
        }, [props.pendingId])

        function makeDraft() {
          if (!selected[0]) { msg[1]('先选一篇草稿'); return }
          busy[1](true)
          api(API + '/publish/draft', { id: selected[0] }).then(function (data) {
            if (data && data.ok) pkg[1](data)
            msg[1]((data && data.message) || '')
            return props.refresh()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function queue() {
          if (!selected[0]) { msg[1]('先选一篇草稿'); return }
          busy[1](true)
          api(API + '/publish/queue', { id: selected[0], date: date[0], slot: slot[0] }).then(function (data) {
            msg[1]((data && data.message) || '')
            return props.refresh()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        var rows = notes.map(function (note) {
          return {
            id: note.id,
            title: note.title,
            status: note.status === 'queued' ? '已排期' : '草稿',
            score: note.compliance ? note.compliance.score : '',
            scheduled: note.scheduledFor || '',
            pick: function () { selected[1](note.id) },
          }
        })

        var p = pkg[0]

        return h('div', null,
          h(Card, { title: '发布笔记（草稿模式）' },
            h(Hint, null, '插件不会自动发布：这里生成标题 / 正文 / 标签 / 检查项，你到创作平台存草稿后人工发布。'),
            h(DataTable, {
              empty: '草稿箱是空的，先去「创作」生成并存入',
              columns: [
                { title: '标题', field: 'title' },
                { title: '状态', field: 'status' },
                { title: '合规分', field: 'score' },
                { title: '排期', field: 'scheduled' },
                { title: '选择', render: function (row) { return h(Btn, { tiny: true, onClick: row.pick }, row.id === selected[0] ? '已选' : '选这篇') } },
              ],
              rows: rows,
            }),
            h('div', { className: 'xhs-row', style: { marginTop: '10px' } },
              h(Field, { label: '计划日期' }, h('input', {
                className: 'xhs-input', type: 'date', value: date[0], onChange: function (e) { date[1](e.target.value) },
              })),
              h(Field, { label: '时段' }, h('select', {
                className: 'xhs-select', value: slot[0], onChange: function (e) { slot[1](e.target.value) },
              }, ['07:00-09:00', '12:00-13:00', '19:00-21:00', '21:00-23:00'].map(function (n) {
                return h('option', { key: n, value: n }, n)
              })))),
            h('div', { className: 'xhs-actions' },
              h(Btn, { primary: true, onClick: makeDraft, disabled: busy[0] }, busy[0] ? '生成中…' : '生成发布包'),
              h(Btn, { onClick: queue, disabled: busy[0] }, '加入排期')),
            msg[0] ? h(Hint, { style: { marginTop: '8px' } }, msg[0]) : null),

          p && p.ok ? h(Card, { title: '发布包', extra: h('span', { className: 'xhs-sub' }, '复制到创作平台') },
            h('div', { className: 'xhs-hint' }, '标题（' + p.package.charCount.title + ' 字）'),
            h('div', { className: 'xhs-code' }, p.package.title),
            h('div', { className: 'xhs-actions' }, h(Btn, { tiny: true, onClick: function () { copy(p.package.title) } }, '复制标题')),
            h('div', { className: 'xhs-hint', style: { marginTop: '8px' } }, '正文（' + p.package.charCount.body + ' 字）'),
            h('div', { className: 'xhs-code' }, p.package.body),
            h('div', { className: 'xhs-actions' }, h(Btn, { tiny: true, onClick: function () { copy(p.package.body) } }, '复制正文')),
            h('div', { className: 'xhs-hint', style: { marginTop: '8px' } }, '话题标签'),
            h('div', { className: 'xhs-code' }, p.package.tags.map(function (t) { return '#' + t }).join(' ')),
            h('div', { className: 'xhs-actions' }, h(Btn, { tiny: true, onClick: function () { copy(p.package.tags.map(function (t) { return '#' + t }).join(' ')) } }, '复制标签')),
            h('div', { className: 'xhs-hint', style: { marginTop: '10px' } }, '发布前检查'),
            h('ul', { className: 'xhs-list' }, p.package.checklist.map(function (item, i) {
              return h('li', { key: i }, item)
            })),
            h('div', { className: 'xhs-actions', style: { marginTop: '10px' } },
              h(Btn, {
                onClick: function () {
                  try { window.open(p.package.links.creator, '_blank', 'noopener') } catch (err) { /* blocked */ }
                },
              }, '打开创作平台'),
              h('span', { className: 'xhs-sub' }, '合规分 ' + p.compliance.score + ' · 高风险 ' + p.compliance.high))) : null)
      }

      // ---- review -----------------------------------------------------
      function ReviewTab(props) {
        var days = React.useState('30')
        var result = React.useState(null)
        var importText = React.useState('')
        var busy = React.useState(false)
        var msg = React.useState('')

        function run() {
          busy[1](true)
          msg[1]('')
          api(API + '/review/summary', { days: Number(days[0]) }).then(function (data) {
            result[1](data)
            msg[1]((data && data.message) || '')
            return props.refresh()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function doImport() {
          var rows = lines(importText[0]).map(function (line) {
            var parts = line.split(/\s*[|\t]\s*/)
            return { title: parts[0] || '', likes: toNum(parts[1]), collects: toNum(parts[2]), comments: toNum(parts[3]), publishedAt: Number(parts[4]) || 0 }
          }).filter(function (r) { return r.title !== '' })
          if (rows.length === 0) { msg[1]('没有识别到有效行'); return }
          busy[1](true)
          api(API + '/review/import', { items: rows }).then(function (data) {
            msg[1]((data && data.message) || '')
            importText[1]('')
            return props.refresh()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        var res = result[0]

        return h('div', null,
          h(Card, { title: '数据复盘（我发布的笔记）' },
            h('div', { className: 'xhs-row' },
              h(Field, { label: '区间' }, h('select', {
                className: 'xhs-select', value: days[0], onChange: function (e) { days[1](e.target.value) },
              }, [['7', '近 7 天'], ['30', '近 30 天'], ['0', '全部']].map(function (pair) {
                return h('option', { key: pair[0], value: pair[0] }, pair[1])
              }))),
              h(Btn, { primary: true, onClick: run, disabled: busy[0] }, busy[0] ? '抓取中…' : '抓取并复盘')),
            msg[0] ? h(Hint, { style: { marginTop: '8px' } }, msg[0]) : null,
            h(Hint, { style: { marginTop: '8px' } }, '数据来自你的主页（设置里填主页链接后自动抓取），抓不到时可导入。')),
          h(Card, { title: '导入我的数据', extra: h('span', { className: 'xhs-sub' }, '标题 | 赞 | 收藏 | 评论 | 时间戳' ) },
            h('textarea', {
              className: 'xhs-textarea', placeholder: '秋冬通勤 3 套 | 4820 | 3105 | 320 | 1731024000000',
              value: importText[0], onChange: function (e) { importText[1](e.target.value) },
            }),
            h('div', { className: 'xhs-actions', style: { marginTop: '8px' } },
              h(Btn, { onClick: doImport, disabled: busy[0] }, '导入'))),

          res && res.ok ? h('div', null,
            h(Card, { title: '总览 · ' + res.range },
              h('div', { className: 'xhs-stats' },
                h(Stat, { label: '笔记数', value: res.totals.notes }),
                h(Stat, { label: '互动总量', value: fmtNum(res.totals.interaction) }),
                h(Stat, { label: '赞', value: fmtNum(res.totals.likes) }),
                h(Stat, { label: '收藏', value: fmtNum(res.totals.collects) }),
                h(Stat, { label: '收藏赞比', value: res.collectLikeRatio })),
              h(Bullets, { items: res.insights })),
            h(Card, { title: '头部笔记' },
              h(DataTable, {
                columns: [
                  { title: '标题', field: 'title' },
                  { title: '赞', field: 'likes' },
                  { title: '收藏', field: 'collects' },
                  { title: '互动', field: 'interaction' },
                ],
                rows: res.top || [],
              }))) : null)
      }

      // ---- rank: comment / keyword / hot ------------------------------
      function RankTab(props) {
        var mode = React.useState('comment')
        var url = React.useState('')
        var keywords = React.useState('')
        var importText = React.useState('')
        var noteTitle = React.useState('')
        var result = React.useState(null)
        var busy = React.useState(false)
        var msg = React.useState('')
        var persona = React.useState((props.snap && props.snap.reply && props.snap.reply.persona) || '专业顾问')
        var replyRatio = React.useState((props.snap && props.snap.reply && props.snap.reply.replyRatio) || 0.6)

        function scan() {
          busy[1](true)
          msg[1]('')
          api(API + '/comments/scan', { url: url[0] }).then(function (data) {
            result[1](data)
            msg[1]((data && data.message) || (data.ok ? '抓到 ' + data.count + ' 条评论' : ''))
            if (data && data.ok) return props.refresh()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function doImport() {
          var rows = lines(importText[0]).map(function (line) {
            var parts = line.split(/\s*[|\t]\s*/)
            return { content: parts[0] || '', user: parts[1] || '', likes: toNum(parts[2]) }
          }).filter(function (r) { return r.content !== '' })
          if (rows.length === 0) { msg[1]('没有识别到有效评论'); return }
          busy[1](true)
          api(API + '/comments/import', { items: rows, noteTitle: noteTitle[0] }).then(function (data) {
            msg[1](data && data.ok ? '已导入 ' + data.count + ' 条评论' : (data && data.message) || '导入失败')
            importText[1]('')
            return props.refresh()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function runRank(m) {
          mode[1](m)
          busy[1](true)
          api(API + '/rank', { mode: m, keywords: keywords[0] }).then(function (data) {
            result[1](data)
            msg[1]((data && data.message) || '')
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function runHot() {
          mode[1]('hot')
          busy[1](true)
          api(API + '/hot/rank', {}).then(function (data) {
            result[1](data)
            msg[1]((data && data.message) || '')
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function runReply() {
          mode[1]('reply')
          busy[1](true)
          api(API + '/reply/draft', { persona: persona[0] }).then(function (data) {
            result[1](data)
            msg[1]((data && data.message) || (data && data.ok ? '生成 ' + data.ready + ' 条回复草稿' : ''))
            if (data && data.ok) return props.refresh()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function runHybrid() {
          mode[1]('hybrid')
          busy[1](true)
          api(API + '/reply/hybrid', { replyRatio: replyRatio[0] }).then(function (data) {
            result[1](data)
            msg[1]((data && data.message) || '')
            if (data && data.ok) return props.refresh()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function setPersona(p) {
          persona[1](p)
          api(API + '/reply/persona', { persona: p }).then(function () { return props.refresh() })
        }

        var res = result[0]
        var m = mode[0]

        var controls = h('div', null,
          h('div', { className: 'xhs-actions', style: { marginBottom: '10px' } },
            h(Btn, { primary: m === 'comment', onClick: function () { runRank('comment') } }, '评论排名'),
            h(Btn, { primary: m === 'keyword', onClick: function () { runRank('keyword') } }, '关键词排名'),
            h(Btn, { primary: m === 'hot', onClick: runHot }, '热点排名'),
            h(Btn, { primary: m === 'reply', onClick: function () { runReply() } }, '回复策略'),
            h(Btn, { primary: m === 'hybrid', onClick: function () { runHybrid() } }, '评论混动')),
          m === 'comment' ? h('div', null,
            h('div', { className: 'xhs-row' },
              h(Field, { label: '笔记链接（含 xsec_token）' }, h('input', {
                className: 'xhs-input', placeholder: '…/explore/xxx?xsec_token=…&xsec_source=pc_search',
                value: url[0], onChange: function (e) { url[1](e.target.value) },
              })),
              h(Btn, { onClick: scan, disabled: busy[0] || url[0].trim() === '' }, '抓取评论区')),
            h(Field, { label: '所属笔记（可选）' }, h('input', {
              className: 'xhs-input', placeholder: '例如：秋冬通勤 3 套',
              value: noteTitle[0], onChange: function (e) { noteTitle[1](e.target.value) },
            }))) : null,
          m === 'keyword' ? h(Field, { label: '监测关键词（逗号分隔）' }, h('input', {
            className: 'xhs-input', placeholder: '链接, 价格, 尺码',
            value: keywords[0], onChange: function (e) { keywords[1](e.target.value) },
          })) : null,
          m === 'comment' ? h('div', null,
            h('textarea', {
              className: 'xhs-textarea', placeholder: '抓取不到时导入：每行「评论内容 | 用户 | 赞」',
              value: importText[0], onChange: function (e) { importText[1](e.target.value) },
            }),
            h('div', { className: 'xhs-actions', style: { marginTop: '8px' } },
              h(Btn, { onClick: doImport, disabled: busy[0] }, '导入评论'))) : null,
          m === 'reply' ? h('div', { className: 'xhs-row' },
            h(Field, { label: '回复人设' }, h('select', {
              className: 'xhs-input', value: persona[0],
              onChange: function (e) { setPersona(e.target.value) },
            },
              ['专业顾问', '亲切姐妹', '干货老司机', '品牌官方'].map(function (p) {
                return h('option', { key: p, value: p }, p)
              }))),
            h(Hint, null, '回复只生成草稿，需手动复制到平台发送，不自动回复。')) : null,
          m === 'hybrid' ? h('div', { className: 'xhs-row' },
            h(Field, { label: '回复比例（0.1–1.0）' }, h('input', {
              className: 'xhs-input', type: 'number', min: 0.1, max: 1, step: 0.1,
              value: replyRatio[0], onChange: function (e) { replyRatio[1](Number(e.target.value)) },
            })),
            h(Hint, null, '混动=真人感节奏：不全回，按比例抽样 + 时间间隔随机化，并做舆论监测分级。')) : null)

        var body = null
        if (res && res.ok) {
          if (res.mode === 'comment' || (m === 'comment' && res.opportunities)) {
            body = h('div', null,
              h(Card, { title: '抢前排机会' },
                h('div', { className: 'xhs-stats' },
                  h(Stat, { label: '评论数', value: res.total }),
                  h(Stat, { label: '平均赞', value: res.avgLikes }),
                  h(Stat, { label: '咨询', value: res.sentiment ? res.sentiment['咨询'] : 0 })),
                h(DataTable, {
                  empty: '还没有评论数据',
                  columns: [
                    { title: '评论', field: 'content' },
                    { title: '情绪', field: 'sentiment' },
                    { title: '赞', field: 'likes' },
                    { title: '机会分', field: 'opportunity' },
                    { title: '为什么', field: 'reason' },
                  ],
                  rows: res.opportunities || [],
                }),
                h('div', { className: 'xhs-hint', style: { marginTop: '10px' } }, '操作建议'),
                h(Bullets, { items: res.advice || [] })))
          } else if (res.mode === 'keyword') {
            body = h(Card, { title: '关键词命中' },
              h('div', { className: 'xhs-stats' },
                h(Stat, { label: '命中', value: res.total }),
                h(Stat, { label: '扫描', value: res.scanned })),
              h(DataTable, {
                empty: '没有命中',
                columns: [
                  { title: '评论', field: 'content' },
                  { title: '情绪', field: 'sentiment' },
                  { title: '赞', field: 'likes' },
                  { title: '命中词', render: function (row) { return (row.hits || []).join('、') } },
                ],
                rows: res.items || [],
              }),
              h(Bullets, { items: res.insights || [] }))
          } else if (res.mode === 'hot' || res.notes || res.items) {
            var hotRows = (res.items || res.notes || res.top || [])
            body = h(Card, { title: '热点排名' },
              h(DataTable, {
                empty: '还没有热点数据',
                columns: [
                  { title: '标题', render: function (row) { return row.title || row.name } },
                  { title: '互动', render: function (row) { return row.interaction || row.heat } },
                  { title: '赞', field: 'likes' },
                  { title: '收藏', field: 'collects' },
                ],
                rows: hotRows,
              }),
              h(Bullets, { items: res.insights || [] }))
          }
        }

        // 回复策略 / 评论混动 的结果单独渲染（不依赖 res.mode，用当前 m 判断）
        if (m === 'reply' && res && res.ok) {
          var replyRows = res.replies || []
          body = h('div', null,
            h(Card, { title: '回复草稿（一键复制，手动发送）' },
              h('div', { className: 'xhs-stats' },
                h(Stat, { label: '人设', value: res.persona }),
                h(Stat, { label: '可回复', value: res.ready }),
                h(Stat, { label: '已跳过', value: res.skipped })),
              res.skipNote ? h(Hint, { style: { marginBottom: '8px' } }, res.skipNote) : null,
              h('div', null, replyRows.map(function (row, i) {
                return h('div', { key: i, className: 'xhs-reply-item' },
                  h('div', { className: 'xhs-reply-meta' },
                    h('span', { className: 'xhs-pill' }, row.sentiment + '·' + row.strategy),
                    h('span', { className: 'xhs-sub' }, '合规分 ' + (row.compliance ? row.compliance.score : '—')),
                    h(Btn, { tiny: true, onClick: function () { copy(row.reply); msg[1]('已复制到剪贴板') } }, '复制')),
                  h('div', { className: 'xhs-reply-src' }, row.content),
                  h('div', { className: 'xhs-reply-text' }, row.reply))
              })),
              h(Hint, { style: { marginTop: '10px' } }, '每条回复都已过合规自检；发送前请再人工核对一遍。')))
        }

        if (m === 'hybrid' && res && res.ok) {
          var alerts = res.alerts || []
          body = h('div', null,
            h(Card, { title: '评论混动 · 节奏规划' },
              h('div', { className: 'xhs-stats' },
                h(Stat, { label: '评论总数', value: res.total }),
                h(Stat, { label: '可行动', value: res.actionable }),
                h(Stat, { label: '建议回复', value: res.shouldReplyCount }),
                h(Stat, { label: '跳过引流', value: res.skipAds })),
              res.rhythm ? h(Hint, { style: { marginBottom: '8px' } }, res.rhythm.suggestion) : null),
            h(Card, { title: '舆论监测分级' },
              h('div', null, alerts.map(function (a, i) {
                return h('div', { key: i, className: 'xhs-alert xhs-alert-' + (a.level || 'none') },
                  h('span', { className: 'xhs-pill' }, a.type),
                  h('span', null, a.advice))
              }))))
        }

        return h('div', null,
          h(Card, { title: '排名检测' }, controls,
            msg[0] ? h(Hint, { style: { marginTop: '8px' } }, msg[0]) : null),
          body)
      }

      // ---- workbench --------------------------------------------------
      function Workbench() {
        var tab = React.useState('research')
        var snap = React.useState(null)
        var err = React.useState('')
        var toast = React.useState('')
        var pending = React.useState('')

        function load() {
          return api(API + '/state').then(function (data) {
            if (data && data.ok) { snap[1](data); err[1]('') }
            else err[1]((data && data.message) || '加载失败')
          }).catch(function (e) {
            err[1]('无法连接插件后端：' + String(e && e.message ? e.message : e))
          })
        }

        React.useEffect(function () { load() }, [])

        React.useEffect(function () {
          if (toast[0] === '') return undefined
          var timer = setTimeout(function () { toast[1]('') }, 4000)
          return function () { clearTimeout(timer) }
        }, [toast[0]])

        if (!snap[0]) {
          return h('div', { className: 'xhs-page' },
            h('div', { className: 'xhs-head' }, h('h2', { className: 'xhs-title' }, '小红书运营工作台')),
            h('div', { className: 'xhs-empty' }, err[0] === '' ? '加载中…' : err[0]))
        }

        var account = snap[0].account || {}
        var statusText = { linked: '已连接', risk: '抓取受限', expired: '已过期', unlinked: '未连接' }[account.status] || '未连接'

        function goPublish(noteId) {
          pending[1](noteId || '')
          tab[1]('publish')
        }

        var content = null
        if (tab[0] === 'research') content = h(ResearchTab, { snap: snap[0], refresh: load })
        else if (tab[0] === 'compose') content = h(ComposeTab, { snap: snap[0], refresh: load, goPublish: goPublish })
        else if (tab[0] === 'publish') content = h(PublishTab, { snap: snap[0], refresh: load, pendingId: pending[0] })
        else if (tab[0] === 'review') content = h(ReviewTab, { snap: snap[0], refresh: load })
        else content = h(RankTab, { snap: snap[0], refresh: load })

        return h('div', { className: 'xhs-page' },
          h('div', { className: 'xhs-head' },
            h('h2', { className: 'xhs-title' }, '小红书运营工作台'),
            h('span', { className: 'xhs-pill' }, statusText + (account.nickname ? ' · ' + account.nickname : '')),
            h('span', { className: 'xhs-sub' }, '读：尽量自动 · 写：只出草稿'),
            h('div', { className: 'xhs-grow' }),
            h(Btn, { tiny: true, onClick: function () { load().then(function () { toast[1]('已刷新') }) } }, '刷新')),
          h('div', { className: 'xhs-tabs' }, TABS.map(function (pair) {
            return h('button', {
              key: pair[0], type: 'button',
              className: 'xhs-tab' + (tab[0] === pair[0] ? ' active' : ''),
              onClick: function () { tab[1](pair[0]) },
            }, pair[1])
          })),
          toast[0] ? h('div', { className: 'xhs-toast' }, toast[0]) : null,
          err[0] ? h('div', { className: 'xhs-toast' }, err[0]) : null,
          content)
      }

      // ---- settings: account -----------------------------------------
      function AccountSettings() {
        var snap = React.useState(null)
        var phone = React.useState('')
        var password = React.useState('')
        var cookie = React.useState('')
        var profile = React.useState('')
        var busy = React.useState(false)
        var msg = React.useState('')
        var ways = React.useState([])
        var confirmReset = React.useState(false)
        var accountLabel = React.useState('')

        function load() {
          return api(API + '/state').then(function (data) {
            if (data && data.ok) {
              snap[1](data)
              if (!profile[0] && data.settings && data.settings.profileUserId) profile[1](data.settings.profileUserId)
            }
          })
        }

        React.useEffect(function () { load() }, [])

        function login() {
          busy[1](true)
          msg[1]('')
          api(API + '/account/login', { phone: phone[0], password: password[0] }).then(function (data) {
            msg[1]((data && data.message) || '')
            ways[1]((data && data.ways) || [])
            password[1]('')
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function link() {
          busy[1](true)
          api(API + '/account/link', { cookie: cookie[0] }).then(function (data) {
            msg[1]((data && data.message) || '')
            if (data && data.ok) cookie[1]('')
            return load()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function saveProfile() {
          busy[1](true)
          api(API + '/account/profile', { url: profile[0] }).then(function (data) {
            msg[1]((data && data.message) || '')
            return load()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function check() {
          busy[1](true)
          api(API + '/account/check', {}).then(function (data) {
            msg[1]((data && data.message) || (data && data.ok ? '账号有效' : '校验未通过'))
            return load()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function unlink() {
          busy[1](true)
          api(API + '/account/unlink', {}).then(function () { msg[1]('已断开'); return load() })
            .then(function () { busy[1](false) })
        }

        function resetLocal() {
          if (!confirmReset[0]) { confirmReset[1](true); return }
          busy[1](true)
          api(API + '/reset', {}).then(function (data) { confirmReset[1](false); msg[1]((data && data.message) || '已清空'); return load() })
            .then(function () { busy[1](false) })
        }

        // —— 多账号矩阵 ——
        function addAccount() {
          busy[1](true)
          api(API + '/accounts/add', { label: accountLabel[0], cookie: cookie[0] }).then(function (data) {
            msg[1]((data && data.message) || (data && data.ok ? '已加入账号池' : ''))
            if (data && data.ok) { cookie[1](''); accountLabel[1]('') }
            return load()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function switchTo(id) {
          busy[1](true)
          api(API + '/accounts/switch', { accountId: id }).then(function (data) {
            msg[1]((data && data.message) || (data && data.ok ? '已切换账号' : ''))
            return load()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        function removeAcct(id) {
          busy[1](true)
          api(API + '/accounts/remove', { accountId: id }).then(function (data) {
            msg[1]((data && data.message) || (data && data.ok ? '已移除账号' : ''))
            return load()
          }).catch(function (e) { msg[1](String(e && e.message ? e.message : e)) })
            .then(function () { busy[1](false) })
        }

        var s = snap[0]
        var account = (s && s.account) || {}
        var statusText = { linked: '已连接', risk: '已保存 · 抓取受限', expired: '已过期', unlinked: '未连接' }[account.status] || '未连接'

        return h('div', { className: 'xhs-page' },
          h(Card, { title: '账号授权' },
            h('div', { className: 'xhs-actions', style: { marginBottom: '10px' } },
              h('span', { className: 'xhs-pill' }, '状态：' + statusText),
              account.nickname ? h('span', { className: 'xhs-pill' }, account.nickname) : null,
              account.checkedAt ? h('span', { className: 'xhs-sub' }, '校验于 ' + fmtTime(account.checkedAt)) : null,
              h('div', { className: 'xhs-grow' }),
              h(Btn, { onClick: check, disabled: busy[0] || account.status === 'unlinked' }, '重新校验'),
              h(Btn, { onClick: unlink, disabled: busy[0] || account.status === 'unlinked', danger: true }, '断开')),
            account.lastError ? h(Hint, { style: { marginBottom: '10px' } }, '上次问题：' + account.lastError) : null,
            h('div', { className: 'xhs-row' },
              h(Field, { label: '账号（手机号）' }, h('input', {
                className: 'xhs-input', placeholder: '仅用于界面展示，不保存',
                value: phone[0], onChange: function (e) { phone[1](e.target.value) },
              })),
              h(Field, { label: '密码' }, h('input', {
                className: 'xhs-input', type: 'password', placeholder: '不保存、不发送',
                value: password[0], onChange: function (e) { password[1](e.target.value) },
              }))),
            h('div', { className: 'xhs-actions' },
              h(Btn, { onClick: login, disabled: busy[0] }, '登录')),
            msg[0] ? h(Hint, { style: { marginTop: '8px' } }, msg[0]) : null,
            ways[0].length > 0 ? h(Bullets, { items: ways[0] }) : null),

          h(Card, { title: 'Cookie 授权', extra: h('span', { className: 'xhs-sub' }, '本机 0600 保存') },
            h('textarea', {
              className: 'xhs-textarea', placeholder: 'a1=...; web_session=...',
              value: cookie[0], onChange: function (e) { cookie[1](e.target.value) },
            }),
            h('div', { className: 'xhs-actions', style: { marginTop: '8px' } },
              h(Btn, { primary: true, onClick: link, disabled: busy[0] || cookie[0].trim() === '' }, busy[0] ? '连接中…' : '保存并校验')),
            h(Hint, { style: { marginTop: '8px' } },
              '取法：浏览器登录 xiaohongshu.com → 开发者工具 → Network → 任意请求 → 复制 Request Headers 的 Cookie。')),

          h(Card, { title: '多账号矩阵', extra: h('span', { className: 'xhs-sub' }, '账号池，切换即用') },
            (function () {
              var accounts = (s && s.accounts) || []
              return h('div', null,
                accounts.length === 0 ? h(Hint, null, '还没有账号。给下面这个 Cookie 起个名字，点「加入账号池」，即可管理多个账号。') : null,
                h('div', null, accounts.map(function (a) {
                  return h('div', { key: a.id, className: 'xhs-account-row' },
                    h('span', { className: 'xhs-pill' + (a.active ? ' xhs-pill-active' : '') }, a.label || a.id),
                    a.nickname ? h('span', { className: 'xhs-sub' }, a.nickname) : null,
                    a.active ? h('span', { className: 'xhs-sub' }, '当前账号') : null,
                    h('div', { className: 'xhs-grow' }),
                    a.active ? null : h(Btn, { tiny: true, onClick: function () { switchTo(a.id) }, disabled: busy[0] }, '切换'),
                    h(Btn, { tiny: true, danger: true, onClick: function () { removeAcct(a.id) }, disabled: busy[0] }, '移除'))
                })),
                h('div', { className: 'xhs-row', style: { marginTop: '10px' } },
                  h(Field, { label: '账号名称' }, h('input', {
                    className: 'xhs-input', placeholder: '例如：主号 / 小号A',
                    value: accountLabel[0], onChange: function (e) { accountLabel[1](e.target.value) },
                  }))),
                h('div', { className: 'xhs-actions' },
                  h(Btn, { onClick: addAccount, disabled: busy[0] || cookie[0].trim() === '' || accountLabel[0].trim() === '' }, '加入账号池')))
            })()),

          h(Card, { title: '我的主页', extra: h('span', { className: 'xhs-sub' }, '复盘用') },
            h('div', { className: 'xhs-row' },
              h(Field, { label: '主页链接或用户 ID' }, h('input', {
                className: 'xhs-input', placeholder: 'https://www.xiaohongshu.com/user/profile/xxxx',
                value: profile[0], onChange: function (e) { profile[1](e.target.value) },
              })),
              h(Btn, { onClick: saveProfile, disabled: busy[0] || profile[0].trim() === '' }, '保存'))),

          h(Card, { title: '在浏览器里登录（推荐）' },
            h(Hint, null,
              h('div', null, '小红书网页端没有对第三方开放的密码登录接口，上面两个输入框仅用于界面提示，不会发送密码。'),
              h('div', { style: { marginTop: '6px' } }, '更省事的方式：在对话里说「登录小红书」，我用浏览器打开登录页，你扫码或密码登录完成后，我直接代抓并把数据写回工作台。'))),

          h(Card, { title: '本地数据' },
            h('div', { className: 'xhs-actions' },
              h(Btn, { danger: true, onClick: resetLocal, disabled: busy[0] }, confirmReset[0] ? '确认清空本地数据？' : '清空本地数据')),
            h(Hint, { style: { marginTop: '8px' } }, '数据在 ~/.dsh/xhs-ops/，不会同步到任何服务器。')))
      }

      function PanelIcon(props) {
        var size = typeof props.size === 'number' ? props.size : 18
        return h('svg', {
          width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
          stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
          style: { opacity: props.active ? 1 : 0.72 }, 'aria-hidden': 'true',
        },
          h('rect', { x: 3.5, y: 3, width: 17, height: 18, rx: 4 }),
          h('path', { d: 'M7.5 8h6' }),
          h('path', { d: 'M7.5 11.5h9' }),
          h('path', { d: 'M7.5 15h5' }))
      }

      ctx.inject(['slots'], function (scope) {
        scope.slots.inject('main', function* () {
          yield scope.slots.register({ name: 'main', key: 'dsh-xhs-ops' }, function () {
            return h(Workbench)
          })
        })
        scope.slots.inject('sidebar.panellist', function* () {
          yield scope.slots.register(
            { name: 'sidebar.panellist', id: 'dsh-xhs-ops', order: 30, label: function () { return '小红书运营' } },
            function (props) { return h(PanelIcon, props) },
          )
        })
        scope.slots.inject('settings.section', function* () {
          yield scope.slots.register(
            { name: 'settings.section', id: 'xhs-account', order: 21, label: function () { return '小红书账号' } },
            function () { return h(AccountSettings) },
          )
        })
      })
    }

    exports.apply = apply
    exports.inject = []
    return module.exports
  },
})
