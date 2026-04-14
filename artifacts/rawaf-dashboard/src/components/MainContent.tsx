import { Building2, Mail, Phone, FileText, Briefcase, MapPin, DollarSign } from "lucide-react";
import type { Contractor } from "@workspace/api-client-react";

interface Props {
  contractor: Contractor | null;
  allContractors: Contractor[];
  isLoading: boolean;
}

const BAR_COLORS = ["#c5a059", "#3b8fcc", "#2baa74", "#e8851c", "#9b59b6", "#e74c3c"];

function formatPrice(p: number) {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000) return `${(p / 1_000).toFixed(0)}K`;
  return String(p);
}

export default function MainContent({ contractor, allContractors, isLoading }: Props) {
  if (isLoading) {
    return (
      <main className="content-area">
        <div style={{ background: "#fff", borderRadius: "16px", height: "200px", animation: "pulse-gold 1.5s ease-in-out infinite" }} />
      </main>
    );
  }

  const maxPrice = allContractors.length > 0 ? Math.max(...allContractors.map((c) => c.price)) : 1;
  const top5 = [...allContractors].sort((a, b) => b.price - a.price).slice(0, 5);

  return (
    <main className="content-area">
      {/* Contractor Details Card */}
      {contractor ? (
        <div className="card animate-fade-up" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--charcoal)", marginBottom: "4px" }}>
                {contractor.contractor}
              </h2>
              <span style={{ fontSize: "0.72rem", background: "rgba(197,160,89,0.12)", color: "var(--gold)", borderRadius: "20px", padding: "3px 10px", fontWeight: 700 }}>
                {contractor.workType}
              </span>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.65rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>قيمة العقد</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--gold)" }}>
                {(contractor.price / 1_000_000).toFixed(2)}M
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
            {[
              { icon: <FileText size={14} />, label: "رقم العقد", value: contractor.contractNo },
              { icon: <Building2 size={14} />, label: "المشروع", value: contractor.project },
              { icon: <MapPin size={14} />, label: "المحفظة", value: contractor.portfolio },
              { icon: <Briefcase size={14} />, label: "نطاق التوصيف الفني للبند", value: contractor.technicalScope },
              { icon: <Phone size={14} />, label: "رقم التواصل", value: contractor.phone },
              { icon: <Mail size={14} />, label: "البريد الإلكتروني", value: contractor.email },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: "#f9f7f3", borderRadius: "10px", padding: "12px 14px",
                  borderRight: "3px solid rgba(197,160,89,0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ color: "var(--gold)" }}>{item.icon}</span>
                  <span style={{ fontSize: "0.62rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</span>
                </div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--charcoal)", wordBreak: "break-word" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card animate-fade-up" style={{ textAlign: "center", padding: "40px", marginBottom: "20px" }}>
          <Building2 size={48} style={{ color: "#ddd", margin: "0 auto 12px" }} />
          <p style={{ color: "#bbb", fontSize: "0.9rem" }}>اختر مقاولاً من القائمة أو استخدم الفلاتر للبحث</p>
        </div>
      )}

      {/* Price Comparison Chart */}
      {top5.length > 0 && (
        <div className="card animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--charcoal)", display: "flex", alignItems: "center", gap: "8px" }}>
              <DollarSign size={14} style={{ color: "var(--gold)" }} />
              مقارنة أسعار العطاءات
            </h3>
            <span style={{ fontSize: "0.65rem", color: "#aaa", background: "#f5f0e8", borderRadius: "4px", padding: "3px 8px" }}>
              أعلى {top5.length} مقاولين
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {top5.map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "130px", fontSize: "0.72rem", color: "var(--charcoal)", textAlign: "right", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.contractor}
                </div>
                <div style={{ flex: 1, background: "#f5f0e8", borderRadius: "6px", overflow: "hidden", height: "18px" }}>
                  <div
                    style={{
                      width: `${(c.price / maxPrice) * 100}%`,
                      height: "100%",
                      background: BAR_COLORS[i % BAR_COLORS.length],
                      borderRadius: "6px",
                      transition: "width 0.8s ease",
                      display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "6px",
                    }}
                  >
                    <span style={{ fontSize: "0.6rem", color: "#fff", fontWeight: 700 }}>{formatPrice(c.price)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
