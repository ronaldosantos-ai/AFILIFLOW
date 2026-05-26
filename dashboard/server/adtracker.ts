import { nanoid } from "nanoid";

export type EventName = "PageView" | "ViewContent" | "AddToCart" | "Lead" | "Purchase" | "InitiateCheckout";
export type SaleStatus = "approved" | "pending" | "chargeback" | "refunded";
export type PaymentMethod = "credit_card" | "boleto" | "pix" | "other";
export type EntityLevel = "campaign" | "adset" | "ad";

export type AdTrackerFilter = {
  adAccountId?: number;
  startDate?: string;
  endDate?: string;
  campaign?: string;
  adset?: string;
  ad?: string;
};

export type AdAccountDTO = {
  id: number;
  name: string;
  platform: "meta";
  externalId: string;
  currency: "BRL";
  isActive: boolean;
  lastSyncAt: string;
};

export type PixelDTO = { id: number; adAccountId: number; identifier: string; pixelId: string; createdAt: string };
export type ConversionDTO = { id: number; adAccountId: number; pixelId?: number; identifier: string; triggerType: string; eventType: EventName; createdAt: string };
export type WebhookDTO = { id: number; adAccountId: number; identifier: string; platform: string; token: string; urlGenerated: string; createdAt: string };
export type TaxDTO = { id: number; adAccountId: number; identifier: string; ruleType: "percentage" | "fixed"; value: number; createdAt: string };
export type ProductDTO = { id: number; adAccountId: number; name: string; cost: number; createdAt: string };

export type SaleDTO = {
  id: number;
  adAccountId: number;
  webhookId?: number;
  externalCode: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  tracked: boolean;
  productName: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  transactionAt: string;
  createdAt: string;
};

export type PixelEventDTO = {
  id: number;
  adAccountId: number;
  pixelId?: number;
  eventId: string;
  eventName: EventName;
  eventTime: string;
  pageUrl: string;
  contentName: string;
  userEmailHash?: string;
  status: "sent" | "failed" | "pending";
  createdAt: string;
};

export type PerformanceRow = {
  id: number;
  externalId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  level: EntityLevel;
  parentName?: string;
  spend: number;
  impressions: number;
  clicks: number;
  approvedSales: number;
  totalTransactions: number;
  netRevenue: number;
  productCosts: number;
  taxes: number;
  chargeback: number;
  profit: number;
  roas: number;
  roi: number;
  margin: number;
  cpa: number;
  cpt: number;
  cpc: number;
  cpm: number;
};

export type PreCheckoutFormDTO = {
  id: number;
  adAccountId: number;
  identifier: string;
  runOn: "all_site" | "specific_url";
  targetUrl?: string;
  windowTitle: string;
  secondaryText: string;
  redirectUrl: string;
  askPhone: boolean;
  layoutConfig: {
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    buttonText: string;
    closeText: string;
  };
  fieldConfig: Record<string, { label: string; instruction: string; parameter: string }>;
  codeGenerated: string;
  createdAt: string;
};

export type CollaboratorDTO = { id: number; name: string; email: string; profile: string; lastAccess?: string; status: "active" | "inactive" };
export type ProfileDTO = { id: number; name: string; permissions: Record<string, unknown>; createdAt: string };

const now = new Date();
const iso = (daysAgo = 0) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
const round = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

const adAccounts: AdAccountDTO[] = [
  { id: 1, name: "Meta Ads — Principal", platform: "meta", externalId: "act_104598230001", currency: "BRL", isActive: true, lastSyncAt: iso(0) },
  { id: 2, name: "Meta Ads — Testes", platform: "meta", externalId: "act_104598230002", currency: "BRL", isActive: true, lastSyncAt: iso(1) },
];

const pixels: PixelDTO[] = [
  { id: 1, adAccountId: 1, identifier: "Pixel principal", pixelId: "742839201938201", createdAt: iso(20) },
  { id: 2, adAccountId: 1, identifier: "Pixel remarketing", pixelId: "742839201938202", createdAt: iso(12) },
];

