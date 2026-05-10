import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCandidates, syncPlatform } from '@/api'
import { calculateKeywordScore, getDecisionLabel } from '@/utils/score'
import type { Candidate } from '@/types'

export default function Dashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncPlatformName, setSyncPlatformName] = useState('')

  useEffect(() => {
    loadCandidates()
  }, [])

  const loadCandidates = async () => {
    try {
      const data = await getCandidates({ limit: 100 })
      setCandidates(data)
    } catch (error) {
      console.error('Failed to load candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (platform: string) => {
    setSyncing(true)
    setSyncPlatformName(platform)
    try {
      await syncPlatform(platform)
      await loadCandidates()
    } catch (error) {
      console.error('Sync failed:', error)
      alert('同步失败，请重试')
    } finally {
      setSyncing(false)
      setSyncPlatformName('')
    }
  }

  // 计算统计数据
  const stats = {
    todayNew: candidates.filter(c => {
      const discovered = new Date(c.discoveredAt)
      const today = new Date()
      return discovered.toDateString() === today.toDateString()
    }).length,
    weekNew: candidates.filter(c => {
      const discovered = new Date(c.discoveredAt)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return discovered >= weekAgo
    }).length,
    pending: candidates.filter(c => c.status === 'pending').length,
    highScore: candidates.filter(c => {
      const score = calculateKeywordScore({
        publishedAt: c.publishedAt,
        discoveredAt: c.discoveredAt,
        playableInBrowser: c.canEmbed,
      })
      return score.totalScore >= 80
    }).length,
    immediate: candidates.filter(c => {
      const score = calculateKeywordScore({
        publishedAt: c.publishedAt,
        discoveredAt: c.discoveredAt,
        playableInBrowser: c.canEmbed,
      })
      return score.decision === 'immediate_launch'
    }).length,
  }

  // 获取高分候选词
  const topCandidates = [...candidates]
    .map(c => ({
      ...c,
      score: calculateKeywordScore({
        publishedAt: c.publishedAt,
        discoveredAt: c.discoveredAt,
        playableInBrowser: c.canEmbed,
      }),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore)
    .slice(0, 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 mt-1">H5小游戏出海新词挖掘工作台</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSync('itch.io')}
            disabled={syncing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {syncing && syncPlatformName === 'itch.io' ? '同步中...' : '🔄 同步新游戏'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="今日新增" value={stats.todayNew} icon="📅" />
        <StatCard label="本周新增" value={stats.weekNew} icon="📆" />
        <StatCard label="待核查" value={stats.pending} icon="⏳" />
        <StatCard label="高分词" value={stats.highScore} icon="⭐" />
        <StatCard label="立即上站" value={stats.immediate} icon="🚀" color="text-green-600" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="font-medium text-gray-700 mb-3">快速同步</h3>
        <div className="flex flex-wrap gap-2">
          {['itch.io', 'Scratch', 'Game Jolt'].map(platform => (
            <button
              key={platform}
              onClick={() => handleSync(platform)}
              disabled={syncing}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition disabled:opacity-50"
            >
              {syncing && syncPlatformName === platform ? '同步中...' : `同步 ${platform}`}
            </button>
          ))}
          <Link
            to="/platforms"
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition"
          >
            管理平台 →
          </Link>
        </div>
      </div>

      {/* Top Candidates */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Top 候选词</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">游戏名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">来源</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">趋势</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">分数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">建议</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topCandidates.map(candidate => (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/candidates/${candidate.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {candidate.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{candidate.sourcePlatform}</td>
                  <td className="px-4 py-3">
                    <span className="text-gray-500 text-sm">{candidate.recencyLevel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${
                      candidate.score.totalScore >= 80 ? 'text-green-600' :
                      candidate.score.totalScore >= 65 ? 'text-blue-600' :
                      candidate.score.totalScore >= 50 ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {candidate.score.totalScore}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <DecisionBadge decision={candidate.score.decision} />
                  </td>
                </tr>
              ))}
              {topCandidates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    暂无候选词，试试同步新游戏
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color = 'text-blue-600' }: {
  label: string
  value: number
  icon: string
  color?: string
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
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