from __future__ import annotations

import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage


@dataclass(frozen=True)
class SmtpConfig:
    host: str
    port: int
    username: str | None
    password: str | None
    use_ssl: bool
    use_starttls: bool
    from_email: str
    to_email: str
    subject_prefix: str


def _env_bool(name: str, default: bool = False) -> bool:
    val = os.environ.get(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "y", "on"}


def load_smtp_config_from_env() -> SmtpConfig:
    host = os.environ.get("SMTP_HOST", "").strip()
    port_raw = os.environ.get("SMTP_PORT", "").strip()
    from_email = os.environ.get("SMTP_FROM_EMAIL", "").strip()
    to_email = os.environ.get("CONTACT_TO_EMAIL", "").strip()

    if not host:
        raise ValueError("SMTP_HOST is required")
    if not port_raw:
        raise ValueError("SMTP_PORT is required")
    if not from_email:
        raise ValueError("SMTP_FROM_EMAIL is required")
    if not to_email:
        raise ValueError("CONTACT_TO_EMAIL is required")

    port = int(port_raw)
    use_ssl = _env_bool("SMTP_USE_SSL", default=(port == 465))
    use_starttls = _env_bool("SMTP_USE_STARTTLS", default=(port == 587))

    if use_ssl and use_starttls:
        raise ValueError("Only one of SMTP_USE_SSL / SMTP_USE_STARTTLS can be true")

    username = os.environ.get("SMTP_USERNAME", "").strip() or None
    password = os.environ.get("SMTP_PASSWORD", "").strip() or None
    subject_prefix = os.environ.get("CONTACT_SUBJECT_PREFIX", "[resume-web] Contact").strip()

    return SmtpConfig(
        host=host,
        port=port,
        username=username,
        password=password,
        use_ssl=use_ssl,
        use_starttls=use_starttls,
        from_email=from_email,
        to_email=to_email,
        subject_prefix=subject_prefix,
    )


def send_contact_email(
    *,
    config: SmtpConfig,
    contact: str,
    message: str,
    origin: str | None = None,
    page_path: str | None = None,
    user_agent: str | None = None,
    client_ip: str | None = None,
) -> None:
    msg = EmailMessage()
    msg["From"] = config.from_email
    msg["To"] = config.to_email
    msg["Subject"] = f"{config.subject_prefix}: {contact.strip()[:80] or 'new message'}"

    meta_lines: list[str] = []
    if origin:
        meta_lines.append(f"Origin: {origin}")
    if page_path:
        meta_lines.append(f"Path: {page_path}")
    if client_ip:
        meta_lines.append(f"Client IP: {client_ip}")
    if user_agent:
        meta_lines.append(f"User-Agent: {user_agent}")

    meta = "\n".join(meta_lines)

    body = "\n".join(
        [
            "New contact form submission",
            "",
            f"Contact: {contact.strip()}",
            "",
            "Message:",
            message.strip(),
            "",
            "---",
            meta,
        ]
    ).strip() + "\n"

    msg.set_content(body)

    timeout = float(os.environ.get("SMTP_TIMEOUT_SECONDS", "10").strip() or "10")

    if config.use_ssl:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(config.host, config.port, timeout=timeout, context=context) as server:
            if config.username and config.password:
                server.login(config.username, config.password)
            server.send_message(msg)
        return

    with smtplib.SMTP(config.host, config.port, timeout=timeout) as server:
        server.ehlo()
        if config.use_starttls:
            context = ssl.create_default_context()
            server.starttls(context=context)
            server.ehlo()
        if config.username and config.password:
            server.login(config.username, config.password)
        server.send_message(msg)


def send_share_notification_email(
    *,
    config: SmtpConfig,
    contact: str,
    share_type: str,
    share_id: str,
    share_url: str | None = None,
    origin: str | None = None,
    client_ip: str | None = None,
    user_agent: str | None = None,
) -> None:
    """
    Send notification when someone creates a share or downloads CV.
    
    Args:
        config: SMTP configuration
        contact: User's email or LinkedIn
        share_type: "conversation" or "cv_download"
        share_id: The generated share ID
        share_url: Full URL to the shared content (if available)
        origin: Request origin
        client_ip: Client IP address
        user_agent: User agent string
    """
    msg = EmailMessage()
    msg["From"] = config.from_email
    msg["To"] = config.to_email
    
    if share_type == "cv_download":
        subject = f"[resume-web] CV Download: {contact.strip()[:60]}"
        action = "CV downloaded"
    else:
        subject = f"[resume-web] Conversation Shared: {contact.strip()[:60]}"
        action = "Conversation shared"
    
    msg["Subject"] = subject

    meta_lines: list[str] = []
    if share_url:
        meta_lines.append(f"Share URL: {share_url}")
    else:
        meta_lines.append(f"Share ID: {share_id}")
    if origin:
        meta_lines.append(f"Origin: {origin}")
    if client_ip:
        meta_lines.append(f"Client IP: {client_ip}")
    if user_agent:
        meta_lines.append(f"User-Agent: {user_agent}")

    meta = "\n".join(meta_lines)

    body = "\n".join(
        [
            f"{action} by new visitor",
            "",
            f"Contact: {contact.strip()}",
            "",
            "---",
            meta,
        ]
    ).strip() + "\n"

    msg.set_content(body)

    timeout = float(os.environ.get("SMTP_TIMEOUT_SECONDS", "10").strip() or "10")

    if config.use_ssl:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(config.host, config.port, timeout=timeout, context=context) as server:
            if config.username and config.password:
                server.login(config.username, config.password)
            server.send_message(msg)
        return

    with smtplib.SMTP(config.host, config.port, timeout=timeout) as server:
        server.ehlo()
        if config.use_starttls:
            context = ssl.create_default_context()
            server.starttls(context=context)
            server.ehlo()
        if config.username and config.password:
            server.login(config.username, config.password)
        server.send_message(msg)


