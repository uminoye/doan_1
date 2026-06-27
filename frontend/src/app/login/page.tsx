'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';

const LOGO_URL = 'https://cdn.haitrieu.com/wp-content/uploads/2023/03/Logo-Truong-Cao-dang-nghe-Cong-nghe-cao-Dong-An.png';

const DEMO_ACCOUNTS = [
  { email: 'admin@wms.com', password: '123456', role: 'Admin', accent: '#fef2f2', border: '#f5c2c7', text: '#991b1b' },
  { email: 'sales@wms.com', password: '123456', role: 'Sales', accent: '#ecfdf5', border: '#b7ebc6', text: '#166534' },
  { email: 'warehouse@wms.com', password: '123456', role: 'Kho', accent: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  { email: 'logistics@wms.com', password: '123456', role: 'Logistics', accent: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  { email: 'factory@wms.com', password: '123456', role: 'Nhà máy', accent: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (authService.isAuthenticated()) router.push('/');
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.login(email, password);
      router.push('/');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100dvh',
      display: 'grid', gridTemplateColumns: '1.05fr 0.95fr',
      background: '#f6f7f8', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden',
    }}>
      {/* Left panel */}
      <section style={{
        position: 'relative', overflow: 'hidden', padding: '32px 32px 28px',
        color: 'white', minHeight: 0,
        background: 'radial-gradient(circle at 20% 20%, rgba(34,197,94,0.22), transparent 30%), radial-gradient(circle at 80% 18%, rgba(16,185,129,0.18), transparent 25%), linear-gradient(135deg, #0b2f2f 0%, #10351f 45%, #0b4428 100%)',
      }}>
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {logoError ? null : (
                <img src={LOGO_URL} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} onError={() => setLogoError(true)} />
              )}
              {!LOGO_URL || logoError ? (
                <span style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', color: 'white', fontWeight: 800, fontSize: 12, letterSpacing: 0.8, background: 'linear-gradient(135deg, rgba(20,184,122,0.75), rgba(34,197,94,0.75))' }}>SS</span>
              ) : null}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>STEEL STOCK</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Hệ thống quản lý xuất nhập tồn</div>
            </div>
          </div>

          {/* Hero content */}
          <div style={{ marginTop: 86, maxWidth: 520 }}>
            <h1 style={{ margin: 0, fontSize: 48, lineHeight: 1.08, fontWeight: 800 }}>
              Quản lý kho hàng
              <span style={{ display: 'block', color: '#4ade80' }}>thông minh &amp; hiệu quả</span>
            </h1>
            <p style={{ marginTop: 18, maxWidth: 520, fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
              Theo dõi xuất nhập tồn theo thời gian thực, phân quyền linh hoạt và báo cáo chi tiết cho doanh nghiệp của bạn.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 38 }}>
              {[
                { title: '99.9%', sub: 'Uptime', icon: 'ri-shield-check-line' },
                { title: '5 cấp', sub: 'Phân quyền', icon: 'ri-user-settings-line' },
                { title: 'Real-time', sub: 'Cập nhật', icon: 'ri-arrow-left-right-line' },
              ].map(item => (
                <div key={item.title} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, boxShadow: '0 16px 40px rgba(0,0,0,0.16)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(32,201,151,0.18)', display: 'grid', placeItems: 'center', color: '#6ee7b7', marginBottom: 16, fontSize: 16 }}>
                    <i className={item.icon} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{item.title}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.56)' }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 18, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 18px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '999px', background: 'rgba(32,201,151,0.18)', display: 'grid', placeItems: 'center', color: '#22c55e', fontWeight: 800 }}>
              <i className="ri-user-smile-line" style={{ fontSize: 20 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Nguyễn Văn An</div>
                  <div style={{ marginTop: 2, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Admin · Ban Giám Đốc</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24', fontSize: 14 }}>
                  {[...Array(5)].map((_, i) => <i key={i} className="ri-star-fill" />)}
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.78)', fontStyle: 'italic' }}>
                "Hệ thống giúp chúng tôi kiểm soát kho hàng chính xác hơn 90%, tiết kiệm nhiều giờ làm việc mỗi tuần."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right panel - Login form */}
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', minHeight: 0, overflowY: 'auto' }}>
        <div style={{ width: 'min(100%, 420px)' }}>
          <div style={{ marginTop: 28 }}>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Chào mừng trở lại!</h2>
            <p style={{ marginTop: 8, marginBottom: 0, color: '#64748b' }}>Đăng nhập để tiếp tục quản lý kho hàng</p>
          </div>

          <form onSubmit={handleLogin} style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#334155' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <i className="ri-mail-line" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.vn" required
                  style={{ width: '100%', height: 46, padding: '0 14px 0 40px', borderRadius: 10, border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box', background: 'white', color: '#0f172a', fontSize: 14 }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#334155' }}>Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <i className="ri-lock-line" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }} />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu" required
                  style={{ width: '100%', height: 46, padding: '0 92px 0 40px', borderRadius: 10, border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box', background: 'white', color: '#0f172a', fontSize: 14 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: '#f8fafc', color: '#334155', width: 36, height: 30, borderRadius: 999, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} style={{ fontSize: 18, lineHeight: 1 }} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ height: 46, marginTop: 4, border: 'none', borderRadius: 10, background: 'linear-gradient(90deg, #14b87a 0%, #22c55e 100%)', color: 'white', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 14px 28px rgba(34,197,94,0.25)', fontSize: 15 }}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Chọn nhanh một tài khoản demo bên dưới</div>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DEMO_ACCOUNTS.map(acc => (
              <button key={acc.email} type="button" onClick={() => handleDemoClick(acc)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                width: '100%', borderRadius: 12, border: `1px solid ${acc.border}`, background: acc.accent,
                padding: '12px 14px', fontSize: 13, cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ color: acc.text, fontWeight: 700 }}>{acc.role}</span>
                <span style={{ color: '#475569', fontWeight: 600 }}>{acc.email} / 123456</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
