import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCandidate, updateCandidate, recalculateScore } from '@/api'
import { calculateKeywordScore, getDecisionLabel, generateCheckLinks } from '@/utils/score'
import type { Candidate } from '@/types'

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'social' | 'trend' | 'serp'>('info')

  useEffect(() => {
    if (id && id !== 'new') {
      loadCandidate(parseInt(id))
    } else {
      setLoading(false)
    }
  }, [id])

  const loadCandidate = async (id: number) => {
    try {
      const data = await getCandidate(id)
      setCandidate(data)
    } catch (error) {
      alert('加载失败')
      navigate('/candidates')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!candidate) return
    setSaving(true)
    try {
      await updateCandidate(candidate.id, candidate)
      alert('保存成功')
    } catch (error) {
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleRecalculate = async () => {
    if (!candidate) return
    try {
      const score = await recalculateScore(candidate.id)
      setCandidate(prev => prev ? { ...prev, score } : null)
    } catch (error) {
      alert('计算失败')
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">加载中...</div>
  }

  if (!candidate) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500 mb-4">候选词不存在</p>
        <Link to="/candidates" className="text-blue-600 hover:underline">
          返回列表
        </Link>
      </div>
    )
  }

  const score = calculateKeywordScore({
    publishedAt: candidate.publishedAt,
    discoveredAt: candidate.discoveredAt,
    playableInBrowser: candidate.canEmbed,
  })
  const links = generateCheckLinks(candidate.name)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/candidates" className="text-blue-600 hover:underline text-sm">
            ← 返回列表
          </Link>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">{candidate.name}</h2>
          <p className="text-gray-500 text-sm">来源: {candidate.sourcePlatform}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* Score Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">评分结果</h3>
          <button
            onClick={handleRecalculate}
            className="text-sm text-blue-600 hover:underline"
          >
            重新计算
          </button>
        </div>
        <div className="grid grid-cols-6 gap-4 mb-4">
          <ScoreItem label="新鲜度" value={score.freshnessScore} max={25} />
          <ScoreItem label="社媒热度" value={score.socialScore} max={30} />
          <ScoreItem label="趋势信号" value={score.trendScore} max={20} />
          <ScoreItem label="SERP竞争" value={score.competitionScore} max={15} />
          <ScoreItem label="可上站性" value={score.launchScore} max={10} />
          <div>
            <p className="text-3xl font-bold text-gray-800">{score.totalScore}</p>
            <p className="text-sm text-gray-500">总分</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">决策建议:</span>
          <DecisionBadge decision={score.decision} />
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="font-medium text-gray-700 mb-3">快捷核查链接</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <QuickLink href={links.youtube} icon="📺" label="YouTube" />
          <QuickLink href={links.reddit} icon="🤖" label="Reddit" />
          <QuickLink href={links.tiktok} icon="🎵" label="TikTok" />
          <QuickLink href={links.discord} icon="💬" label="Discord" />
          <QuickLink href={links.trends} icon="📈" label="Trends" />
          <QuickLink href={links.google} icon="🔍" label="Google" />
          <QuickLink href={links.poki} icon="🎮" label="Poki验证" />
          <QuickLink href={links.crazygames} icon="🎲" label="CrazyGames" />
          <QuickLink href={links.cocrea} icon="🌐" label="Cocrea" />
          <QuickLink href={links.itch} icon="🕹️" label="itch.io" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {(['info', 'social', 'trend', 'serp'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'info' ? '基本信息' :
               tab === 'social' ? '社媒数据' :
               tab === 'trend' ? '趋势数据' : 'SERP竞争'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        {activeTab === 'info' && (
          <InfoTab candidate={candidate} setCandidate={setCandidate} />
        )}
        {activeTab === 'social' && (
          <SocialTab candidate={candidate} setCandidate={setCandidate} />
        )}
        {activeTab === 'trend' && (
          <TrendTab candidate={candidate} setCandidate={setCandidate} />
        )}
        {activeTab === 'serp' && (
          <SerpTab candidate={candidate} setCandidate={setCandidate} />
        )}
      </div>
    </div>
  )
}

function ScoreItem({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-blue-600">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xs text-gray-400">/ {max}</p>
    </div>
  )
}

function DecisionBadge({ decision }: { decision: string }) {
  const config = getDecisionLabel(decision as any)
  return (
    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${config.color} ${config.textColor}`}>
      {config.label}
    </span>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition"
    >
      <span>{icon}</span>
      <span className="text-gray-700">{label}</span>
    </a>
  )
}

function InfoTab({ candidate, setCandidate }: { candidate: Candidate; setCandidate: (c: Candidate) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">游戏名称</label>
          <input
            type="text"
            value={candidate.name}
            onChange={e => setCandidate({ ...candidate, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">来源平台</label>
          <input
            type="text"
            value={candidate.sourcePlatform}
            onChange={e => setCandidate({ ...candidate, sourcePlatform: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">来源URL</label>
          <input
            type="text"
            value={candidate.sourceUrl}
            onChange={e => setCandidate({ ...candidate, sourceUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">发布时间</label>
          <input
            type="datetime-local"
            value={candidate.publishedAt?.slice(0, 16) || ''}
            onChange={e => setCandidate({ ...candidate, publishedAt: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">可嵌入iframe</label>
          <select
            value={candidate.canEmbed ? 'yes' : 'no'}
            onChange={e => setCandidate({ ...candidate, canEmbed: e.target.value === 'yes' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="yes">是</option>
            <option value="no">否</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select
            value={candidate.status}
            onChange={e => setCandidate({ ...candidate, status: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">待核查</option>
            <option value="observing">观察中</option>
            <option value="ready">准备上站</option>
            <option value="launched">已上站</option>
            <option value="abandoned">放弃</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
        <textarea
          value={candidate.notes || ''}
          onChange={e => setCandidate({ ...candidate, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

function SocialTab({ candidate, setCandidate }: { candidate: Candidate; setCandidate: (c: Candidate) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">YouTube 视频数(7天)</label>
          <input
            type="number"
            value={0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">YouTube 最高播放</label>
          <input
            type="number"
            value={0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reddit 帖子数(7天)</label>
          <input
            type="number"
            value={0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reddit 最高 upvotes</label>
          <input
            type="number"
            value={0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">TikTok 有内容</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="no">否</option>
            <option value="yes">是</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discord 有讨论</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="no">否</option>
            <option value="yes">是</option>
          </select>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        💡 提示：打开上方快捷链接核查后，录入数据并保存。
      </p>
    </div>
  )
}

function TrendTab({ candidate, setCandidate }: { candidate: Candidate; setCandidate: (c: Candidate) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">7天趋势</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="no_data">无数据</option>
            <option value="rising">明显上升</option>
            <option value="steady">平稳</option>
            <option value="declining">下降</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">30天趋势</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="no_data">无数据</option>
            <option value="rising">缓慢上升</option>
            <option value="steady">平稳</option>
            <option value="declining">下降</option>
          </select>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        💡 提示：打开 Google Trends 链接查看趋势截图，判断趋势方向。
      </p>
    </div>
  )
}

function SerpTab({ candidate, setCandidate }: { candidate: Candidate; setCandidate: (c: Candidate) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SERP 竞争度</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="low">低竞争</option>
            <option value="medium">中等竞争</option>
            <option value="high">高竞争</option>
            <option value="very_high">极高竞争</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">是否有官方网站</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="no">否</option>
            <option value="yes">是</option>
          </select>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        💡 提示：打开 Google 搜索链接，查看搜索结果页面，判断竞争情况。
      </p>
    </div>
  )
}