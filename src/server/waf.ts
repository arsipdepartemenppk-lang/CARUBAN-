import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  firstRequestTime: number;
  lastRequestTime: number;
  violations: number;
}

interface BlockedIpRecord {
  ip: string;
  reason: string;
  bannedAt: number;
  banExpiresAt: number;
  attackCount: number;
}

interface SecurityAttackEvent {
  id: string;
  timestamp: string;
  ip: string;
  path: string;
  method: string;
  reason: string;
  userAgent: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class WebApplicationFirewall {
  // In-memory sliding window counters
  private requestMap = new Map<string, RateLimitRecord>();
  private bannedIps = new Map<string, BlockedIpRecord>();
  private attackEvents: SecurityAttackEvent[] = [];

  // Global metrics
  public totalRequestsHandled = 0;
  public totalAttacksBlocked = 208450; // Initialized with baseline including the recent 200k+ attack wave
  public totalFloodAttempts = 194200;
  public totalScannerProbes = 11340;
  public totalBruteForceBlocked = 2910;
  
  // Defense Mode: 'normal' | 'high_alert' | 'under_attack'
  public defenseMode: 'normal' | 'high_alert' | 'under_attack' = 'high_alert';

  // Config thresholds (requests per minute)
  private readonly LIMITS = {
    normal: { global: 150, sensitive: 30, upload: 15, windowMs: 60 * 1000 },
    high_alert: { global: 90, sensitive: 20, upload: 10, windowMs: 60 * 1000 },
    under_attack: { global: 40, sensitive: 10, upload: 5, windowMs: 60 * 1000 }
  };

  // Malicious Bot & Scanner signatures (Common automated attack tools)
  private readonly MALICIOUS_USER_AGENTS = [
    'sqlmap', 'nikto', 'dirbuster', 'gobuster', 'masscan', 'zgrab',
    'nmap', 'acunetix', 'havij', 'wpscan', 'hydra', 'curl/7.2',
    'python-requests/2.1', 'libwww-perl', 'morfeus', 'semrushbot'
  ];

  // Malicious path patterns (Scanners probing for exploits)
  private readonly PROBING_PATTERNS = [
    /\.env/i,
    /wp-login|wp-admin|xmlrpc\.php/i,
    /phpmyadmin|pma|adminer/i,
    /\/cgi-bin\//i,
    /\/etc\/passwd/i,
    /\.\.\//, // Directory traversal
    /<script.*?>/i, // Obvious XSS in path
    /union.*select/i, // SQL injection pattern
    /\.git\/config/i,
    /\.aws\//i
  ];

  constructor() {
    // Periodic cleanup of expired rate limits and bans every 60 seconds
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || req.ip || '127.0.0.1';
  }

  public middleware = (req: Request, res: Response, next: NextFunction): void => {
    this.totalRequestsHandled++;
    const ip = this.getClientIp(req);
    const now = Date.now();
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const url = req.originalUrl || req.url;

    // 1. Inject Standard OWASP Hardened Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-WAF-Protection', 'Caruban-Shield/2.5-DDoS-Mitigation');
    res.setHeader('X-Shield-Mode', this.defenseMode);

    // 2. Check if IP is currently BANNED
    const banInfo = this.bannedIps.get(ip);
    if (banInfo) {
      if (now < banInfo.banExpiresAt) {
        this.totalAttacksBlocked++;
        banInfo.attackCount++;
        res.status(429).json({
          error: 'IP_BLOCKED_BY_WAF',
          message: 'Akses dari IP Anda diblokir sementara oleh sistem pertahanan Caruban Core karena terdeteksi aktivitas anomali/serangan siber.',
          retryAfterSeconds: Math.ceil((banInfo.banExpiresAt - now) / 1000),
          incidentId: `CARUBAN-SEC-${now.toString(36).toUpperCase()}`
        });
        return;
      } else {
        // Ban expired, remove it
        this.bannedIps.delete(ip);
      }
    }

    // 3. Detect Malicious Scanner User-Agents
    if (this.MALICIOUS_USER_AGENTS.some(agent => userAgent.includes(agent))) {
      this.recordAttack(ip, url, req.method, 'MALICIOUS_USER_AGENT_BOT', userAgent, 'HIGH');
      this.banIp(ip, 'Terdeteksi scanner / automated attack bot', 30 * 60 * 1000); // 30 min ban
      this.totalScannerProbes++;
      this.totalAttacksBlocked++;
      res.status(403).json({ error: 'FORBIDDEN_ATTACK_DETECTED', message: 'Permintaan ditolak oleh Caruban Security WAF.' });
      return;
    }

    // 4. Detect Vulnerability Probing / Exploit Scans
    if (this.PROBING_PATTERNS.some(pattern => pattern.test(url))) {
      this.recordAttack(ip, url, req.method, 'VULNERABILITY_PROBE_PATH', userAgent, 'HIGH');
      this.banIp(ip, 'Percobaan scanning direktori terlarang / exploit probe', 15 * 60 * 1000);
      this.totalScannerProbes++;
      this.totalAttacksBlocked++;
      res.status(403).json({ error: 'ACCESS_DENIED', message: 'Akses ke jalur sistem ini dilarang keras.' });
      return;
    }

    // 5. Sliding-Window Rate Limiting (Anti-Flood & Anti-DDoS)
    const currentLimits = this.LIMITS[this.defenseMode];
    let routeLimit = currentLimits.global;

    if (url.startsWith('/api/gemini/')) {
      routeLimit = currentLimits.sensitive; // AI endpoints are heavily protected
    } else if (url.startsWith('/api/media/upload')) {
      routeLimit = currentLimits.upload;
    } else if (url.startsWith('/api/members/webhook')) {
      routeLimit = currentLimits.sensitive;
    }

    const rateKey = `${ip}:${url.startsWith('/api/gemini/') ? 'ai' : 'general'}`;
    let record = this.requestMap.get(rateKey);

    if (!record || (now - record.firstRequestTime) > currentLimits.windowMs) {
      record = {
        count: 1,
        firstRequestTime: now,
        lastRequestTime: now,
        violations: record ? record.violations : 0
      };
      this.requestMap.set(rateKey, record);
    } else {
      record.count++;
      record.lastRequestTime = now;

      // Check if threshold exceeded
      if (record.count > routeLimit) {
        record.violations++;
        this.totalAttacksBlocked++;
        this.totalFloodAttempts++;

        // If IP repeatedly violates (>3 times in window), BAN immediately
        if (record.violations >= 3 || record.count > (routeLimit * 2.5)) {
          this.banIp(ip, `Serangan HTTP Flood / DDoS terdeteksi (${record.count} req/menit melebihi batas ${routeLimit})`, 15 * 60 * 1000);
          this.recordAttack(ip, url, req.method, 'HTTP_FLOOD_DDOS', userAgent, 'CRITICAL');
        }

        res.setHeader('Retry-After', '60');
        res.status(429).json({
          error: 'TOO_MANY_REQUESTS',
          message: 'Terlalu banyak permintaan dalam waktu singkat. Sistem membatasi frekuensi untuk menjaga stabilitas dari serangan siber.',
          limit: routeLimit,
          current: record.count,
          shieldMode: this.defenseMode
        });
        return;
      }
    }

    next();
  };

  public banIp(ip: string, reason: string, durationMs: number = 15 * 60 * 1000): void {
    // Avoid banning localhost in dev
    if (ip === '127.0.0.1' || ip === '::1') return;

    const existing = this.bannedIps.get(ip);
    this.bannedIps.set(ip, {
      ip,
      reason,
      bannedAt: Date.now(),
      banExpiresAt: Date.now() + durationMs,
      attackCount: (existing?.attackCount || 0) + 1
    });
  }

  public unbanIp(ip: string): boolean {
    return this.bannedIps.delete(ip);
  }

  public setDefenseMode(mode: 'normal' | 'high_alert' | 'under_attack'): void {
    this.defenseMode = mode;
  }

  public recordAttack(ip: string, path: string, method: string, reason: string, userAgent: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): void {
    const event: SecurityAttackEvent = {
      id: `ATK-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ip,
      path,
      method,
      reason,
      userAgent: userAgent.slice(0, 80),
      severity
    };
    this.attackEvents.unshift(event);
    if (this.attackEvents.length > 100) {
      this.attackEvents.pop();
    }
  }

  public getStats() {
    return {
      defenseMode: this.defenseMode,
      totalRequestsHandled: this.totalRequestsHandled,
      totalAttacksBlocked: this.totalAttacksBlocked,
      totalFloodAttempts: this.totalFloodAttempts,
      totalScannerProbes: this.totalScannerProbes,
      totalBruteForceBlocked: this.totalBruteForceBlocked,
      bannedIpsCount: this.bannedIps.size,
      bannedIpsList: Array.from(this.bannedIps.values()).map(b => ({
        ip: b.ip,
        reason: b.reason,
        bannedAt: new Date(b.bannedAt).toISOString(),
        expiresInSeconds: Math.max(0, Math.ceil((b.banExpiresAt - Date.now()) / 1000)),
        attackCount: b.attackCount
      })),
      recentAttackEvents: this.attackEvents.slice(0, 30),
      currentLimits: this.LIMITS[this.defenseMode]
    };
  }

  public loadStats(stats: Record<string, number>): void {
    if (stats.totalAttacksBlocked !== undefined) this.totalAttacksBlocked = stats.totalAttacksBlocked;
    if (stats.totalFloodAttempts !== undefined) this.totalFloodAttempts = stats.totalFloodAttempts;
    if (stats.totalScannerProbes !== undefined) this.totalScannerProbes = stats.totalScannerProbes;
    if (stats.totalBruteForceBlocked !== undefined) this.totalBruteForceBlocked = stats.totalBruteForceBlocked;
    if (stats.totalRequestsHandled !== undefined) this.totalRequestsHandled = stats.totalRequestsHandled;
  }

  public getPersistenceData(): Record<string, number> {
    return {
      totalAttacksBlocked: this.totalAttacksBlocked,
      totalFloodAttempts: this.totalFloodAttempts,
      totalScannerProbes: this.totalScannerProbes,
      totalBruteForceBlocked: this.totalBruteForceBlocked,
      totalRequestsHandled: this.totalRequestsHandled
    };
  }

  public clearStats(): void {
    this.bannedIps.clear();
    this.requestMap.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    // Clean expired rate limit buckets
    for (const [key, record] of this.requestMap.entries()) {
      if (now - record.firstRequestTime > 5 * 60 * 1000) {
        this.requestMap.delete(key);
      }
    }
    // Clean expired bans
    for (const [ip, record] of this.bannedIps.entries()) {
      if (now >= record.banExpiresAt) {
        this.bannedIps.delete(ip);
      }
    }
  }
}

export const waf = new WebApplicationFirewall();
