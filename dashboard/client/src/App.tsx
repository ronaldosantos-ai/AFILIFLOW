import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  DatabaseZap,
  Facebook,
  Gauge,
  HelpCircle,
  Home,
  LineChart as LineChartIcon,
  Link2,
  Menu,
  MousePointerClick,
  Plug,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  User,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const pct = (value: number) => `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const num = (value: number) => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

type NavItem = { href: string; label: string; icon: React.ElementType; children?: NavItem[] };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/resultado-analitico", label: "Resultado analítico", icon: BarChart3 },
  { href: "/conta-anuncio", label: "Conta de anúncio", icon: Facebook },
  { href: "/pre-checkout", label: "Pré-checkout", icon: MousePointerClick },
  { href: "/eventos", label: "Eventos", icon: Activity },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/integracoes", label: "Integrações", icon: Plug },
  {
    href: "/configuracoes/minha-conta",
    label: "Configurações",
    icon: Settings,
    children: [
      { href: "/configuracoes/minha-conta", label: "Minha conta", icon: User },
      { href: "/configuracoes/colaboradores", label: "Colaboradores", icon: Users },
      { href: "/configuracoes/perfis-permissoes", label: "Perfis e permissões", icon: ShieldCheck },
    ],
  },
  { href: "/central-de-ajuda", label: "Central de ajuda", icon: HelpCircle },
];

function useActiveAccount() {
  const accounts = trpc.adTracker.getAccounts.useQuery(undefined, { staleTime: 60_000 });
  const [selectedId, setSelectedId] = useState<number>(() => Number(localStorage.getItem("adtracker.account") || 1));
  const account = accounts.data?.find((item) => item.id === selectedId) ?? accounts.data?.[0];
  const selectAccount = (id: number) => {
    setSelectedId(id);
    localStorage.setItem("adtracker.account", String(id));
  };
  return { accounts: accounts.data ?? [], account, selectedId: account?.id ?? selectedId, selectAccount };
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("adtracker.sidebar") === "collapsed");
  const [location] = useLocation();
  const [accountModal, setAccountModal] = useState(false);
  const active = useActiveAccount();
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("adtracker.sidebar", next ? "collapsed" : "expanded");
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#0d2137]">
      <aside className={`fixed inset-y-0 left-0 z-30 bg-[#0d2137] text-white transition-all duration-200 ${collapsed ? "w-[60px]" : "w-[220px]"}`}>
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          {!collapsed && <div className="font-bold text-lg tracking-tight">AdTracker</div>}
          <button className="rounded-lg p-2 hover:bg-white/10" onClick={toggleSidebar} aria-label="Alternar sidebar"><Menu size={20} /></button>
        </div>
        <nav className="p-2 space-y-1">
          {navItems.map((item) => <SidebarItem key={item.href} item={item} location={location} collapsed={collapsed} />)}
        </nav>
      </aside>
      <main className={`transition-all duration-200 ${collapsed ? "ml-[60px]" : "ml-[220px]"}`}>
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#1a6ef5] text-white grid place-items-center"><Gauge size={20} /></div>
            <div>
              <p className="text-sm text-slate-500">Sistema pessoal de atribuição</p>
              <h1 className="font-semibold leading-tight">Meta Ads Tracking</h1>
            </div>
          </div>
          <button onClick={() => setAccountModal(true)} className="hidden md:flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-2 hover:border-[#1a6ef5]">
            <Facebook size={18} className="text-[#1a6ef5]" />
            <span className="text-sm font-medium">{active.account?.name ?? "Selecionar conta"}</span>
            <ChevronDown size={16} />
          </button>
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-slate-200 p-2 hover:border-[#1a6ef5]"><Settings size={18} /></button>
            <div className="h-9 w-9 rounded-full bg-[#0d2137] text-white grid place-items-center font-bold">R</div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
      {accountModal && (
        <Modal title="Selecionar conta de anúncio" onClose={() => setAccountModal(false)}>
          <div className="space-y-3">
            {active.accounts.map((account) => (
              <button key={account.id} onClick={() => { active.selectAccount(account.id); setAccountModal(false); }} className="w-full rounded-xl border border-slate-200 p-4 text-left hover:border-[#1a6ef5] hover:bg-blue-50">
                <div className="font-semibold">{account.name}</div>
                <div className="text-sm text-slate-500">{account.externalId}</div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function SidebarItem({ item, location, collapsed }: { item: NavItem; location: string; collapsed: boolean }) {
  const [open, setOpen] = useState(location.startsWith(item.href) || item.children?.some((child) => location.startsWith(child.href)));
  const Icon = item.icon;
  const active = location === item.href || item.children?.some((child) => location.startsWith(child.href));
  if (item.children) {
    return (
      <div>
        <button onClick={() => setOpen(!open)} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${active ? "bg-[#1a6ef5]" : "hover:bg-white/10"}`}>
          <Icon size={19} /> {!collapsed && <><span className="flex-1 text-left">{item.label}</span><ChevronDown size={14} className={open ? "rotate-180" : ""} /></>}
        </button>
        {open && !collapsed && <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-2">{item.children.map((child) => <SidebarItem key={child.href} item={child} location={location} collapsed={collapsed} />)}</div>}
      </div>
    );
  }
  return (
    <Link href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${active ? "bg-[#1a6ef5]" : "hover:bg-white/10"}`} title={item.label}>
      <Icon size={19} /> {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function PageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-[#0d2137]">{title}</h2>
        <p className="text-slate-500 mt-1 max-w-3xl">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

function Button({ children, variant = "primary", onClick }: { children: React.ReactNode; variant?: "primary" | "secondary" | "danger"; onClick?: () => void }) {
  const styles = variant === "primary" ? "bg-[#1a6ef5] text-white hover:bg-[#0f5bd2]" : variant === "danger" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-white border border-slate-200 text-[#0d2137] hover:border-[#1a6ef5]";
  return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${styles}`}>{children}</button>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0d2137]/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Filters() {
  return (
    <Card className="p-4 mb-6">
      <div className="grid gap-3 md:grid-cols-5">
        <input type="date" className="rounded-xl border border-slate-200 px-3 py-2" />
        <input type="date" className="rounded-xl border border-slate-200 px-3 py-2" />
        <input placeholder="Campanha" className="rounded-xl border border-slate-200 px-3 py-2" />
        <input placeholder="Conjunto" className="rounded-xl border border-slate-200 px-3 py-2" />
        <input placeholder="Anúncio" className="rounded-xl border border-slate-200 px-3 py-2" />
      </div>
      <div className="mt-3 flex gap-2"><Button><Search size={16} /> Aplicar filtros</Button><Button variant="secondary"><X size={16} /> Limpar filtros</Button></div>
    </Card>
  );
}

function DashboardPage() {
  const { selectedId } = useActiveAccount();
  const dashboard = trpc.adTracker.getDashboard.useQuery({ adAccountId: selectedId });
  const data = dashboard.data;
  return (
    <AppShell>
      <PageHeader title="Dashboard" description="Visão executiva com faturamento, investimento, lucro, conversões e visitantes online." actions={<><Button variant="secondary"><RefreshCcw size={16} /> Atualizar</Button><Button><SlidersHorizontal size={16} /> Filtrar</Button></>} />
      <Filters />
      <div className="grid gap-4 md:grid-cols-3">
        <Kpi title="Faturamento líquido" value={brl.format(data?.kpis.netRevenue ?? 0)} color="green" icon={CircleDollarSign} />
        <Kpi title="Investimento em anúncios" value={brl.format(data?.kpis.adSpend ?? 0)} color="blue" icon={WalletCards} />
        <Kpi title="Lucro" value={brl.format(data?.kpis.profit ?? 0)} color="green" icon={Gauge} />
        <Kpi title="Custos com produto" value={brl.format(data?.kpis.productCosts ?? 0)} color="red" icon={Boxes} />
        <Kpi title="Taxas e impostos" value={brl.format(data?.kpis.taxes ?? 0)} color="red" icon={CreditCard} />
        <Kpi title="Chargeback" value={brl.format(data?.kpis.chargeback ?? 0)} color="red" icon={RefreshCcw} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <CircleMetric title="ROAS" value={num(data?.kpis.roas ?? 0)} />
        <CircleMetric title="ROI" value={pct(data?.kpis.roi ?? 0)} />
        <CircleMetric title="Margem" value={pct(data?.kpis.margin ?? 0)} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <div className="bg-[#1a3a6e] text-white p-5 flex items-center justify-between">
            <div><h3 className="font-bold">Conversões: {brl.format(data?.conversions.total ?? 0)}</h3><p className="text-blue-100 text-sm">Vendas do período ({data?.conversions.salesCount ?? 0} vendas)</p></div>
            <LineChartIcon />
          </div>
          <div className="h-80 p-4 bg-[#0d2137]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.conversions.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.12)" />
                <XAxis dataKey="date" stroke="#b8c7e0" fontSize={12} />
                <YAxis stroke="#b8c7e0" fontSize={12} />
                <Tooltip formatter={(value: number) => brl.format(value)} contentStyle={{ borderRadius: 12 }} />
                <Line type="monotone" dataKey="valor" stroke="#00c48c" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5"><div className="text-sm text-slate-500">Visitantes online agora</div><div className="mt-2 text-4xl font-bold text-[#00c48c]">{data?.realtime.onlineNow ?? 0}</div><div className="text-sm text-slate-500">{data?.realtime.perMinute ?? 0} usuário online/minuto</div></Card>
          <Card className="p-5"><h3 className="font-bold mb-3">Páginas mais visitadas</h3><Table rows={(data?.realtime.topPages ?? []).map((p) => [p.page, p.visits])} headers={["Página", "Visitas"]} /></Card>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Secondary title="Vendas pendentes" value={brl.format(data?.secondary.pending.amount ?? 0)} detail={`${data?.secondary.pending.count ?? 0} transações`} />
        <Secondary title="Estornos e reembolsos" value={brl.format(data?.secondary.refunds.amount ?? 0)} detail={`${data?.secondary.refunds.count ?? 0} transações`} />
        {(data?.paymentBreakdown ?? []).map((item) => <Secondary key={item.method} title={paymentLabel(item.method)} value={brl.format(item.amount)} detail={`${item.count} vendas`} />)}
      </div>
    </AppShell>
  );
}

function Kpi({ title, value, color, icon: Icon }: { title: string; value: string; color: "green" | "blue" | "red"; icon: React.ElementType }) {
  const colors = { green: "text-[#00c48c] bg-emerald-50", blue: "text-[#1a6ef5] bg-blue-50", red: "text-[#ff4d4f] bg-red-50" };
  return <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></div><div className={`rounded-2xl p-3 ${colors[color]}`}><Icon size={24} /></div></div></Card>;
}

function CircleMetric({ title, value }: { title: string; value: string }) {
  return <Card className="p-5 flex items-center gap-4"><div className="h-16 w-16 rounded-full border-8 border-[#1a6ef5]/20 grid place-items-center text-[#1a6ef5] font-bold">{title.slice(0, 1)}</div><div><div className="text-sm text-slate-500">{title}</div><div className="text-2xl font-bold">{value}</div></div></Card>;
}

function Secondary({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <Card className="p-4"><p className="text-sm text-slate-500">{title}</p><p className="font-bold mt-1">{value}</p><p className="text-xs text-slate-500 mt-1">{detail}</p></Card>;
}

function paymentLabel(method: string) {
  return method === "credit_card" ? "Cartão de crédito" : method === "boleto" ? "Boleto bancário" : method === "pix" ? "PIX" : "Outros";
}

function AnalyticsPage() {
  const [tab, setTab] = useState<"campaign" | "adset" | "ad">("campaign");
  const rows = trpc.adTracker.getAnalytics.useQuery({ level: tab });
  return (
    <AppShell>
      <PageHeader title="Resultado analítico" description="Análise granular por campanha, conjunto e anúncio com métricas reais de atribuição." actions={<><Button variant="secondary"><RefreshCcw size={16} /> Atualizar</Button><Button><SlidersHorizontal size={16} /> Filtrar</Button><Button variant="secondary"><Settings size={16} /> Colunas</Button></>} />
      <Filters />
      <Card className="p-4">
        <div className="mb-4 flex gap-2">{[["campaign", "Campanhas"], ["adset", "Conjuntos"], ["ad", "Anúncios"]].map(([id, label]) => <button key={id} onClick={() => setTab(id as any)} className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === id ? "bg-[#1a6ef5] text-white" : "bg-slate-100 text-slate-700"}`}>{label}</button>)}</div>
        <AnalyticsTable rows={rows.data ?? []} level={tab} />
        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">Em breve você poderá criar regras automáticas de otimização e alertas personalizados por métrica.</div>
      </Card>
    </AppShell>
  );
}

function AnalyticsTable({ rows, level }: { rows: any[]; level: string }) {
  const first = level === "campaign" ? "Campanha" : level === "adset" ? "Conjunto" : "Anúncio";
  return <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-sm"><thead><tr className="text-left text-slate-500 border-b">{[first, "CPT", "Qtde vendas aprovadas", "CPA", "Investimento", "Faturamento líquido", "Lucro", "ROAS", "Margem (%)", "ROI", "CPC", "CPM", "Ações"].map((h) => <th key={h} className="py-3 pr-4 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="py-3 pr-4"><div className="font-medium">{row.name}</div><div className="text-xs text-slate-500">{row.externalId} · {row.status}</div></td><td>{brl.format(row.cpt)}</td><td>{row.approvedSales}</td><td>{brl.format(row.cpa)}</td><td>{brl.format(row.spend)}</td><td>{brl.format(row.netRevenue)}</td><td className={row.profit >= 0 ? "text-[#00c48c]" : "text-[#ff4d4f]"}>{brl.format(row.profit)}</td><td>{num(row.roas)}</td><td>{pct(row.margin)}</td><td>{pct(row.roi)}</td><td>{brl.format(row.cpc)}</td><td>{brl.format(row.cpm)}</td><td><div className="flex gap-2"><button className="rounded-lg bg-slate-100 px-2 py-1">Pausar</button><button className="rounded-lg bg-slate-100 px-2 py-1">Duplicar</button></div></td></tr>)}</tbody></table></div>;
}

function AccountPage() {
  const resources = trpc.adTracker.getAccountResources.useQuery({ adAccountId: 1 });
  const data = resources.data;
  const [urlModal, setUrlModal] = useState(false);
  return (
    <AppShell>
      <PageHeader title="Conta de anúncio" description="Configure pixels, conversões, webhooks, taxas, produtos e links de rastreamento da conta ativa." actions={<Button><RefreshCcw size={16} /> Sincronizar Meta</Button>} />
      <Card className="p-5 mb-4"><div className="flex items-center gap-3"><Facebook className="text-[#1a6ef5]" /><div><h3 className="font-bold">{data?.account.name}</h3><p className="text-sm text-slate-500">ID {data?.account.externalId} · Último sync {data?.account.lastSyncAt?.slice(0, 16).replace("T", " ")}</p></div></div><div className="mt-4 grid gap-2 md:grid-cols-5 text-sm">{["Conectar conta", "Instalar analytics", "Configurar webhook", "Gerar URL", "Validar eventos"].map((step, index) => <div className="rounded-xl bg-slate-50 p-3" key={step}><b>{index + 1}.</b> {step}</div>)}</div></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <ResourceSection title="Código Analytics" description="Instale este script nas páginas do funil para capturar UTMs e eventos." rows={[[data?.analyticsCode ?? "", "Copiável"]]} headers={["Script", "Tipo"]} />
        <ResourceSection title="Pixels" description="Pixels Meta usados para Conversions API." rows={(data?.pixels ?? []).map((p) => [p.identifier, p.pixelId])} headers={["Identificador", "ID"]} />
        <ResourceSection title="Conversões" description="Gatilhos e eventos configurados." rows={(data?.conversions ?? []).map((c) => [c.identifier, c.triggerType, c.eventType])} headers={["Identificador", "Gatilho", "Evento"]} />
        <ResourceSection title="Webhooks" description="URLs geradas para plataformas de venda." rows={(data?.webhooks ?? []).map((w) => [w.identifier, w.urlGenerated, w.platform])} headers={["Identificador", "URL gerada", "Plataforma"]} />
        <ResourceSection title="Taxas e impostos" description="Regras aplicadas ao cálculo de lucro." rows={(data?.taxes ?? []).map((t) => [t.identifier, t.ruleType === "percentage" ? "Percentual" : "Fixo", String(t.value)])} headers={["Identificador", "Regra", "Valor"]} />
        <ResourceSection title="Produtos" description="Custos de produto recebidos por webhook ou ajustados manualmente." rows={(data?.products ?? []).map((p) => [p.name, brl.format(p.cost)])} headers={["Nome", "Custo"]} />
      </div>
      <div className="mt-4"><Button onClick={() => setUrlModal(true)}><Link2 size={16} /> Gerar URL de anúncio</Button></div>
      {urlModal && <UrlGenerator onClose={() => setUrlModal(false)} />}
    </AppShell>
  );
}

function ResourceSection({ title, description, rows, headers }: { title: string; description: string; rows: any[][]; headers: string[] }) {
  return <Card className="p-5"><div className="flex items-start justify-between gap-4 mb-4"><div><h3 className="font-bold">{title}</h3><p className="text-sm text-slate-500">{description}</p></div><Button variant="secondary">Adicionar</Button></div><Table headers={headers} rows={rows} /></Card>;
}

function UrlGenerator({ onClose }: { onClose: () => void }) {
  const [baseUrl, setBaseUrl] = useState("https://funil.exemplo.com/vsl");
  const generate = trpc.adTracker.generateAdUrl.useMutation();
  return <Modal title="Gerar URL de anúncio" onClose={onClose}><div className="grid gap-3"><input className="rounded-xl border p-3" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} /><Button onClick={() => generate.mutate({ baseUrl, source: "facebook", medium: "cpc", campaign: "campanha_meta", content: "criativo_01", term: "conjunto_01" })}>Gerar URL</Button>{generate.data?.url && <textarea readOnly className="h-28 rounded-xl border p-3" value={generate.data.url} />}</div></Modal>;
}

function PreCheckoutPage() {
  const forms = trpc.adTracker.getPreCheckoutForms.useQuery({ adAccountId: 1 });
  const [editing, setEditing] = useState(false);
  return <AppShell><PageHeader title="Pré-checkout" description="Crie popups JS configuráveis para captura de leads antes do checkout." actions={<Button onClick={() => setEditing(true)}>Novo formulário</Button>} /><Card className="p-5"><Table headers={["Cadastro", "Código", "Identificador"]} rows={(forms.data ?? []).map((f) => [f.createdAt.slice(0, 10), f.codeGenerated, f.identifier])} /></Card>{editing && <PreCheckoutModal onClose={() => setEditing(false)} />}</AppShell>;
}

function PreCheckoutModal({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState({ title: "Receba o acesso gratuito", secondary: "Preencha seus dados para continuar.", bg: "#ffffff", text: "#0d2137", border: "#1a6ef5", radius: 18, button: "Enviar!" });
  return <Modal title="Adicionar/Editar formulário" onClose={onClose}><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-3"><input className="w-full rounded-xl border p-3" placeholder="Identificador" /><input className="w-full rounded-xl border p-3" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} /><textarea className="w-full rounded-xl border p-3" value={config.secondary} onChange={(e) => setConfig({ ...config, secondary: e.target.value })} /><input className="w-full rounded-xl border p-3" placeholder="URL de redirecionamento" /><div className="grid grid-cols-2 gap-2"><input type="color" value={config.bg} onChange={(e) => setConfig({ ...config, bg: e.target.value })} /><input type="color" value={config.text} onChange={(e) => setConfig({ ...config, text: e.target.value })} /></div><Button>Salvar</Button></div><div className="rounded-2xl border bg-slate-100 p-6"><div className="p-5 shadow-xl" style={{ background: config.bg, color: config.text, borderRadius: config.radius, border: `1px solid ${config.border}` }}><h3 className="text-xl font-bold">{config.title}</h3><p className="mt-1 text-sm opacity-80">{config.secondary}</p><input className="mt-4 w-full rounded-lg border p-2" placeholder="Nome" /><input className="mt-2 w-full rounded-lg border p-2" placeholder="E-mail" /><button className="mt-3 w-full rounded-lg bg-[#1a6ef5] p-3 text-white font-bold">{config.button}</button><p className="mt-2 text-center text-xs">Fechar esta janela</p></div></div></div></Modal>;
}

function EventsPage() {
  const events = trpc.adTracker.getEvents.useQuery({ adAccountId: 1 });
  return <AppShell><PageHeader title="Eventos" description="Eventos disparados pelo pixel e status de envio para a Conversions API." actions={<><Button variant="secondary"><RefreshCcw size={16} /> Atualizar</Button><Button><SlidersHorizontal size={16} /> Filtrar</Button></>} /><Card className="p-5"><Table headers={["Data", "ID", "Nome", "Página", "Nome do conteúdo", "Status"]} rows={(events.data ?? []).map((e) => [e.eventTime.slice(0, 16).replace("T", " "), e.eventId, e.eventName, e.pageUrl, e.contentName, badge(e.status)])} /></Card></AppShell>;
}

function SalesPage() {
  const sales = trpc.adTracker.getSales.useQuery({ adAccountId: 1 });
  return <AppShell><PageHeader title="Vendas" description="Transações recebidas por webhook com identificação de origem por UTMs." actions={<><Button variant="secondary"><RefreshCcw size={16} /> Atualizar</Button><Button><SlidersHorizontal size={16} /> Filtrar</Button></>} /><Card className="p-5"><Table headers={["Código", "Data transação", "Cliente", "Valor", "Traqueada", "Status"]} rows={(sales.data ?? []).map((s) => [s.externalCode, s.transactionAt.slice(0, 16).replace("T", " "), s.customerName, brl.format(s.amount), badge(s.tracked ? "Sim" : "Não"), badge(statusLabel(s.status))])} /></Card></AppShell>;
}

function IntegrationsPage() {
  const integrations = trpc.adTracker.getIntegrations.useQuery();
  return <AppShell><PageHeader title="Integrações" description="Contas Meta conectadas via OAuth e disponíveis sem limite de quantidade." actions={<Button><Plug size={16} /> Nova integração</Button>} /><Card className="p-5 mb-4 bg-blue-50 border-blue-100"><p className="text-blue-900">Depois de adicionar novas contas de anúncio, configure pixels, webhooks e conversões na tela Conta de anúncio.</p></Card><Card className="p-5"><Table headers={["Nome", "Plataforma", "ID", "Ações"]} rows={(integrations.data ?? []).map((i) => [i.name, i.platform, i.externalId, "Configurar · Excluir"])} /></Card></AppShell>;
}

function SettingsPage({ tab }: { tab: "account" | "collaborators" | "profiles" }) {
  const settings = trpc.adTracker.getSettings.useQuery();
  const data = settings.data;
  if (tab === "collaborators") return <AppShell><PageHeader title="Colaboradores" description="Gerencie acessos internos e status de colaboradores." actions={<Button>Novo colaborador</Button>} /><Card className="p-5"><Table headers={["Nome", "E-mail", "Perfil", "Último acesso", "Status"]} rows={(data?.collaborators ?? []).map((c) => [c.name, c.email, c.profile, c.lastAccess?.slice(0, 10) ?? "-", badge(c.status)])} /></Card></AppShell>;
  if (tab === "profiles") return <AppShell><PageHeader title="Perfis e permissões" description="Controle permissões por módulo do AdTracker." actions={<Button>Novo perfil</Button>} /><Card className="p-5"><Table headers={["Nome do perfil", "Permissões", "Ações"]} rows={(data?.profiles ?? []).map((p) => [p.name, JSON.stringify(p.permissions), "Editar · Excluir"])} /></Card></AppShell>;
  return <AppShell><PageHeader title="Minha conta" description="Dados pessoais, plano Personal e segurança de acesso." /><div className="grid gap-4 lg:grid-cols-[1fr_340px]"><Card className="p-5"><h3 className="font-bold mb-4">Minha conta</h3><Table headers={["Campo", "Valor"]} rows={Object.entries(data?.myAccount ?? {}).filter(([key]) => !["email", "plan"].includes(key)).map(([k, v]) => [k, String(v)])} /><div className="mt-5 rounded-xl bg-slate-50 p-4"><b>Minha assinatura:</b> Plano Personal, sem billing e sem ciclo de pagamento.</div></Card><Card className="p-5"><div className="mx-auto h-20 w-20 rounded-full bg-[#0d2137] text-white grid place-items-center text-3xl font-bold">R</div><h3 className="mt-3 text-center font-bold">{data?.myAccount.name}</h3><p className="text-center text-sm text-slate-500">{data?.myAccount.email}</p><input className="mt-5 w-full rounded-xl border p-3" placeholder="Novo e-mail" /><input className="mt-2 w-full rounded-xl border p-3" placeholder="Confirmar e-mail" /><input className="mt-2 w-full rounded-xl border p-3" placeholder="Senha" type="password" /><Button variant="secondary">Atualizar e-mail</Button><input className="mt-5 w-full rounded-xl border p-3" placeholder="Senha atual" type="password" /><input className="mt-2 w-full rounded-xl border p-3" placeholder="Nova senha" type="password" /><Button>Atualizar senha</Button></Card></div></AppShell>;
}

function HelpPage() {
  const sections = [
    ["Primeiros passos", "Conecte a conta Meta, instale o script analytics, configure webhooks, gere URLs de anúncio e valide conversões."],
    ["FAQ", "Respostas sobre ROAS, ROI, rastreamento por UTM, webhooks e visitantes online."],
    ["Glossário", "ROAS, ROI, CPM, CPC, CPA, CPT, Margem, Chargeback, Conversão e Venda traqueada."],
    ["Documentação técnica", "Script analytics, parâmetros UTM e formatos de payload para Ticto, Hotmart, Kiwify, Eduzz, Monetizze e Shopify."],
    ["Status do sistema", "Meta API operacional; último sync registrado na conta ativa."],
  ];
  return <AppShell><PageHeader title="Central de ajuda" description="Documentação operacional e técnica para configurar o AdTracker." /><div className="grid gap-4">{sections.map(([title, text]) => <Card key={title} className="p-5"><h3 className="font-bold flex items-center gap-2"><BookOpen size={18} /> {title}</h3><p className="mt-2 text-slate-600">{text}</p></Card>)}</div></AppShell>;
}

function LoginPage() {
  return <div className="min-h-screen grid place-items-center bg-[#0d2137]"><Card className="w-full max-w-md p-8"><h1 className="text-3xl font-bold">AdTracker</h1><p className="mt-2 text-slate-500">Entre para acessar seu sistema pessoal de tracking.</p><input className="mt-6 w-full rounded-xl border p-3" placeholder="E-mail" /><input className="mt-3 w-full rounded-xl border p-3" placeholder="Senha" type="password" /><Link href="/dashboard" className="mt-5 flex items-center justify-center rounded-xl bg-[#1a6ef5] p-3 font-bold text-white">Entrar</Link></Card></div>;
}

function Table({ headers, rows }: { headers: string[]; rows: any[][] }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500">{headers.map((h) => <th key={h} className="py-3 pr-4 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td className="py-5 text-slate-500" colSpan={headers.length}>Nenhum registro encontrado.</td></tr> : rows.map((row, i) => <tr key={i} className="border-b last:border-0">{row.map((cell, j) => <td key={j} className="py-3 pr-4 align-top max-w-[420px] break-words">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function badge(value: string) {
  const text = String(value);
  const positive = ["sent", "Sim", "approved", "Aprovada", "active"].includes(text);
  const danger = ["failed", "Não", "chargeback", "Estornada", "refunded", "Reembolsada", "inactive"].includes(text);
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${positive ? "bg-emerald-50 text-emerald-700" : danger ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{text}</span>;
}

function statusLabel(status: string) {
  return status === "approved" ? "Aprovada" : status === "pending" ? "Pendente" : status === "chargeback" ? "Estornada" : "Reembolsada";
}

function RedirectHome() {
  const [, navigate] = useLocation();
  useMemo(() => navigate("/dashboard"), [navigate]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={RedirectHome} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/resultado-analitico" component={AnalyticsPage} />
      <Route path="/conta-anuncio" component={AccountPage} />
      <Route path="/pre-checkout" component={PreCheckoutPage} />
      <Route path="/eventos" component={EventsPage} />
      <Route path="/vendas" component={SalesPage} />
      <Route path="/integracoes" component={IntegrationsPage} />
      <Route path="/configuracoes/minha-conta">{() => <SettingsPage tab="account" />}</Route>
      <Route path="/configuracoes/colaboradores">{() => <SettingsPage tab="collaborators" />}</Route>
      <Route path="/configuracoes/perfis-permissoes">{() => <SettingsPage tab="profiles" />}</Route>
      <Route path="/central-de-ajuda" component={HelpPage} />
      <Route component={DashboardPage} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
