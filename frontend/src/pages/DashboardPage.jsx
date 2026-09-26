import BrandMark from '../components/BrandMark.jsx';

function initials(name = '') {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export default function DashboardPage({ user, onLogout }) {
  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand-lockup" href="#"><BrandMark /><span>LUMINA</span></a>
        <div className="topbar-actions">
          <span className="status-label"><i></i> All systems clear</span>
          <button id="logout-button" className="logout-button" onClick={onLogout}>Sign out <span>↗</span></button>
        </div>
      </header>
      <section className="dashboard-content">
        <div className="welcome-row">
          <div>
            <p className="eyebrow">AUTHENTICATED USER</p>
            <h1>Good morning, {user.name.split(' ')[0]}.</h1>
            <p className="welcome-copy">Role: {user.role}</p>
          </div>
          <div className="avatar">{initials(user.name)}</div>
        </div>
        <div className="overview-grid">
          <article className="feature-card">
            <div className="card-top"><span className="card-icon">✦</span><span className="card-kicker">YOUR SPACE</span></div>
            <h2>Keep your best<br /><em>thinking close.</em></h2>
            <p>This is your private workspace. Everything you create here belongs to you.</p>
            <button className="card-action">Open workspace <span>→</span></button>
          </article>
          <article className="stat-card">
            <span className="card-kicker">ACCOUNT STATUS</span>
            <strong>Active</strong>
            <span className="stat-line"><i></i> Protected and synced</span>
          </article>
          <article className="stat-card light">
            <span className="card-kicker">MEMBER SINCE</span>
            <strong>September<br />2026</strong>
            <span className="stat-line">Just getting started</span>
          </article>
        </div>
        <div className="lower-row">
          <div><p className="eyebrow">RECENT ACTIVITY</p><h3>A clean slate.</h3></div>
          <p className="empty-note">Your activity will appear here as you make progress.</p>
        </div>
      </section>
      <footer className="dashboard-footer"><span>© 2026 Lumina</span><span>Signed in as {user.email}</span></footer>
    </main>
  );
}
