export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-navy flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />
        <div className="flex items-center gap-2 relative">
          <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center font-display font-bold text-navy">
            SC
          </div>
          <span className="font-display font-semibold text-white text-lg">SiteClock</span>
        </div>
        <div className="relative">
          <p className="font-display text-3xl text-white leading-snug max-w-md">
            Know who&apos;s in, who&apos;s late, and who needs a nudge — before 9am.
          </p>
          <p className="text-[#8CA3C7] mt-4 text-sm max-w-sm">
            GPS, QR, and selfie clock-ins. Built for teams across multiple sites.
          </p>
        </div>
        <p className="text-[#5C7299] text-xs relative">© 2026 SiteClock</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
