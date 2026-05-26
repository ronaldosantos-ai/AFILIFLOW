import type { Express } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { adTrackerService } from "../adtracker";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function registerSetupRoutes(app: Express) {
  app.get("/adtracker-analytics.js", (_req, res) => {
    res.type("application/javascript").send(`(function(){
  var script=document.currentScript||document.querySelector('script[data-ad-account-id]');
  var accountId=Number(script&&script.getAttribute('data-ad-account-id')||1);
  function readParams(){var p=new URLSearchParams(location.search);var data={};['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].forEach(function(k){var v=p.get(k); if(v){data[k]=v; try{sessionStorage.setItem('adtracker_'+k,v)}catch(e){}} else {try{data[k]=sessionStorage.getItem('adtracker_'+k)||''}catch(e){}}});return data;}
  function send(eventName, extra){var body=Object.assign({adAccountId:accountId,eventName:eventName,pageUrl:location.href,contentName:document.title,utm:readParams()},extra||{}); try{navigator.sendBeacon&&navigator.sendBeacon('/api/pixel/event',new Blob([JSON.stringify(body)],{type:'application/json'}));}catch(e){fetch('/api/pixel/event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(function(){});} }
  send('PageView');
  window.adTrackerEvent=send;
  document.addEventListener('click',function(ev){var el=ev.target&&ev.target.closest&&ev.target.closest('[data-adtracker-event]'); if(el){send(el.getAttribute('data-adtracker-event')||'Lead',{contentName:el.getAttribute('data-adtracker-content')||document.title});}});
})();`);
  });

  app.get("/adtracker-precheckout.js", (_req, res) => {
    res.type("application/javascript").send(`(function(){
  var script=document.currentScript||document.querySelector('script[data-form-id]');
  var accountId=Number(script&&script.getAttribute('data-ad-account-id')||1);
  if(document.getElementById('adtracker-precheckout')) return;
  var wrap=document.createElement('div');wrap.id='adtracker-precheckout';wrap.style.cssText='position:fixed;inset:0;background:rgba(13,33,55,.55);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Inter,Arial,sans-serif';
  wrap.innerHTML='<form style="width:min(440px,92vw);background:#fff;color:#0d2137;border:1px solid #1a6ef5;border-radius:18px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.24)"><h2 style="margin:0 0 8px;font-size:24px">Receba o acesso gratuito</h2><p style="margin:0 0 18px;color:#526173">Preencha seus dados para continuar.</p><input name="name" placeholder="Nome" required style="width:100%;margin:6px 0;padding:12px;border:1px solid #d8dee8;border-radius:10px"><input name="email" type="email" placeholder="E-mail" required style="width:100%;margin:6px 0;padding:12px;border:1px solid #d8dee8;border-radius:10px"><input name="phone" placeholder="Telefone" style="width:100%;margin:6px 0 14px;padding:12px;border:1px solid #d8dee8;border-radius:10px"><button style="width:100%;padding:13px;border:0;border-radius:10px;background:#1a6ef5;color:#fff;font-weight:700">Enviar!</button><button type="button" data-close style="width:100%;margin-top:10px;background:transparent;border:0;color:#526173">Fechar esta janela</button></form>';
  document.body.appendChild(wrap);wrap.querySelector('[data-close]').onclick=function(){wrap.remove()};wrap.querySelector('form').onsubmit=function(e){e.preventDefault();var fd=new FormData(e.target);fetch('/api/pixel/event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({adAccountId:accountId,eventName:'Lead',pageUrl:location.href,contentName:'Pré-checkout',lead:Object.fromEntries(fd.entries())})}).finally(function(){wrap.remove();});};
})();`);
  });

  app.post("/api/pixel/event", (req, res) => {
    try {
      const event = adTrackerService.registerPixelEvent(req.body);
      res.json({ success: true, event });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/webhook/:platform/:accountId", (req, res) => {
    try {
      const sale = adTrackerService.registerWebhook(req.params.platform, Number(req.params.accountId), req.body);
      res.json({ success: true, sale });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
  // Setup endpoint - executa migração e insere usuários
  app.post("/api/setup", async (req, res) => {
    try {
      // Verificar se já foi feito setup (se existir usuário com loginMethod = 'email')
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.loginMethod, "email"))
        .limit(1);

      if (existingUsers.length > 0) {
        return res.status(400).json({
          error: "Setup já foi realizado",
          message: "O sistema já possui usuários configurados",
        });
      }

      // Inserir usuário 1: Admin
      const passwordHash = hashPassword("Senha123!");

      await db.insert(users).values({
        email: "rsmarketerltda@gmail.com",
        passwordHash,
        name: "Ronaldo Santos",
        loginMethod: "email",
        role: "admin",
        isAuthorized: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: null,
      });

      // Inserir usuário 2: User (precisa de aprovação)
      await db.insert(users).values({
        email: "rsmarketer02@gmail.com",
        passwordHash,
        name: "Usuário 2",
        loginMethod: "email",
        role: "user",
        isAuthorized: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: null,
      });

      res.json({
        success: true,
        message: "Setup realizado com sucesso!",
        users: [
          {
            email: "rsmarketerltda@gmail.com",
            role: "admin",
            isAuthorized: true,
            password: "Senha123!",
          },
          {
            email: "rsmarketer02@gmail.com",
            role: "user",
            isAuthorized: false,
            password: "Senha123!",
          },
        ],
      });
    } catch (error) {
      console.error("[Setup] Error:", error);
      res.status(500).json({
        error: "Setup failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Status endpoint - verifica se setup foi feito
  app.get("/api/setup/status", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const emailUsers = await db
        .select()
        .from(users)
        .where(eq(users.loginMethod, "email"));

      res.json({
        setupDone: emailUsers.length > 0,
        userCount: emailUsers.length,
        users: emailUsers.map((u) => ({
          email: u.email,
          name: u.name,
          role: u.role,
          isAuthorized: u.isAuthorized,
        })),
      });
    } catch (error) {
      console.error("[Setup Status] Error:", error);
      res.status(500).json({
        error: "Status check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
