import Sidebar from "./Sidebar";
import MainContent from "./MainContent";

export default function MainDashboard() {
  return (
    <div className="main-grid">
      <Sidebar />
      <MainContent />
    </div>
  );
}