const conversions: ConversionDTO[] = [
  { id: 1, adAccountId: 1, pixelId: 1, identifier: "PageView páginas do funil", triggerType: "Acessou a página", eventType: "PageView", createdAt: iso(18) },
  { id: 2, adAccountId: 1, pixelId: 1, identifier: "Lead pré-checkout", triggerType: "Clique no botão ou elemento", eventType: "Lead", createdAt: iso(14) },
  { id: 3, adAccountId: 1, pixelId: 1, identifier: "Purchase webhook", triggerType: "Webhook de venda aprovada", eventType: "Purchase", createdAt: iso(7) },
];

const webhooks: WebhookDTO[] = [
  { id: 1, adAccountId: 1, identifier: "Ticto principal", platform: "ticto", token: "wh_ticto_" + nanoid(10), urlGenerated: "/api/webhook/ticto/1", createdAt: iso(10) },
  { id: 2, adAccountId: 1, identifier: "Kiwify backup", platform: "kiwify", token: "wh_kiwify_" + nanoid(10), urlGenerated: "/api/webhook/kiwify/1", createdAt: iso(4) },
];

const products: ProductDTO[] = [
  { id: 1, adAccountId: 1, name: "Método Afiliado Pro", cost: 37, createdAt: iso(15) },
  { id: 2, adAccountId: 1, name: "Mentoria Tráfego Express", cost: 120, createdAt: iso(11) },
];

const taxes: TaxDTO[] = [
  { id: 1, adAccountId: 1, identifier: "Gateway + plataforma", ruleType: "percentage", value: 8.9, createdAt: iso(11) },
  { id: 2, adAccountId: 1, identifier: "Taxa fixa transação", ruleType: "fixed", value: 2.49, createdAt: iso(11) },
];

const campaigns: PerformanceRow[] = [
  baseRow(1, "cmp_1001", "[CBO] Produto A — Conversão", "campaign", 12348.55, 382910, 8450, "ACTIVE"),
  baseRow(2, "cmp_1002", "[ABO] Remarketing 7D", "campaign", 2980.12, 102240, 2090, "ACTIVE"),
  baseRow(3, "cmp_1003", "Teste Criativos — Leads", "campaign", 1850.4, 78500, 1920, "PAUSED"),
];

const adsets: PerformanceRow[] = [
  baseRow(11, "set_2001", "Interesses — Marketing Digital", "adset", 5620.9, 182000, 4110, "ACTIVE", "[CBO] Produto A — Conversão"),
  baseRow(12, "set_2002", "Lookalike compradores 2%", "adset", 6727.65, 200910, 4340, "ACTIVE", "[CBO] Produto A — Conversão"),
  baseRow(13, "set_2003", "Visitantes 7 dias", "adset", 2980.12, 102240, 2090, "ACTIVE", "[ABO] Remarketing 7D"),
];

const ads: PerformanceRow[] = [
  baseRow(21, "ad_3001", "Criativo VSL — Dor forte", "ad", 3420.88, 98000, 2290, "ACTIVE", "Interesses — Marketing Digital"),
  baseRow(22, "ad_3002", "Criativo Depoimento — Print", "ad", 2199.99, 84000, 1820, "ACTIVE", "Interesses — Marketing Digital"),
  baseRow(23, "ad_3003", "Criativo Oferta — Últimas vagas", "ad", 6727.65, 200910, 4340, "PAUSED", "Lookalike compradores 2%"),
  baseRow(24, "ad_3004", "Remarketing Checkout", "ad", 2980.12, 102240, 2090, "ACTIVE", "Visitantes 7 dias"),
];

function baseRow(id: number, externalId: string, name: string, level: EntityLevel, spend: number, impressions: number, clicks: number, status: PerformanceRow["status"], parentName?: string): PerformanceRow {
  return {
    id,
    externalId,
    name,
    level,
    parentName,
    status,
    spend,
    impressions,
    clicks,
    approvedSales: 0,
    totalTransactions: 0,
    netRevenue: 0,
    productCosts: 0,
    taxes: 0,
    chargeback: 0,
    profit: 0,
    roas: 0,
    roi: 0,
    margin: 0,
    cpa: 0,
    cpt: 0,
    cpc: round(safeDiv(spend, clicks)),
    cpm: round(safeDiv(spend, impressions) * 1000),
  };
}

