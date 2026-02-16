import GlassCard from '../components/GlassCard.jsx'
import PillButton from '../components/PillButton.jsx'
import IconButton from '../components/IconButton.jsx'
import TopNav from '../components/TopNav.jsx'
import StatNumber from '../components/StatNumber.jsx'
import ProgressRing from '../components/ProgressRing.jsx'
import MiniLineChart from '../components/MiniLineChart.jsx'
import BottomNav from '../components/BottomNav.jsx'

export default function DemoPage() {
  return (
    <div className="demo-page">
      <div className="demo-frame">
        <div className="phone">
          <div className="status-bar">
            <span>9:41</span>
            <span>●●●</span>
          </div>
          <GlassCard className="plant-card">
            <div className="plant-top-actions">
              <div className="nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </div>
              <PillButton variant="ghost">Buy seeds</PillButton>
            </div>
            <div>
              <div className="plant-screen-title">Alocasia macrorrhiza</div>
              <div className="subtype-label">Herb</div>
            </div>
            <div className="stat-list">
              <div className="stat-row">
                <span>Hybrid</span>
                <strong>Yes</strong>
              </div>
              <div className="stat-row">
                <span>Yield</span>
                <strong>± 523 gr</strong>
              </div>
              <div className="stat-row">
                <span>THC</span>
                <strong>14%</strong>
              </div>
              <div className="stat-row">
                <span>CBD</span>
                <strong>0.2%</strong>
              </div>
              <div className="stat-row">
                <span>Flowering</span>
                <strong>6-8 weeks</strong>
              </div>
            </div>
            <div className="hero-plant" />
            <a className="link-underlined" href="#">
              Learn more
            </a>
            <div className="plant-footer">
              <div className="stat-row">
                <span>Compare</span>
              </div>
              <PillButton variant="accent">Next</PillButton>
            </div>
          </GlassCard>
        </div>

        <div className="phone control-screen">
          <div className="status-bar">
            <span>9:41</span>
            <span>●●●</span>
          </div>
          <div>
            <div className="control-title">High Rise</div>
            <div className="control-subtitle">4th week</div>
          </div>
          <div className="control-stats">
            <StatNumber value="100" unit="EC" />
            <StatNumber value="28" unit="PT" align="right" />
          </div>
          <div className="control-center">
            <div className="ph">6.23</div>
            <div className="ph-label">pH</div>
          </div>
          <div className="control-curves">
            <div className="curve-panel" />
            <div className="vertical-slider" />
          </div>
          <div className="control-icons">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v18" />
              <path d="M5 16h14" />
            </svg>
            <div className="power-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v8" />
                <path d="M6.5 6.5a7 7 0 1 0 11 0" />
              </svg>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8 6 6 9 6 12a6 6 0 0 0 12 0c0-3-2-6-6-10z" />
            </svg>
          </div>
        </div>

        <div className="phone progress-screen">
          <div className="status-bar">
            <span>9:41</span>
            <span>●●●</span>
          </div>
          <TopNav title="Lemon Haze" />
          <div className="progress-ring-wrapper">
            <div className="blur-blob" />
            <ProgressRing value={0.62} label="5th week" />
          </div>
          <div className="progress-section">
            <div className="progress-header">
              <div className="blur-blob progress-blob" />
              <div className="section-label">Growing</div>
              <PillButton variant="ghost">Update data</PillButton>
            </div>
            <div className="chart-panel">
              <div className="blur-blob" />
              <MiniLineChart />
              <div className="chart-labels">
                <span>Vegetative</span>
                <span>Pre-flowering</span>
              </div>
            </div>
          </div>
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
