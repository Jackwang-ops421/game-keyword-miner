import { useState, useEffect } from 'react'
import { getPlatforms, updatePlatform } from '@/api'
import type { Platform } from '@/types'

export default function Platforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlatforms()
  }, [])

  const loadPlatforms = async () => {
    try {
      const data = await getPlatforms()
      setPlatforms(data)
    } catch (error) {
      console.error('Failed to load platforms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (platform: Platform) => {
    try {
      await updatePlatform(platform.id, { enabled: !platform.enabled })
      setPlatforms(prev =>
        prev.map(p => p.id === platform.id ? { ...p, enabled: !p.enabled } : p)
      )
    } catch (error) {
      alert('更新失败')
    }
  }

  const priorityColor = (priority: string) => {
    switch (priority) {
      case '必做': return 'bg-red-100 text-red-700'
      case '高优先': return 'bg-orange-100 text-orange-700'
      case '次优先': return 'bg-yellow-100 text-yellow-700'
      case '验证源': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const typeColor = (type: string) => {
    switch (type) {
      case '首发源': return 'bg-green-100 text-green-700'
      case '验证源': return 'bg-blue-100 text-blue-700'
      case '社媒': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">加载中...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">平台管理</h2>
        <span className="text-sm text-gray-500">
          已启用 {platforms.filter(p => p.enabled).length} / {platforms.length} 个平台
        </span>
      </div>

      <div className="grid gap-4">
        {platforms.map(platform => (
          <div
            key={platform.id}
            className={`bg-white rounded-xl p-4 shadow-sm border transition ${
              platform.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggle(platform)}
                  className={`w-12 h-6 rounded-full transition ${
                    platform.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${
                    platform.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{platform.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${typeColor(platform.platformType)}`}>
                      {platform.platformType}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${priorityColor(platform.priority)}`}>
                      {platform.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{platform.domain}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>方式: {platform.crawlMethod}</span>
                {platform.lastSyncAt && (
                  <span>上次同步: {new Date(platform.lastSyncAt).toLocaleDateString()}</span>
                )}
                <span className={`px-2 py-0.5 rounded text-xs ${
                  platform.lastSyncStatus === 'success' ? 'bg-green-100 text-green-700' :
                  platform.lastSyncStatus === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {platform.lastSyncStatus || '未同步'}
                </span>
              </div>
            </div>
            {platform.notes && (
              <p className="mt-2 text-sm text-gray-500">{platform.notes}</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 className="font-medium text-gray-700 mb-2">说明</h3>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• <strong>首发源</strong>：用于发现新游戏的平台（如 itch.io、Cocrea）</li>
          <li>• <strong>验证源</strong>：用于验证游戏是否被大站收录的平台（如 Poki、CrazyGames）</li>
          <li>• <strong>必做</strong>：V1 必须实现的采集平台</li>
          <li>• <strong>高优先</strong>：V1 高优先级尝试，允许失败降级</li>
        </ul>
      </div>
    </div>
  )
}