const sales: SaleDTO[] = Array.from({ length: 28 }).map((_, i) => {
  const approved = i % 7 !== 0;
  const pending = i % 9 === 0;
  const refunded = i % 13 === 0;
  const amount = i % 5 === 0 ? 997 : i % 4 === 0 ? 497 : 197;
  const campaign = i % 3 === 0 ? campaigns[0].name : i % 3 === 1 ? campaigns[1].name : campaigns[2].name;
  return {
    id: i + 1,
    adAccountId: 1,
    webhookId: 1,
    externalCode: `TRX-${String(9000 + i)}`,
    customerName: ["Ana Lima", "Carlos Souza", "Marina Alves", "João Pedro", "Patrícia Rocha"][i % 5],
    customerEmail: `cliente${i + 1}@exemplo.com`,
    amount,
    paymentMethod: (["credit_card", "pix", "boleto", "other"] as PaymentMethod[])[i % 4],
    status: refunded ? "refunded" : pending ? "pending" : approved ? "approved" : "chargeback",
    tracked: i % 6 !== 0,
    productName: i % 4 === 0 ? "Mentoria Tráfego Express" : "Método Afiliado Pro",
    utmSource: "facebook",
    utmMedium: "cpc",
    utmCampaign: campaign,
    utmContent: i % 2 === 0 ? ads[0].name : ads[1].name,
    utmTerm: i % 2 === 0 ? adsets[0].name : adsets[1].name,
    fbclid: `fbclid_${nanoid(8)}`,
    transactionAt: iso(i % 14),
    createdAt: iso(i % 14),
  } satisfies SaleDTO;
});

const pixelEvents: PixelEventDTO[] = Array.from({ length: 42 }).map((_, i) => ({
  id: i + 1,
  adAccountId: 1,
  pixelId: 1,
  eventId: `evt_${nanoid(12)}`,
  eventName: (["PageView", "ViewContent", "AddToCart", "Lead", "InitiateCheckout", "Purchase"] as EventName[])[i % 6],
  eventTime: iso(i % 21),
  pageUrl: [`https://funil.exemplo.com/`, `https://funil.exemplo.com/vsl`, `https://checkout.exemplo.com/oferta`][i % 3],
  contentName: i % 3 === 0 ? "Landing Page" : i % 3 === 1 ? "VSL Produto" : "Checkout",
  status: i % 10 === 0 ? "failed" : i % 4 === 0 ? "pending" : "sent",
  createdAt: iso(i % 21),
}));

const preCheckoutForms: PreCheckoutFormDTO[] = [
  createForm(1, "Popup Lead — Funil Principal", "Receba o acesso gratuito", "Preencha seus dados para continuar para a oferta."),
];

const collaborators: CollaboratorDTO[] = [
  { id: 1, name: "Ronaldo Santos", email: "rsmarketerltda@gmail.com", profile: "Owner", lastAccess: iso(0), status: "active" },
  { id: 2, name: "Assistente de mídia", email: "midia@exemplo.com", profile: "Analista", lastAccess: iso(3), status: "active" },
];

const profiles: ProfileDTO[] = [
  { id: 1, name: "Owner", permissions: { all: true }, createdAt: iso(30) },
  { id: 2, name: "Analista", permissions: { dashboard: ["view"], analytics: ["view"], integrations: ["view"] }, createdAt: iso(20) },
];

function createForm(id: number, identifier: string, windowTitle: string, secondaryText: string): PreCheckoutFormDTO {
  const form: PreCheckoutFormDTO = {
    id,
    adAccountId: 1,
    identifier,
    runOn: "all_site",
    windowTitle,
    secondaryText,
    redirectUrl: "https://checkout.exemplo.com/oferta",
    askPhone: true,
    layoutConfig: {
      backgroundColor: "#ffffff",
      textColor: "#0d2137",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#1a6ef5",
      buttonText: "Enviar!",
      closeText: "Fechar esta janela",
    },
    fieldConfig: {
      name: { label: "Nome", instruction: "Digite seu primeiro nome", parameter: "name" },
      email: { label: "E-mail", instruction: "Digite seu melhor e-mail", parameter: "email" },
      phone: { label: "Telefone", instruction: "(99) 99999-9999", parameter: "phone" },
    },
    codeGenerated: "",
    createdAt: iso(9),
  };
  form.codeGenerated = generatePreCheckoutEmbed(form);
  return form;
}

