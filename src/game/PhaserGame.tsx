import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { GardenScene } from './scenes/GardenScene'

interface Props {
  onSceneReady?: (scene: GardenScene) => void
}

export function PhaserGame({ onSceneReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 700,
      height: 480,
      backgroundColor: '#87CEEB',
      scene: [GardenScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
      },
      // Отключаем баннер Phaser в консоли
      banner: false,
    })

    gameRef.current = game

    // Ждём готовности сцены
    game.events.once('ready', () => {
      const scene = game.scene.getScene('GardenScene') as GardenScene
      if (scene && onSceneReady) {
        onSceneReady(scene)
      }
    })

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Метод для отправки событий в Phaser из React
  const emitToGame = (event: string, data?: unknown) => {
    gameRef.current?.events.emit(event, data)
  }

  // Прокидываем emitToGame наружу через data-атрибут (простой способ)
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { emitToGame: typeof emitToGame }).emitToGame = emitToGame
    }
  })

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '700px',
        margin: '0 auto',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    />
  )
}

// Хук для вызова событий Phaser из любого React-компонента
export function useGameEvent() {
  const gameContainerRef = useRef<HTMLDivElement | null>(null)

  const emit = (event: string, data?: unknown) => {
    // Получаем игру через глобальный реестр Phaser
    const game = Phaser.GameObjects.GameObjectFactory.prototype as unknown
    void game
    // Используем window как шину событий между React и Phaser
    window.dispatchEvent(new CustomEvent(`phaser:${event}`, { detail: data }))
  }

  return { emit, gameContainerRef }
}

// Глобальная шина событий React → Phaser
export const gameEventBus = {
  emit(event: string, data?: unknown) {
    window.dispatchEvent(new CustomEvent(`phaser:${event}`, { detail: data }))
  }
}
