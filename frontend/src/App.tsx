import { abortLlm, runPipeline } from './llm/run'
import EditScreen from './screens/EditScreen'
import InputScreen from './screens/InputScreen'
import { useCardStore } from './store'

export default function App() {
  const card = useCardStore((s) => s.card)
  const load = useCardStore((s) => s.load)
  const clear = useCardStore((s) => s.clear)

  if (card) {
    return (
      <EditScreen
        onBack={() => {
          abortLlm()
          clear()
        }}
      />
    )
  }
  return (
    <InputScreen
      onGenerated={({ card, charts, pending, session_id }) => {
        load(card, charts, pending, session_id)
        void runPipeline()
      }}
    />
  )
}