function filterByDate<T extends { transactionAt?: string; eventTime?: string; createdAt: string }>(items: T[], filters?: AdTrackerFilter) {
  if (!filters?.startDate && !filters?.endDate) return items;
  const start = filters.startDate ? new Date(filters.startDate).getTime() : 0;
  const end = filters.endDate ? new Date(filters.endDate).getTime() + 24 * 60 * 60 * 1000 : Number.MAX_SAFE_INTEGER;
  return items.filter((item) => {
    const raw = item.transactionAt ?? item.eventTime ?? item.createdAt;
    const time = new Date(raw).getTime();
    return time >= start && time <= end;
  });
}

function taxForSale(sale: SaleDTO) {
  return taxes
    .filter((tax) => tax.adAccountId === sale.adAccountId)
    .reduce((sum, tax) => sum + (tax.ruleType === "percentage" ? sale.amount * (tax.value / 100) : tax.value), 0);
}

function productCostForSale(sale: SaleDTO) {
  return products.find((product) => product.adAccountId === sale.adAccountId && product.name === sale.productName)?.cost ?? 0;
}

function enrichRow(row: PerformanceRow, relevantSales: SaleDTO[]) {
  const approved = relevantSales.filter((sale) => sale.status === "approved");
  const chargebacks = relevantSales.filter((sale) => sale.status === "chargeback" || sale.status === "refunded");
  const netRevenue = approved.reduce((sum, sale) => sum + sale.amount, 0);
  const productCosts = approved.reduce((sum, sale) => sum + productCostForSale(sale), 0);
  const taxTotal = approved.reduce((sum, sale) => sum + taxForSale(sale), 0);
  const chargeback = chargebacks.reduce((sum, sale) => sum + sale.amount, 0);
  const profit = netRevenue - row.spend - productCosts - taxTotal;
  return {
    ...row,
    approvedSales: approved.length,
    totalTransactions: relevantSales.length,
    netRevenue: round(netRevenue),
    productCosts: round(productCosts),
    taxes: round(taxTotal),
    chargeback: round(chargeback),
    profit: round(profit),
    roas: round(safeDiv(netRevenue, row.spend)),
    roi: round(safeDiv(profit, row.spend) * 100),
    margin: round(safeDiv(profit, netRevenue) * 100),
    cpa: round(safeDiv(row.spend, approved.length)),
    cpt: round(safeDiv(row.spend, relevantSales.length)),
    cpc: round(safeDiv(row.spend, row.clicks)),
    cpm: round(safeDiv(row.spend, row.impressions) * 1000),
  } satisfies PerformanceRow;
}

function salesForRow(row: PerformanceRow, filters?: AdTrackerFilter) {
  const dated = filterByDate(sales, filters).filter((sale) => sale.adAccountId === (filters?.adAccountId ?? 1));
  return dated.filter((sale) => {
    if (row.level === "campaign") return sale.utmCampaign === row.name;
    if (row.level === "adset") return sale.utmTerm === row.name;
    return sale.utmContent === row.name;
  });
}

function textMatches(value: string | undefined, query: string | undefined) {
  return !query || (value ?? "").toLowerCase().includes(query.toLowerCase());
}

function filterRows(rows: PerformanceRow[], filters?: AdTrackerFilter) {
  return rows
    .filter((row) => textMatches(row.level === "campaign" ? row.name : row.parentName, filters?.campaign))
    .filter((row) => textMatches(row.level === "adset" ? row.name : row.parentName, filters?.adset))
    .filter((row) => textMatches(row.level === "ad" ? row.name : undefined, filters?.ad))
    .map((row) => enrichRow(row, salesForRow(row, filters)));
}

