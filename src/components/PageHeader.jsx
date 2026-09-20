import ThemeSwitch from './ThemeSwitch.jsx';

export default function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="page-head-tools">
        {children}
        <ThemeSwitch />
      </div>
    </header>
  );
}
