const resendApiKey = process.env.RESEND_API_KEY?.trim();
const emailFrom =
  process.env.EMAIL_FROM?.trim() ?? "Term Craft <onboarding@resend.dev>";
const emailReplyTo = process.env.EMAIL_REPLY_TO?.trim();
const siteUrl = (process.env.SITE_URL ?? "https://usetermcraft.com").replace(
  /\/$/,
  "",
);

function isEmailConfigured() {
  return Boolean(resendApiKey);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildTemplateUrl(templatePath) {
  const path = templatePath?.startsWith("/") ? templatePath : "/";
  return `${siteUrl}${path}`;
}

function buildSigningUrl(templatePath) {
  const params = new URLSearchParams();
  if (templatePath) {
    params.set("template", templatePath);
  }

  return `${siteUrl}/builder${params.toString() ? `?${params.toString()}` : ""}`;
}

function buildFollowupEmail(lead) {
  const templateTitle = lead.templateTitle || "contract template";
  const templateUrl = buildTemplateUrl(lead.templatePath);
  const signingUrl = buildSigningUrl(lead.templatePath);

  const text = [
    `Your editable/signable ${templateTitle} is ready.`,
    "",
    `Open signing workspace: ${signingUrl}`,
    `Return to template: ${templateUrl}`,
    "",
    "The PDF you downloaded was generated in your browser. Term Craft does not email your filled contract terms.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #202124; line-height: 1.6; max-width: 620px;">
      <p style="font-size: 13px; font-weight: 700; color: #0f766e; text-transform: uppercase;">Term Craft</p>
      <h1 style="font-size: 24px; line-height: 1.2; margin: 0 0 12px;">Your editable/signable version is ready</h1>
      <p>You downloaded the <strong>${escapeHtml(templateTitle)}</strong>. Use the link below to open the signing workspace with signer details, signature capture, audit trail, and export controls.</p>
      <p>
        <a href="${escapeHtml(signingUrl)}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 11px 16px; border-radius: 8px; text-decoration: none; font-weight: 700;">Open Signing Workspace</a>
      </p>
      <p style="font-size: 14px; color: #4d5967;">You can also return to the original template page here: <a href="${escapeHtml(templateUrl)}">${escapeHtml(templateTitle)}</a>.</p>
      <p style="font-size: 12px; color: #667085;">The PDF was generated in your browser. Term Craft does not email your filled contract terms.</p>
    </div>
  `;

  return {
    html,
    subject: `Your editable ${templateTitle}`,
    text,
  };
}

export async function sendEditableVersionEmail(lead) {
  if (!isEmailConfigured()) {
    return {
      provider: "resend",
      sent: false,
      skipped: true,
      reason: "RESEND_API_KEY is not configured.",
    };
  }

  const message = buildFollowupEmail(lead);
  const payload = {
    from: emailFrom,
    to: [lead.email],
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(emailReplyTo ? { reply_to: emailReplyTo } : {}),
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      provider: "resend",
      sent: false,
      skipped: false,
      reason:
        responseBody?.message ??
        responseBody?.error ??
        `Resend returned HTTP ${response.status}.`,
    };
  }

  return {
    provider: "resend",
    sent: true,
    skipped: false,
    id: responseBody?.id ?? "",
  };
}