export const adTrackerService = {
  getAdAccounts() {
    return adAccounts;
  },
  getActiveAccount(adAccountId?: number) {
    return adAccounts.find((account) => account.id === adAccountId) ?? adAccounts[0];
  },
  getDashboard(filters?: AdTrackerFilter) {
    const adAccountId = filters?.adAccountId ?? 1;
    const accountSales = filterByDate(sales, filters).filter((sale) => sale.adAccountId === adAccountId);
    const approved = accountSales.filter((sale) => sale.status === "approved");
    const pending = accountSales.filter((sale) => sale.status === "pending");
    const chargebacks = accountSales.filter((sale) => sale.status === "chargeback" || sale.status === "refunded");
    const enrichedCampaigns = filterRows(campaigns, filters);
    const spend = enrichedCampaigns.reduce((sum, row) => sum + row.spend, 0);
    const netRevenue = approved.reduce((sum, sale) => sum + sale.amount, 0);
    const productCosts = approved.reduce((sum, sale) => sum + productCostForSale(sale), 0);
    const taxTotal = approved.reduce((sum, sale) => sum + taxForSale(sale), 0);
    const chargeback = chargebacks.reduce((sum, sale) => sum + sale.amount, 0);
    const profit = netRevenue - spend - productCosts - taxTotal;
    const byDay = Array.from({ length: 14 }).map((_, index) => {
      const date = new Date(now.getTime() - (13 - index) * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0, 10);
      const daySales = approved.filter((sale) => sale.transactionAt.slice(0, 10) === key);
      return { date: key, vendas: daySales.length, valor: round(daySales.reduce((sum, sale) => sum + sale.amount, 0)) };
    });
    const paymentBreakdown = (["credit_card", "boleto", "pix", "other"] as PaymentMethod[]).map((method) => {
      const methodSales = approved.filter((sale) => sale.paymentMethod === method);
      return { method, count: methodSales.length, amount: round(methodSales.reduce((sum, sale) => sum + sale.amount, 0)) };
    });
    const pageVisits = pixelEvents.reduce<Record<string, number>>((acc, event) => {
      acc[event.pageUrl] = (acc[event.pageUrl] ?? 0) + 1;
      return acc;
    }, {});
    return {
      account: this.getActiveAccount(adAccountId),
      kpis: {
        netRevenue: round(netRevenue),
        adSpend: round(spend),
        profit: round(profit),
        productCosts: round(productCosts),
        taxes: round(taxTotal),
        chargeback: round(chargeback),
        roas: round(safeDiv(netRevenue, spend)),
        roi: round(safeDiv(profit, spend) * 100),
        margin: round(safeDiv(profit, netRevenue) * 100),
      },
      conversions: { total: round(netRevenue), salesCount: approved.length, series: byDay },
      secondary: {
        pending: { amount: round(pending.reduce((sum, sale) => sum + sale.amount, 0)), count: pending.length },
        refunds: { amount: round(chargeback), count: chargebacks.length },
      },
      paymentBreakdown,
      realtime: {
        onlineNow: 17,
        perMinute: 4,
        topPages: Object.entries(pageVisits).map(([page, visits]) => ({ page, visits })).sort((a, b) => b.visits - a.visits).slice(0, 5),
      },
    };
  },
  getAnalytics(level: EntityLevel, filters?: AdTrackerFilter) {
    const source = level === "campaign" ? campaigns : level === "adset" ? adsets : ads;
    return filterRows(source, filters);
  },
  updateEntityStatus(level: EntityLevel, id: number, status: PerformanceRow["status"]) {
    const source = level === "campaign" ? campaigns : level === "adset" ? adsets : ads;
    const row = source.find((item) => item.id === id);
    if (row) row.status = status;
    return row ?? null;
  },
  updateBudget(level: EntityLevel, id: number, budget: number) {
    const row = this.updateEntityStatus(level, id, (level === "ad" ? ads : level === "adset" ? adsets : campaigns).find((item) => item.id === id)?.status ?? "ACTIVE");
    return { ...row, dailyBudget: budget };
  },
  duplicateEntity(level: EntityLevel, id: number) {
    const source = level === "campaign" ? campaigns : level === "adset" ? adsets : ads;
    const original = source.find((item) => item.id === id);
    if (!original) return null;
    const copy = { ...original, id: Math.max(...source.map((item) => item.id)) + 1, externalId: `${original.externalId}_copy`, name: `${original.name} — cópia`, status: "PAUSED" as const };
    source.push(copy);
    return copy;
  },
  getAccountResources(adAccountId = 1) {
    return {
      account: this.getActiveAccount(adAccountId),
      pixels: pixels.filter((item) => item.adAccountId === adAccountId),
      conversions: conversions.filter((item) => item.adAccountId === adAccountId),
      webhooks: webhooks.filter((item) => item.adAccountId === adAccountId),
      taxes: taxes.filter((item) => item.adAccountId === adAccountId),
      products: products.filter((item) => item.adAccountId === adAccountId),
      analyticsCode: generateAnalyticsScript(adAccountId),
    };
  },
  addPixel(input: { adAccountId: number; identifier: string; pixelId: string }) {
    const pixel = { id: nextId(pixels), createdAt: new Date().toISOString(), ...input };
    pixels.push(pixel);
    return pixel;
  },
  removePixel(id: number) {
    const index = pixels.findIndex((pixel) => pixel.id === id);
    if (index >= 0) pixels.splice(index, 1);
    return { success: index >= 0 };
  },
  addWebhook(input: { adAccountId: number; identifier: string; platform: string }) {
    const hook = { id: nextId(webhooks), token: `wh_${input.platform}_${nanoid(10)}`, urlGenerated: `/api/webhook/${input.platform}/${input.adAccountId}`, createdAt: new Date().toISOString(), ...input };
    webhooks.push(hook);
    return hook;
  },
  getPreCheckoutForms(adAccountId = 1) {
    return preCheckoutForms.filter((form) => form.adAccountId === adAccountId);
  },
  savePreCheckoutForm(input: Partial<PreCheckoutFormDTO> & { adAccountId: number; identifier: string }) {
    const existing = input.id ? preCheckoutForms.find((form) => form.id === input.id) : undefined;
    if (existing) {
      Object.assign(existing, input);
      existing.codeGenerated = generatePreCheckoutEmbed(existing);
      return existing;
    }
    const form = createForm(nextId(preCheckoutForms), input.identifier, input.windowTitle ?? "Antes de continuar", input.secondaryText ?? "Informe seus dados para avançar.");
    Object.assign(form, input);
    form.codeGenerated = generatePreCheckoutEmbed(form);
    preCheckoutForms.push(form);
    return form;
  },
  getEvents(filters?: AdTrackerFilter) {
    return filterByDate(pixelEvents, filters).filter((event) => event.adAccountId === (filters?.adAccountId ?? 1));
  },
  getSales(filters?: AdTrackerFilter) {
    return filterByDate(sales, filters).filter((sale) => sale.adAccountId === (filters?.adAccountId ?? 1));
  },
  getIntegrations() {
    return adAccounts.map((account) => ({ id: account.id, name: account.name, platform: "Meta Ads", externalId: account.externalId, isActive: account.isActive }));
  },
  getSettings() {
    return {
      myAccount: {
        createdAt: iso(60),
        userCode: "USR-RONALDO-001",
        type: "Pessoa física",
        cpf: "000.000.000-00",
        name: "Ronaldo Santos",
        phone: "(11) 99999-9999",
        email: "rsmarketerltda@gmail.com",
        plan: "Personal",
        adAccountsConnected: adAccounts.length,
      },
      collaborators,
      profiles,
    };
  },
  registerPixelEvent(input: Partial<PixelEventDTO> & { adAccountId: number; eventName: EventName; pageUrl?: string }) {
    const event: PixelEventDTO = {
      id: nextId(pixelEvents),
      pixelId: input.pixelId,
      eventId: input.eventId ?? `evt_${nanoid(12)}`,
      contentName: input.contentName ?? documentTitleFromUrl(input.pageUrl),
      userEmailHash: input.userEmailHash,
      status: "pending",
      eventTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      pageUrl: input.pageUrl ?? "",
      adAccountId: input.adAccountId,
      eventName: input.eventName,
    };
    pixelEvents.unshift(event);
    return event;
  },
  registerWebhook(platform: string, adAccountId: number, payload: any) {
    const sale = mapWebhookPayload(platform, adAccountId, payload);
    sales.unshift(sale);
    return sale;
  },
  generateAdUrl(input: { baseUrl: string; source: string; medium: string; campaign: string; content?: string; term?: string }) {
    const url = new URL(input.baseUrl);
    url.searchParams.set("utm_source", input.source);
    url.searchParams.set("utm_medium", input.medium);
    url.searchParams.set("utm_campaign", input.campaign);
    if (input.content) url.searchParams.set("utm_content", input.content);
    if (input.term) url.searchParams.set("utm_term", input.term);
    return url.toString();
  },
};

