// =============================================================================
// TELEGRAM NOTIFICATIONS — Push key events to Cascadia team
// =============================================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface TelegramMessage {
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

async function sendTelegram(msg: TelegramMessage): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('[Telegram] Not configured — skipping:', msg.text.slice(0, 80));
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: msg.text,
        parse_mode: msg.parse_mode || 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Telegram] Send failed:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Telegram] Error:', err);
    return false;
  }
}

// ── Event-specific notifications ──────────────────────────────────

export async function notifyNewDeal(dealName: string, state: string | null, beds: number | null, askingPrice: string | null): Promise<void> {
  const price = askingPrice ? `$${(parseFloat(askingPrice) / 1_000_000).toFixed(1)}M` : 'TBD';
  await sendTelegram({
    text: `🏥 <b>New Deal Entered</b>\n\n<b>${dealName}</b>\n${state || '??'} · ${beds || '?'} beds · ${price}\n\n<a href="https://snfalyze.ai/app/brain/pipeline">View Pipeline →</a>`,
  });
}

export async function notifyAnalysisComplete(dealName: string, confidence: number, recommendation: string): Promise<void> {
  const emoji = recommendation === 'pursue' ? '🟢' : recommendation === 'conditional' ? '🟡' : '🔴';
  await sendTelegram({
    text: `🧠 <b>Dual-Brain Analysis Complete</b>\n\n${emoji} <b>${dealName}</b>\nConfidence: ${confidence}% · Recommendation: ${recommendation.toUpperCase()}\n\n<a href="https://snfalyze.ai/app/brain/pipeline">View Details →</a>`,
  });
}

export async function notifyAhaMoment(title: string, dealName: string | null, significance: string): Promise<void> {
  if (significance !== 'high') return; // Only notify on high-significance
  await sendTelegram({
    text: `💡 <b>High-Significance AHA Moment</b>\n\n<b>${title}</b>\n${dealName ? `From: ${dealName}` : 'From: Research'}\n\n<a href="https://snfalyze.ai/app/brain/aha">View AHA Moments →</a>`,
  });
}

export async function notifyResearchComplete(topic: string, latencyMs: number): Promise<void> {
  await sendTelegram({
    text: `🔍 <b>Research Mission Complete</b>\n\n"${topic}"\nCompleted in ${(latencyMs / 1000).toFixed(1)}s\n\n<a href="https://snfalyze.ai/app/brain/research">View Findings →</a>`,
  });
}

export async function notifyNewVisitor(ip: string, country: string | null, path: string): Promise<void> {
  await sendTelegram({
    text: `👤 <b>New Visitor</b>\n\n${ip}${country ? ` (${country})` : ''}\nLanded on: ${path}`,
  });
}
