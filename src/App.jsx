import Sidebar from './components/Sidebar.jsx';
import Toast from './components/Toast.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import Activity from './views/Activity.jsx';
import Problems from './views/Problems.jsx';
import Review from './views/Review.jsx';
import Settings from './views/Settings.jsx';
import Today from './views/Today.jsx';

const VIEWS = { today: Today, problems: Problems, review: Review, activity: Activity, settings: Settings };

export default function App() {
  const [route, go] = useHashRoute();
  const View = VIEWS[route] || Today;
  return (
    <div className="app">
      <Sidebar route={route} go={go} />
      <main className="main">
        <View go={go} />
      </main>
      <Toast />
    </div>
  );
}