function nextId(items: Array<{ id: number }>) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function documentTitleFromUrl(url?: string) {
  if (!url) return "Página não identificada";
  try {
    const parsed = new URL(url);
    return parsed.pathname === "/" ? parsed.hostname : parsed.pathname.replaceAll("/", " ").trim();
  } catch {
    return url;
  }
}

function mapWebhookPayload(platform: string, adAccountId: number, payload: any): SaleDTO {
  const customer = payload.customer ?? payload.buyer ?? payload.client ?? {};
  const amount = Number(payload.amount ?? payload.net_value ?? payload.total_price ?? payload.price?.value ?? 0);
  const statusRaw = String(payload.status ?? payload.order_status ?? payload.financial_status ?? "approved").toLowerCase();
  const status: SaleStatus = statusRaw.includes("pend") ? "pending" : statusRaw.includes("refund") || statusRaw.includes("reemb") ? "refunded" : statusRaw.includes("charge") ? "chargeback" : "approved";
  return {
    id: nextId(sales),
    adAccountId,
    webhookId: webhooks.find((hook) => hook.adAccountId === adAccountId && hook.platform === platform)?.id,
    externalCode: String(payload.order_id ?? payload.id ?? payload.tid ?? payload.purchase?.code ?? `WH-${nanoid(8)}`),
    customerName: String(customer.name ?? payload.customer_name ?? payload.client_name ?? "Cliente"),
    customerEmail: String(customer.email ?? payload.customer_email ?? payload.client_email ?? ""),
    amount,
    paymentMethod: normalizePayment(payload.payment_method),
    status,
    tracked: Boolean(payload.utm_campaign ?? payload.utm?.campaign ?? payload.utm_params?.utm_campaign),
    productName: String(payload.product_name ?? payload.product?.name ?? "Produto via webhook"),
    utmSource: payload.utm_source ?? payload.utm?.source ?? payload.utm_params?.utm_source,
    utmMedium: payload.utm_medium ?? payload.utm?.medium ?? payload.utm_params?.utm_medium,
    utmCampaign: payload.utm_campaign ?? payload.utm?.campaign ?? payload.utm_params?.utm_campaign,
    utmContent: payload.utm_content ?? payload.utm?.content ?? payload.utm_params?.utm_content,
    utmTerm: payload.utm_term ?? payload.utm?.term ?? payload.utm_params?.utm_term,
    fbclid: payload.fbclid,
    transactionAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizePayment(value: unknown): PaymentMethod {
  const raw = String(value ?? "other").toLowerCase();
  if (raw.includes("pix")) return "pix";
  if (raw.includes("boleto")) return "boleto";
  if (raw.includes("card") || raw.includes("cart")) return "credit_card";
  return "other";
}

function generateAnalyticsScript(adAccountId: number) {
  return `<script async src="${"/adtracker-analytics.js"}" data-ad-account-id="${adAccountId}"></script>`;
}

function generatePreCheckoutEmbed(form: PreCheckoutFormDTO) {
  return `<script async src="/adtracker-precheckout.js" data-form-id="${form.id}" data-ad-account-id="${form.adAccountId}"></script>`;
}
