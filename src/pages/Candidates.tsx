import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCandidates, deleteCandidate, importCandidates } from '@/api'
import { calculateKeywordScore, getDecisionLabel, normalizeTitle, isValidTitle } from '@/utils/score'
import type { Candidate } from '@/types'

export default function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'observing' | 'ready' | 'launched'>('all')
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')

  useEffect(() => {
    loadCandidates()
  }, [filter])

  const loadCandidates = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : undefined
      const data = await getCandidates(params)
      setCandidates(data)
    } catch (error) {
      console.error('Failed to load:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return
    try {
      await deleteCandidate(id)
      setCandidates(prev => prev.filter(c => c.id !== id))
    } catch (error) {
      alert('删除失败')
    }
  }

  const handleImport = async () => {
    const lines = importText.split('\n').filter(line => line.trim())
    const candidates = lines.map(line => {
      const name = line.trim()
      return {
        name,
        originalTitle: name,
        normalizedName: normalizeTitle(name),
        sourcePlatform: 'manual',
        sourceUrl: '',
        discoveredAt: new Date().toISOString(),
        status: 'pending' as const,
      }
    }).filter(c => isValidTitle(c.name))

    try {
      const result = await importCandidates(candidates)
      alert(`导入成功: ${result.imported}个, 重复: ${result.duplicated}个`)
      setShowImport(false)
      setImportText('')
      loadCandidates()
    } catch (error) {
      alert('导入失败')
    }
  }

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const withScores = filtered.map(c => ({
    ...c,
    score: calculateKeywordScore({
      publishedAt: c.publishedAt,
      discoveredAt: c.discoveredAt,
      playableInBrowser: c.canEmbed,
    }),
  }))

  if (loading) {
    return <div className="flex justify-center p-8">加载中...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">候选词列表</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            📥 批量导入
          </button>
          <Link
            to="/candidates/new"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            + 新增候选词
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <input
          type="text"
          placeholder="搜索游戏名..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部状态</option>
          <option value="pending">待核查</option>
          <option value="observing">观察中</option>
          <option value="ready">准备上站</option>
          <option value="launched">已上站</option>
          <option value="abandoned">放弃</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">游戏名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">来源</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">新近度</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">分数</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">决策</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {withScores.map(candidate => (
              <tr key={candidate.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    to={`/candidates/${candidate.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {candidate.name}
                  </Link>
                  {candidate.thumbnail && (
                    <img
                      src={candidate.thumbnail}
                      alt=""
                      className="w-8 h-8 rounded mt-1 object-cover"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 text-sm">{candidate.sourcePlatform}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    candidate.recencyLevel === '<24h' ? 'bg-green-100 text-green-700' :
                    candidate.recencyLevel === '1-7d' ? 'bg-blue-100 text-blue-700' :
                    candidate.recencyLevel === '7-30d' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {candidate.recencyLevel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${
                    candidate.score.totalScore >= 80 ? 'text-green-600' :
                    candidate.score.totalScore >= 65 ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    {candidate.score.totalScore}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <DecisionBadge decision={candidate.score.decision} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={candidate.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      to={`/candidates/${candidate.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      详情
                    </Link>
                    <button
                      onClick={() => handleDelete(candidate.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {withScores.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无候选词
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">批量导入候选词</h3>
            <p className="text-sm text-gray-500 mb-4">
              每行一个游戏名，纯文本格式
            </p>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={`Nomad Idle\nDark Loop\nTiny Pasture\nBlood Typers`}
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DecisionBadge({ decision }: { decision: string }) {
  const config = getDecisionLabel(decision as any)
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.color} ${config.textColor}`}>
      {config.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    observing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    launched: 'bg-purple-100 text-purple-700',
    abandoned: 'bg-gray-100 text-gray-700',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[status] || colors.pending}`}>
      {status}
    </span>
  )
}