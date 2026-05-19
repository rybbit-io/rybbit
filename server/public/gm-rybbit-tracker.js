/*
 * GM Rybbit Tracker - versão nativa para Rybbit
 * - Não usa endpoints PixelX: api_event, api_lead, api_geo.
 * - Não grava direto no ClickHouse.
 * - Usa window.rybbit.pageview/event/identify/setTraits/trackOutbound.
 * - Fallback opcional para o backend HTTP do Rybbit: POST /api/track sem expor API key.
 */
(function () {
  'use strict';

  class GMRybbitTracker {
    #config = {};
    #lead = {};
    #params = {};
    #videoPlayers = new Map();
    #leadIdentifyTimeout = null;
    #readyPromise = null;
    #leadEventDedupe = new Map();

    async init(config = {}) {
      const defaults = {
        domain: location.hostname,
        rybbit_host: location.origin,
        site_id: '',
        wait_timeout: 8000,
        form_selector: 'form, .gmt_monitor_form, .gmr_monitor_form, .pxa_monitor_form, #pxa_monitor_form',
        form_auto_fill: true,
        phone_valid: true,
        phone_country: '55',
        phone_update: false,
        send_pii_traits: true,
        send_document_trait: false,
        auto_track_forms: true,
        auto_track_whatsapp: true,
        auto_track_buttons: true,
        auto_propagate_params: true,
        track_initial_pageview: false, // deixe false se o Rybbit já rastreia pageview automático
        use_http_api_fallback: true,   // fallback para /api/track se window.rybbit não carregar
        debug: false,
        lead_event_name: 'Lead',
        form_submit_event_name: 'FormSubmit',
        send_form_submit_event: true,
        identify_with_name_only: false,
        identify_on_input: true,
        input_custom_phone: '',
        input_custom_mail: '',
        input_custom_name: '',
        input_custom_doc: '',
      };

      this.#config = { ...defaults, ...config };

      if (this.#config.domain && !location.hostname.includes(this.#config.domain.replace(/^\./, ''))) {
        this.#log('warn', 'Domínio fora do escopo:', this.#config.domain, location.hostname);
        return;
      }

      this.#loadParams();
      this.#loadLead();
      this.#saveParams();
      this.#saveLead();

      await this.#waitForRybbit();

      if (this.#config.track_initial_pageview) {
        await this.pageview();
      }

      await this.identifyLead();

      if (this.#config.auto_track_forms) {
        this.monitorLeadFields(document);
        this.monitorForms(this.#config.form_selector);
        setInterval(() => {
          this.monitorLeadFields(document);
          this.monitorForms(this.#config.form_selector);
        }, 5000);
        this.monitorFormsDynamic(this.#config.form_selector);
        document.addEventListener('elementor/popup/show', () => this.monitorForms(this.#config.form_selector));
      }

      if (this.#config.auto_track_whatsapp || this.#config.auto_track_buttons) {
        this.monitorClicks();
      }

      if (this.#config.auto_propagate_params) {
        this.propagateParams(false);
      }

      this.applyShortcodes();

      if (this.#param('gmr-test') === 'true' || this.#param('gmt-test') === 'true') {
        alert('[GM Rybbit Tracker] Rastreamento ativo.');
      }

      this.#log('info', 'Ativo', {
        host: this.#config.rybbit_host,
        site_id: this.#config.site_id,
        user_id: window.rybbit?.getUserId?.() || null,
      });
    }

    // ─────────────────────────────────────────────
    // Utilitários
    // ─────────────────────────────────────────────

    #log(type, ...args) {
      if (!this.#config.debug && type !== 'warn' && type !== 'error') return;
      const fn = console[type] || console.log;
      fn.call(console, '[GM Rybbit Tracker]', ...args);
    }

    #timestamp() {
      return Date.now();
    }

    #uuid() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    }

    #decodeUri(value) {
      if (!value || typeof value !== 'string') return value;
      if (!/%[0-9A-Fa-f]{2}/.test(value)) return value;
      try { return decodeURIComponent(value); } catch { return value; }
    }

    #get(key) {
      for (const cookie of document.cookie.split(';')) {
        const [k, ...rest] = cookie.trim().split('=');
        if (k === key) return this.#decodeUri(rest.join('='));
      }
      return this.#decodeUri(localStorage.getItem(key));
    }

    #set(values) {
      const expires = new Date(Date.now() + 15552000 * 1000).toUTCString(); // 180 dias
      const cookieDomain = this.#cookieDomain();
      const secure = location.protocol === 'https:' ? '; Secure' : '';

      for (const [key, raw] of Object.entries(values || {})) {
        if (raw === null || raw === undefined || raw === '' || raw === 'undefined') continue;
        const value = String(raw);
        const domainPart = cookieDomain ? `; domain=${cookieDomain}` : '';
        document.cookie = `${key}=${encodeURIComponent(value)}; SameSite=Lax${secure}; expires=${expires}; path=/${domainPart}`;
        try { localStorage.setItem(key, value); } catch {}
      }

      if (Object.keys(values || {}).length) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(values);
      }
    }

    #cookieDomain() {
      const domain = String(this.#config.domain || '').trim();
      if (!domain || domain === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) return '';
      return domain.startsWith('.') ? domain : `.${domain}`;
    }

    #param(...keys) {
      const url = new URLSearchParams(window.location.search);
      for (const k of keys) {
        if (url.has(k)) return this.#decodeUri(url.get(k));
      }
      for (const k of keys) {
        const v = this.#get(k);
        if (v) return v;
      }
      return '';
    }

    #removeAccents(value) {
      const norm = t => typeof t === 'string'
        ? t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        : t;
      if (value == null || typeof value !== 'object') return norm(value);
      if (Array.isArray(value)) return value.map(v => this.#removeAccents(v));
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [norm(k), this.#removeAccents(v)]));
    }

    #buildFbc(raw) {
      if (!raw || raw === 'undefined') return '';
      const clean = String(raw)
        .replace(/__DOT__/g, '.')
        .replace(/_DOT_/g, '.')
        .replace(/_DOT/g, '.')
        .replace(/DOT_/g, '.')
        .replace(/DOT/g, '.')
        .replace(/\.{2,}/g, '.');

      const full = clean.match(/^fb\.1\.(\d+)\.([A-Za-z0-9_-]+)$/);
      if (full) return clean;

      const parts = clean.split('.').filter(Boolean);
      const hash = parts.length ? parts[parts.length - 1] : clean;
      if (!hash || hash.length < 8) return '';
      return `fb.1.${this.#timestamp()}.${hash}`;
    }

    #normalizePhone(phone, country = '55') {
      let d = String(phone || '').replace(/\D/g, '').replace(/^0+/, '');
      if (!d) return '';
      if (country === '55') {
        if (d.length === 10) d = `55${d.slice(0, 2)}9${d.slice(2)}`;
        else if (d.length === 12 && d.startsWith('55')) d = `55${d.slice(0, 4)}9${d.slice(4)}`;
      }
      return `+${d.startsWith(country) ? d : country + d}`;
    }

    #formatPhoneBR(phone) {
      if (!phone) return '';
      let d = String(phone).replace(/\D/g, '');
      if (d.startsWith('55')) d = d.slice(2);
      if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
      if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return phone;
    }

    #fieldMeta(field) {
      const labelByFor = field.id
        ? document.querySelector(`label[for="${CSS.escape(field.id)}"]`)?.textContent
        : '';
      const closestLabel = field.closest?.('label')?.textContent || '';
      const parentText = field.parentElement?.textContent || '';

      return [
        field.name,
        field.id,
        field.type,
        field.placeholder,
        field.getAttribute('aria-label'),
        field.getAttribute('autocomplete'),
        field.dataset?.field,
        field.dataset?.name,
        field.dataset?.type,
        labelByFor,
        closestLabel,
        parentText,
      ].filter(Boolean).join(' ').toLowerCase().slice(0, 600);
    }

    #isType(meta, type) {
      const keywords = {
        phone: ['tel', 'telefone', 'phone', 'ph', 'cel', 'celular', 'mobile', 'fone', 'whats', 'whatsapp'],
        mail: ['mail', 'email', 'e-mail', 'em'],
        name: ['nome', 'nombre', 'name', 'full_name', 'fullname', 'first_name', 'last_name', 'fname', 'lname', 'nm'],
        doc: ['document', 'documento', 'doc', 'cpf', 'cnpj'],
      };
      const custom = String(this.#config[`input_custom_${type}`] || '')
        .split(',')
        .map(v => v.trim().toLowerCase())
        .filter(Boolean);
      return [...(keywords[type] || []), ...custom].some(k => meta.includes(k));
    }

    #sanitizeProps(props = {}) {
      const clean = {};
      const source = this.#removeAccents(props);

      for (const [key, value] of Object.entries(source)) {
        if (value === null || value === undefined || value === '') continue;

        if (typeof value === 'string') clean[key] = value.slice(0, 300);
        else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value;
        else if (typeof value === 'boolean') clean[key] = value ? 'true' : 'false';
        else if (Array.isArray(value)) clean[key] = value.map(v => String(v)).join(',').slice(0, 300);
        else clean[key] = JSON.stringify(value).slice(0, 300);
      }

      let json = JSON.stringify(clean);
      if (json.length <= 1800) return clean;

      const reduced = {};
      for (const [key, value] of Object.entries(clean)) {
        reduced[key] = value;
        json = JSON.stringify(reduced);
        if (json.length > 1800) {
          delete reduced[key];
          break;
        }
      }
      return reduced;
    }

    #commonProps(extra = {}) {
      return this.#sanitizeProps({
        event_id: extra.event_id || this.#uuid(),
        page_title: document.title,
        pathname: location.pathname,
        hostname: location.hostname,
        referrer: document.referrer,
        utm_source: this.#params.utm_source,
        utm_medium: this.#params.utm_medium,
        utm_campaign: this.#params.utm_campaign,
        utm_id: this.#params.utm_id,
        utm_term: this.#params.utm_term,
        utm_content: this.#params.utm_content,
        src: this.#params.src,
        sck: this.#params.sck || this.#lead.id,
        gclid: this.#params.gclid,
        gbraid: this.#params.gbraid,
        wbraid: this.#params.wbraid,
        fbc: this.#params.fbc,
        fbp: this.#params.fbp,
        ...extra,
      });
    }

    // ─────────────────────────────────────────────
    // Parâmetros, lead e identificação
    // ─────────────────────────────────────────────

    #loadParams() {
      this.#params = {
        utm_source: this.#param('utm_source'),
        utm_medium: this.#param('utm_medium'),
        utm_campaign: this.#param('utm_campaign'),
        utm_id: this.#param('utm_id'),
        utm_term: this.#param('utm_term'),
        utm_content: this.#param('utm_content'),
        src: this.#param('src'),
        sck: this.#param('sck'),
        gclid: this.#param('_gclid', 'gclid'),
        gbraid: this.#param('gbraid'),
        wbraid: this.#param('wbraid'),
        fbc: this.#buildFbc(this.#param('_fbc', 'fbclid')),
        fbp: this.#param('_fbp', 'fbp') || `fb.1.${this.#timestamp()}.${this.#randomInt()}`,
      };
    }

    #randomInt(min = 1e9, max = 9999999999) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    #saveParams() {
      this.#set({
        utm_source: this.#params.utm_source,
        utm_medium: this.#params.utm_medium,
        utm_campaign: this.#params.utm_campaign,
        utm_id: this.#params.utm_id,
        utm_term: this.#params.utm_term,
        utm_content: this.#params.utm_content,
        src: this.#params.src,
        sck: this.#params.sck,
        gclid: this.#params.gclid,
        gbraid: this.#params.gbraid,
        wbraid: this.#params.wbraid,
        _fbc: this.#params.fbc,
        _fbp: this.#params.fbp,
      });
    }

    #loadLead() {
      this.#lead = {
        id: this.#param('lead_id', 'external_id') || this.#get('gmr_lead_id') || '',
        name: this.#param('full_name', 'lead_name', 'name') || this.#get('gmr_lead_name') || '',
        fname: this.#param('fname', 'first_name') || this.#get('gmr_lead_fname') || '',
        lname: this.#param('lname', 'last_name') || this.#get('gmr_lead_lname') || '',
        email: this.#param('email', 'lead_email') || this.#get('gmr_lead_email') || '',
        phone: this.#param('phone', 'tel', 'whatsapp') || this.#get('gmr_lead_phone') || '',
        doc: this.#param('document', 'doc', 'cpf') || this.#get('gmr_lead_doc') || '',
      };
    }

    #saveLead() {
      this.#set({
        gmr_lead_id: this.#lead.id,
        gmr_lead_name: this.#lead.name,
        gmr_lead_fname: this.#lead.fname,
        gmr_lead_lname: this.#lead.lname,
        gmr_lead_email: this.#lead.email,
        gmr_lead_phone: this.#lead.phone,
        gmr_lead_doc: this.#lead.doc,
      });
    }

    #getFullName() {
      if (this.#lead.name) return this.#lead.name;
      if (this.#lead.fname || this.#lead.lname) return `${this.#lead.fname || ''} ${this.#lead.lname || ''}`.trim();
      return '';
    }

    #ensureLeadId() {
      const stable = this.#stableLeadId();

      // Se já existe um ID vindo de URL/checkout/CRM, preserva.
      // Se ainda não existe, usa um ID estável baseado em email/telefone quando disponível.
      if (!this.#lead.id) {
        this.#lead.id = stable || `anon_${this.#uuid()}`;
      } else if (stable && this.#lead.id.startsWith('anon_')) {
        this.#lead.id = stable;
      }

      this.#saveLead();
      return this.#lead.id;
    }

    #stableLeadId() {
      const email = String(this.#lead.email || '').trim().toLowerCase();
      const phone = String(this.#lead.phone || '').replace(/\D/g, '');
      if (email) return `lead_email_${this.#hashId(email)}`;
      if (phone) return `lead_phone_${this.#hashId(phone)}`;
      return '';
    }

    #hashId(value) {
      // Hash simples e síncrono para criar um user_id estável sem expor email/telefone no ID.
      let h = 2166136261;
      const str = String(value || '');
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      }
      return (h >>> 0).toString(36);
    }

    identifyLead(extraTraits = {}) {
      const hasStrongIdentifier = Boolean(this.#lead.id || this.#lead.email || this.#lead.phone);
      const hasNameOnly = Boolean(this.#getFullName());
      if (!hasStrongIdentifier && !(this.#config.identify_with_name_only && hasNameOnly)) return;

      const userId = this.#ensureLeadId();
      const traits = this.#sanitizeProps({
        username: this.#getFullName() || this.#lead.email || this.#lead.phone || userId,
        name: this.#getFullName(),
        email: this.#config.send_pii_traits ? this.#lead.email : undefined,
        phone: this.#config.send_pii_traits ? this.#lead.phone : undefined,
        document: this.#config.send_document_trait ? this.#lead.doc : undefined,
        has_name: Boolean(this.#getFullName()),
        has_email: Boolean(this.#lead.email),
        has_phone: Boolean(this.#lead.phone),
        has_document: Boolean(this.#lead.doc),
        utm_source: this.#params.utm_source,
        utm_medium: this.#params.utm_medium,
        utm_campaign: this.#params.utm_campaign,
        first_seen_path: this.#get('gmr_first_seen_path') || location.pathname,
        last_seen_path: location.pathname,
        ...extraTraits,
      });

      if (!this.#get('gmr_first_seen_path')) this.#set({ gmr_first_seen_path: location.pathname });

      try {
        const currentUserId = window.rybbit?.getUserId?.();
        if (typeof window.rybbit?.identify === 'function' && currentUserId !== userId) {
          window.rybbit.identify(userId, traits);
          this.#log('info', 'Lead identificado no Rybbit', userId, traits);
          return;
        }

        if (typeof window.rybbit?.setTraits === 'function' && currentUserId === userId) {
          window.rybbit.setTraits(traits);
          this.#log('info', 'Traits atualizadas no Rybbit', userId, traits);
          return;
        }
      } catch (e) {
        this.#log('warn', 'identify/setTraits via window.rybbit falhou:', e);
      }

      this.#identifyHttpApi(userId, traits, true);
    }

    #identifyHttpApi(userId, traits, isNewIdentify = true) {
      if (!this.#config.rybbit_host || !this.#config.site_id || !userId) return;
      const url = `${String(this.#config.rybbit_host).replace(/\/$/, '')}/api/identify`;
      const payload = JSON.stringify({
        site_id: String(this.#config.site_id),
        user_id: String(userId).slice(0, 255),
        traits: this.#sanitizeProps(traits || {}),
        is_new_identify: Boolean(isNewIdentify),
      });

      try {
        if (navigator.sendBeacon) {
          const ok = navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
          if (ok) return;
        }
        fetch(url, {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        }).catch(e => this.#log('warn', 'Fallback /api/identify falhou:', e));
      } catch (e) {
        this.#log('warn', 'Fallback /api/identify falhou:', e);
      }
    }

    #debounceIdentifyLead(delay = 350) {
      if (!this.#config.identify_on_input) return;
      clearTimeout(this.#leadIdentifyTimeout);
      this.#leadIdentifyTimeout = setTimeout(() => this.identifyLead(), delay);
    }

    // ─────────────────────────────────────────────
    // Rybbit native API + fallback /api/track
    // ─────────────────────────────────────────────

    async #waitForRybbit() {
      if (window.rybbit?.event || !this.#config.wait_timeout) return true;
      if (this.#readyPromise) return this.#readyPromise;

      this.#readyPromise = new Promise(resolve => {
        const started = Date.now();
        const timer = setInterval(() => {
          if (window.rybbit?.event || Date.now() - started >= this.#config.wait_timeout) {
            clearInterval(timer);
            resolve(Boolean(window.rybbit?.event));
          }
        }, 100);
      });

      return this.#readyPromise;
    }

    async pageview(pathname = location.pathname) {
      await this.#waitForRybbit();

      if (typeof window.rybbit?.pageview === 'function') {
        if (pathname && pathname !== location.pathname) window.rybbit.pageview(pathname);
        else window.rybbit.pageview();
        return;
      }

      await this.#trackHttpApi({ type: 'pageview', pathname });
    }

    async event(eventName, properties = {}) {
      if (!eventName) return;
      await this.#waitForRybbit();
      this.#eventNow(eventName, properties);
    }

    #eventNow(eventName, properties = {}) {
      if (!eventName) return;
      const name = String(eventName).slice(0, 255);
      const props = this.#commonProps(properties);

      if (typeof window.rybbit?.event === 'function') {
        try {
          window.rybbit.event(name, props);
          this.#log('info', 'Evento Rybbit', name, props);
          return;
        } catch (e) {
          this.#log('warn', 'window.rybbit.event falhou:', e);
        }
      }

      this.#trackHttpApi({
        type: 'custom_event',
        event_name: name,
        properties: props,
      });
    }

    async track(data = {}) {
      if (!data.event_name) return;
      if (data.event_name === 'PageView' || data.event_name === 'pageview') {
        return this.pageview(data.pathname || location.pathname);
      }
      return this.event(data.event_name, {
        currency: data.currency || 'BRL',
        value: Number(data.value || data.product_value || 0),
        content_name: data.content_name || data.product_name || '',
        content_ids: Array.isArray(data.content_ids) ? data.content_ids.join(',') : data.content_ids || '',
        content_type: data.content_type || '',
        watch_time: data.watch_time || '',
        page_time: data.page_time || '',
        form_id: data.form_id || '',
        form_name: data.form_name || '',
        button_text: data.button_text || '',
        destination_url: data.destination_url || '',
        ...data.properties,
      });
    }

    async #trackHttpApi(eventData) {
      if (!this.#config.use_http_api_fallback || !this.#config.rybbit_host || !this.#config.site_id) return;

      const url = `${String(this.#config.rybbit_host).replace(/\/$/, '')}/api/track`;
      const body = {
        site_id: String(this.#config.site_id),
        type: eventData.type || 'pageview',
        pathname: eventData.pathname || location.pathname,
        hostname: location.hostname,
        page_title: document.title,
        referrer: document.referrer,
        user_id: this.#lead.id || window.rybbit?.getUserId?.() || undefined,
        language: navigator.language,
        screenWidth: window.screen?.width,
        screenHeight: window.screen?.height,
      };

      if (eventData.type === 'custom_event') {
        body.event_name = eventData.event_name;
        body.properties = JSON.stringify(this.#sanitizeProps(eventData.properties || {}));
      }

      try {
        const payload = JSON.stringify(body);
        if (navigator.sendBeacon) {
          const ok = navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
          if (ok) return;
        }
        await fetch(url, {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
      } catch (e) {
        this.#log('warn', 'Fallback /api/track falhou:', e);
      }
    }

    // ─────────────────────────────────────────────
    // Formulários e captura de lead
    // ─────────────────────────────────────────────

    monitorLeadFields(root = document) {
      const parent = root && root.querySelectorAll ? root : document;
      parent.querySelectorAll('input, textarea, select').forEach(field => this.#bindField(field));
    }

    monitorForms(selector = this.#config.form_selector) {
      document.querySelectorAll(selector).forEach(form => {
        if (!(form instanceof Element)) return;

        if (form.dataset.gmrFormBound !== '1') {
          form.dataset.gmrFormBound = '1';

          form.addEventListener('submit', () => {
            this.#handleLeadForm(form, 'submit');
          }, true);

          form.addEventListener('click', event => {
            const submitter = event.target.closest?.('button, input[type="submit"], input[type="button"], [role="button"], a');
            if (!submitter) return;
            const type = String(submitter.getAttribute('type') || '').toLowerCase();
            const text = (submitter.innerText || submitter.value || submitter.textContent || '').trim().toLowerCase();
            const looksLikeSubmit = !type || type === 'submit' || /enviar|cadastrar|cadastro|inscrever|inscrição|matricular|matr[ií]cula|continuar|confirmar|finalizar|quero|começar|comece|entrar|garantir|comprar|checkout/.test(text);
            if (looksLikeSubmit) this.#handleLeadForm(form, 'submit_button_click', submitter);
          }, true);
        }

        this.monitorLeadFields(form);
      });
    }

    #handleLeadForm(form, source = 'submit', submitter = null) {
      this.#captureFormValues(form);
      this.#captureLeadFields(document);
      this.identifyLead({
        last_form_id: this.#formId(form),
        last_form_source: source,
      });
      this.#trackLeadConversion(form, source, submitter);
    }

    #trackLeadConversion(form, source = 'submit', submitter = null) {
      const formId = this.#formId(form);
      const dedupeKey = `${formId}|${this.#lead.email || this.#lead.phone || this.#getFullName() || 'anonymous'}`;
      const now = Date.now();
      const last = this.#leadEventDedupe.get(dedupeKey) || 0;
      if (now - last < 1500) return;
      this.#leadEventDedupe.set(dedupeKey, now);

      const baseProps = {
        form_id: formId,
        form_name: form.getAttribute?.('name') || form.getAttribute?.('aria-label') || '',
        form_class: String(form.className || '').slice(0, 180),
        form_action: form.getAttribute?.('action') || '',
        form_method: form.getAttribute?.('method') || '',
        form_source: source,
        submitter_text: submitter ? (submitter.innerText || submitter.value || submitter.textContent || '').trim().slice(0, 120) : '',
        has_name: Boolean(this.#getFullName()),
        has_email: Boolean(this.#lead.email),
        has_phone: Boolean(this.#lead.phone),
        identified_user_id: this.#lead.id || '',
      };

      this.#eventNow(this.#config.lead_event_name || 'Lead', baseProps);

      if (this.#config.send_form_submit_event) {
        this.#eventNow(this.#config.form_submit_event_name || 'FormSubmit', baseProps);
      }
    }

    #captureLeadFields(root = document) {
      const parent = root && root.querySelectorAll ? root : document;
      parent.querySelectorAll('input, textarea, select').forEach(field => {
        const type = this.#fieldType(this.#fieldMeta(field));
        if (type) this.#saveFieldValue(field, type);
      });
    }

    monitorFormsDynamic(selector = this.#config.form_selector) {
      if (this.#config._dynamicObserverStarted) return;
      this.#config._dynamicObserverStarted = true;

      const attach = node => {
        if (!(node instanceof Element)) return;
        this.monitorLeadFields(node);
        if (node.matches?.(selector)) this.monitorForms(selector);
        if (node.querySelector?.(selector)) this.monitorForms(selector);
      };

      new MutationObserver(mutations => {
        for (const mutation of mutations) {
          mutation.addedNodes.forEach(attach);
        }
      }).observe(document.body, { childList: true, subtree: true });
    }

    #bindField(field) {
      if (field.dataset.gmrWatching === '1') return;
      const meta = this.#fieldMeta(field);
      const type = this.#fieldType(meta);
      if (!type) return;

      field.dataset.gmrWatching = '1';

      const handler = () => {
        this.#saveFieldValue(field, type);
        this.#debounceIdentifyLead();
      };

      field.addEventListener('blur', handler);
      field.addEventListener('change', handler);
      field.addEventListener('input', handler);

      if (this.#config.form_auto_fill && !field.value) {
        this.#autoFillField(field, type, meta);
      }
    }

    #fieldType(meta) {
      if (this.#isType(meta, 'mail')) return 'mail';
      if (this.#isType(meta, 'phone')) return 'phone';
      if (this.#isType(meta, 'name')) return 'name';
      if (this.#isType(meta, 'doc')) return 'doc';
      return '';
    }

    #autoFillField(field, type, meta) {
      if (type === 'mail' && this.#lead.email) field.value = this.#lead.email;
      if (type === 'phone' && this.#lead.phone) field.value = this.#lead.phone;
      if (type === 'name') {
        if (meta.includes('first')) field.value = this.#lead.fname || this.#getFullName().split(' ')[0] || '';
        else if (meta.includes('last')) field.value = this.#lead.lname || this.#getFullName().split(' ').slice(1).join(' ') || '';
        else field.value = this.#getFullName();
      }
      if (type === 'doc' && this.#lead.doc) field.value = this.#lead.doc;
    }

    #saveFieldValue(field, type) {
      let value = this.#decodeUri(field.value || '').trim();
      if (!value) return;
      const meta = this.#fieldMeta(field);

      if (type === 'mail') {
        this.#lead.email = value.toLowerCase();
      }

      if (type === 'phone' && !meta.includes('ddi') && !meta.includes('ddd')) {
        if (this.#config.phone_valid) {
          value = this.#normalizePhone(value, this.#config.phone_country);
          if (this.#config.phone_update) field.value = value;
        }
        this.#lead.phone = value;
      }

      if (type === 'name') {
        if (meta.includes('first') || meta.includes('fname')) {
          this.#lead.fname = value;
        } else if (meta.includes('last') || meta.includes('lname')) {
          this.#lead.lname = value;
        } else {
          const parts = value.split(/\s+/).filter(Boolean);
          this.#lead.name = value;
          this.#lead.fname = this.#lead.fname || parts[0] || '';
          this.#lead.lname = this.#lead.lname || parts.slice(1).join(' ') || '';
        }
      }

      if (type === 'doc') {
        this.#lead.doc = value;
      }

      this.#saveLead();
    }

    #captureFormValues(form) {
      form.querySelectorAll('input, textarea, select').forEach(field => {
        const type = this.#fieldType(this.#fieldMeta(field));
        if (type) this.#saveFieldValue(field, type);
      });
    }

    checkFormValues(form) {
      if (!form || form.tagName !== 'FORM') return false;
      return [...form.querySelectorAll('input, textarea, select')].every(field => {
        const meta = this.#fieldMeta(field);
        const requiredLeadField = this.#isType(meta, 'mail') || this.#isType(meta, 'phone') || this.#isType(meta, 'name');
        return !(requiredLeadField && !String(field.value || '').trim());
      });
    }

    #formId(form) {
      return form.id || form.getAttribute('name') || form.dataset.formId || form.className || 'form';
    }

    // ─────────────────────────────────────────────
    // Cliques, WhatsApp, botões e outbound
    // ─────────────────────────────────────────────

    monitorClicks() {
      if (this.#config._clickObserverStarted) return;
      this.#config._clickObserverStarted = true;

      document.addEventListener('click', event => {
        const el = event.target.closest('a, button, input[type="submit"], input[type="button"], [role="button"], [data-rybbit-event], [data-gmr-event], .elementor-button, .gpc_botao');
        if (!el) return;

        const href = el.href || el.getAttribute('data-href') || '';
        const text = (el.innerText || el.value || el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 120);

        // Captura botões de formulário antes de qualquer redirect/AJAX.
        const nearestForm = el.closest?.('form');
        if (nearestForm) {
          const type = String(el.getAttribute('type') || '').toLowerCase();
          const t = text.toLowerCase();
          const looksLikeSubmit = !type || type === 'submit' || /enviar|cadastrar|cadastro|inscrever|inscrição|matricular|matr[ií]cula|continuar|confirmar|finalizar|quero|começar|comece|entrar|garantir|comprar|checkout/.test(t);
          if (looksLikeSubmit) this.#handleLeadForm(nearestForm, 'global_submit_click', el);
        } else {
          // Para formulários fake/AJAX que não usam <form>, captura campos visíveis da página
          // e dispara Lead quando o botão parece ser de cadastro/envio.
          this.#captureLeadFields(document);
          const t = text.toLowerCase();
          const looksLikeLeadButton = /enviar|cadastrar|cadastro|inscrever|inscrição|matricular|matr[ií]cula|quero|começar|comece|garantir|checkout|comprar|confirmar/.test(t);
          if (looksLikeLeadButton && (this.#lead.email || this.#lead.phone)) {
            this.identifyLead({ last_form_source: 'button_without_form' });
            this.#trackLeadConversion(document.body, 'button_without_form', el);
          }
        }

        const explicitEvent = el.getAttribute('data-gmr-event') || el.getAttribute('data-rybbit-event');
        if (explicitEvent) {
          this.#eventNow(explicitEvent, this.#propsFromDataset(el, { button_text: text, destination_url: href }));
          return;
        }

        if (this.#config.auto_track_whatsapp && /wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|whatsapp:/i.test(href)) {
          this.#eventNow('Contact', {
            channel: 'whatsapp',
            button_text: text,
            destination_url: href,
            has_name: Boolean(this.#getFullName()),
            has_email: Boolean(this.#lead.email),
            has_phone: Boolean(this.#lead.phone),
          });
          return;
        }

        if (this.#config.auto_track_buttons && (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.getAttribute('role') === 'button')) {
          this.#eventNow('ButtonClick', {
            button_text: text,
            button_id: el.id || '',
            button_class: String(el.className || '').slice(0, 180),
          });
        }

        if (href && /^https?:\/\//i.test(href) && !href.includes(location.hostname) && typeof window.rybbit?.trackOutbound === 'function') {
          try { window.rybbit.trackOutbound(href, text, el.target || '_self'); } catch {}
        }
      }, true);
    }

    #propsFromDataset(el, base = {}) {
      const props = { ...base };
      for (const attr of el.attributes || []) {
        if (attr.name.startsWith('data-gmr-prop-')) props[attr.name.replace('data-gmr-prop-', '')] = attr.value;
        if (attr.name.startsWith('data-rybbit-prop-')) props[attr.name.replace('data-rybbit-prop-', '')] = attr.value;
      }
      return props;
    }

    // ─────────────────────────────────────────────
    // Propagação de parâmetros para links externos
    // ─────────────────────────────────────────────

    propagateParams(includeLead = false) {
      const addParams = new URLSearchParams();
      const add = (k, v) => { if (v) addParams.set(k, v); };

      add('utm_source', this.#params.utm_source);
      add('utm_medium', this.#params.utm_medium);
      add('utm_campaign', this.#params.utm_campaign);
      add('utm_id', this.#params.utm_id);
      add('utm_term', this.#params.utm_term);
      add('utm_content', this.#params.utm_content);
      add('src', this.#params.src);
      add('sck', this.#params.sck || this.#lead.id);
      add('external_id', this.#lead.id);
      add('fbclid', this.#params.fbc);
      add('fbp', this.#params.fbp);
      add('gclid', this.#params.gclid);
      add('gbraid', this.#params.gbraid);
      add('wbraid', this.#params.wbraid);

      if (includeLead && this.#config.send_pii_traits) {
        add('name', this.#getFullName());
        add('email', this.#lead.email);
        add('phone', this.#lead.phone);
      }

      const qs = addParams.toString();
      if (!qs) return;

      document.querySelectorAll('a[href^="http"]').forEach(link => {
        if (link.dataset.gmrParams === '1') return;
        if (link.href.includes('#') || link.href.includes('javascript:') || link.href.includes(location.hostname)) return;

        try {
          const url = new URL(link.href);
          addParams.forEach((value, key) => {
            if (!url.searchParams.has(key)) url.searchParams.set(key, value);
          });
          link.href = url.toString();
          link.dataset.gmrParams = '1';
        } catch {}
      });
    }

    // ─────────────────────────────────────────────
    // Vídeos: HTML5, YouTube e Vimeo
    // ─────────────────────────────────────────────

    monitorVideos(selector = 'video, iframe[src*="youtube"], iframe[src*="vimeo"]', targetSeconds = 30, callback) {
      document.querySelectorAll(selector).forEach(el => {
        this.trackVideoAt(targetSeconds, el, async info => {
          if (typeof callback === 'function') await callback(info);
          else {
            await this.event('ViewContent', {
              content_type: 'video',
              content_name: info.videoTitle || info.videoId || 'video',
              watch_time: info.watchTime,
              video_type: info.videoType,
              video_duration: Math.round(info.totalTime || 0),
            });
          }
        });
      });
    }

    async trackVideoAt(targetSeconds, element, callback) {
      const type = this.#detectVideoType(element);
      if (!type) return;
      const id = this.#videoId(element);
      const target = Math.max(0, Number(targetSeconds || 0));

      if (type === 'html5') return this.#trackHtml5Video(id, element, target, callback);
      if (type === 'youtube') return this.#trackYouTubeVideo(id, element, target, callback);
      if (type === 'vimeo') return this.#trackVimeoVideo(id, element, target, callback);
    }

    #detectVideoType(el) {
      if (!el) return '';
      if (el instanceof HTMLVideoElement || el.querySelector?.('video')) return 'html5';
      if (el.tagName === 'IFRAME') {
        const src = String(el.src || '').toLowerCase();
        if (/youtube\.com|youtu\.be|youtube-nocookie\.com/.test(src)) return 'youtube';
        if (/vimeo\.com/.test(src)) return 'vimeo';
      }
      if (el.querySelector?.('iframe[src*="youtube"], iframe[src*="youtu.be"]')) return 'youtube';
      if (el.querySelector?.('iframe[src*="vimeo"]')) return 'vimeo';
      return '';
    }

    #videoId(el) {
      const raw = el.id || el.getAttribute?.('title') || el.className || Math.random().toString(36).slice(2, 10);
      return `gmr_video_${String(raw).replace(/\s+/g, '_').slice(0, 60)}`;
    }

    #trackHtml5Video(id, element, target, callback) {
      if (this.#videoPlayers.has(`${id}_${target}`)) return;
      const video = element instanceof HTMLVideoElement ? element : element.querySelector('video');
      if (!video) return;
      const state = { fired: false };
      this.#videoPlayers.set(`${id}_${target}`, state);

      const onTime = () => {
        if (state.fired || video.currentTime < target) return;
        state.fired = true;
        callback({
          currentTime: video.currentTime,
          totalTime: video.duration,
          watchTime: target,
          videoType: 'html5',
          videoId: id,
          videoTitle: video.getAttribute('title') || video.getAttribute('aria-label') || '',
        });
        video.removeEventListener('timeupdate', onTime);
      };

      video.addEventListener('timeupdate', onTime);
    }

    async #trackYouTubeVideo(id, element, target, callback) {
      if (this.#videoPlayers.has(`${id}_${target}`)) return;
      const iframe = element.tagName === 'IFRAME' ? element : element.querySelector('iframe[src*="youtube"], iframe[src*="youtu.be"]');
      if (!iframe) return;

      await this.#enableYouTubeApi(iframe);
      await this.#loadYouTubeApi();

      if (!iframe.id) iframe.id = `gmr_yt_${this.#uuid()}`;

      const state = { fired: false, interval: null, player: null };
      this.#videoPlayers.set(`${id}_${target}`, state);

      state.player = new window.YT.Player(iframe.id, {
        events: {
          onStateChange: event => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (state.interval) return;
              state.interval = setInterval(() => {
                if (state.fired) return clearInterval(state.interval);
                const currentTime = state.player.getCurrentTime?.() || 0;
                if (currentTime >= target) {
                  state.fired = true;
                  clearInterval(state.interval);
                  callback({
                    currentTime,
                    totalTime: state.player.getDuration?.() || 0,
                    watchTime: target,
                    videoType: 'youtube',
                    videoId: id,
                    videoTitle: iframe.title || '',
                  });
                }
              }, 1000);
            }
            if ([window.YT.PlayerState.PAUSED, window.YT.PlayerState.ENDED].includes(event.data) && state.interval) {
              clearInterval(state.interval);
              state.interval = null;
            }
          },
        },
      });
    }

    async #loadYouTubeApi() {
      if (window.YT?.Player) return;
      if (window.__gmrYouTubeLoading) return window.__gmrYouTubeLoading;

      window.__gmrYouTubeLoading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = reject;
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof prev === 'function') prev();
          resolve();
        };
        document.head.appendChild(script);
      });

      return window.__gmrYouTubeLoading;
    }

    async #enableYouTubeApi(iframe) {
      try {
        const url = new URL(iframe.src);
        url.searchParams.set('enablejsapi', '1');
        url.searchParams.set('origin', location.origin);
        iframe.src = url.toString();
      } catch {}
    }

    async #trackVimeoVideo(id, element, target, callback) {
      if (this.#videoPlayers.has(`${id}_${target}`)) return;
      const iframe = element.tagName === 'IFRAME' ? element : element.querySelector('iframe[src*="vimeo"]');
      if (!iframe) return;

      await this.#loadVimeoApi();
      if (!window.Vimeo?.Player) return;

      const player = new window.Vimeo.Player(iframe);
      const state = { fired: false };
      this.#videoPlayers.set(`${id}_${target}`, state);

      player.on('timeupdate', data => {
        if (state.fired || data.seconds < target) return;
        state.fired = true;
        callback({
          currentTime: data.seconds,
          totalTime: data.duration,
          watchTime: target,
          videoType: 'vimeo',
          videoId: id,
          videoTitle: iframe.title || '',
        });
      });
    }

    async #loadVimeoApi() {
      if (window.Vimeo?.Player) return;
      if (window.__gmrVimeoLoading) return window.__gmrVimeoLoading;

      window.__gmrVimeoLoading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://player.vimeo.com/api/player.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      return window.__gmrVimeoLoading;
    }

    debugState() {
      return {
        lead: { ...this.#lead },
        params: { ...this.#params },
        rybbit_user_id: window.rybbit?.getUserId?.() || null,
        has_rybbit_event: typeof window.rybbit?.event === 'function',
        has_rybbit_identify: typeof window.rybbit?.identify === 'function',
      };
    }

    // ─────────────────────────────────────────────
    // Shortcodes estilo PixelX, mas com prefixo GMR
    // ─────────────────────────────────────────────

    applyShortcodes() {
      const map = () => ({
        '[GMR_NAME]': this.#getFullName(),
        '[GMR_FIRST_NAME]': this.#lead.fname || this.#getFullName().split(' ')[0] || '',
        '[GMR_LAST_NAME]': this.#lead.lname || this.#getFullName().split(' ').slice(1).join(' ') || '',
        '[GMR_EMAIL]': this.#lead.email || '',
        '[GMR_PHONE]': this.#lead.phone || '',
        '[GMR_PHONE_BR]': this.#formatPhoneBR(this.#lead.phone),
        '[GMR_UTM_SOURCE]': this.#params.utm_source || '',
        '[GMR_UTM_CAMPAIGN]': this.#params.utm_campaign || '',
        '[GMR_SRC]': this.#params.src || '',
        '[GMR_SCK]': this.#params.sck || this.#lead.id || '',
      });

      const replace = text => {
        let output = text;
        const values = map();
        Object.entries(values).forEach(([key, value]) => {
          output = output.split(key).join(value);
        });
        return output;
      };

      const process = root => {
        if (!root || !root.querySelectorAll) return;

        root.querySelectorAll('[href]').forEach(el => {
          const href = el.getAttribute('href');
          if (href && href.includes('[GMR_')) el.setAttribute('href', replace(href));
        });

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
          const parentTag = node.parentNode?.tagName;
          if (parentTag === 'SCRIPT' || parentTag === 'STYLE') continue;
          if (node.nodeValue.includes('[GMR_')) node.nodeValue = replace(node.nodeValue);
        }
      };

      process(document.body);
      new MutationObserver(mutations => {
        mutations.forEach(m => m.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) process(node);
        }));
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  window.GMRybbitTracker = GMRybbitTracker;
})();
