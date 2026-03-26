import { Suspense, lazy } from 'react'

const ForagingMap = lazy(() => import('./ForagingMap.jsx'))

export default function LazyForagingMap(props) {
  return (
    <Suspense
      fallback={
        <div className="forager-map forager-map--loading">
          <div className="forager-map__placeholder">Loading map...</div>
        </div>
      }
    >
      <ForagingMap {...props} />
    </Suspense>
  )
}
