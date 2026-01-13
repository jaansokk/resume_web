/**
 * PostHog Analytics Tracking Utilities
 * 
 * Centralized event tracking for the resume site.
 * Uses posthog.capture() for custom events.
 */

// Type-safe event names
export const EVENTS = {
  // Navigation & Journey
  PAGE_VIEW: 'page_view',
  
  // Handshake View
  HANDSHAKE_QUICK_REPLY_CLICKED: 'handshake_quick_reply_clicked',
  
  // Chat Interactions
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_CHIP_CLICKED: 'chat_chip_clicked',
  
  // Split View
  SPLIT_VIEW_OPENED: 'split_view_opened',
  ARTIFACT_TAB_SWITCHED: 'artifact_tab_switched',
  
  // Share Flow
  SHARE_MODAL_OPENED: 'share_modal_opened',
  SHARE_LINKEDIN_INPUT_PROVIDED: 'share_linkedin_input_provided',
  SHARE_LINK_COPIED: 'share_link_copied',
  SHARE_PDF_DOWNLOADED: 'share_pdf_downloaded',
  SHARE_SUCCESS: 'share_success',
  
  // CV Page
  CV_CHAT_INITIATED: 'cv_chat_initiated',
  CV_PDF_DOWNLOADED: 'cv_pdf_downloaded',
  
  // Contact
  CONTACT_FORM_SENT: 'contact_form_sent',
  
  // Session Management
  START_OVER_CLICKED: 'start_over_clicked',
  CONVERSATION_ABANDONED: 'conversation_abandoned',
  
  // Shared View
  SHARED_CONVERSATION_VIEWED: 'shared_conversation_viewed',
  
  // External Links
  EXTERNAL_LINK_CLICKED: 'external_link_clicked',
} as const;

// Helper to safely access posthog
function getPostHog() {
  if (typeof window === 'undefined') return null;
  return (window as any).posthog;
}

/**
 * Track a handshake quick reply button click
 */
export function trackQuickReplyClick(buttonLabel: string) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.HANDSHAKE_QUICK_REPLY_CLICKED, {
    button_label: buttonLabel,
  });
}

/**
 * Track a chat message being sent
 */
export function trackChatMessage(params: {
  messageNumber: number;
  viewMode: 'handshake' | 'chat' | 'split' | 'cv';
  isChipClick?: boolean;
  chipLabel?: string;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  if (params.isChipClick && params.chipLabel) {
    posthog.capture(EVENTS.CHAT_CHIP_CLICKED, {
      message_number: params.messageNumber,
      view_mode: params.viewMode,
      chip_label: params.chipLabel,
    });
  }
  
  posthog.capture(EVENTS.CHAT_MESSAGE_SENT, {
    message_number: params.messageNumber,
    view_mode: params.viewMode,
    is_chip_click: params.isChipClick || false,
  });
}

/**
 * Track split view being opened
 */
export function trackSplitViewOpened(params: {
  messageCount: number;
  initialTab: 'brief' | 'experience';
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.SPLIT_VIEW_OPENED, {
    message_count: params.messageCount,
    initial_tab: params.initialTab,
  });
}

/**
 * Track artifact tab switching
 */
export function trackTabSwitch(params: {
  fromTab: 'brief' | 'experience';
  toTab: 'brief' | 'experience';
  messageCount: number;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.ARTIFACT_TAB_SWITCHED, {
    from_tab: params.fromTab,
    to_tab: params.toTab,
    message_count: params.messageCount,
  });
}

/**
 * Track share modal opened
 */
export function trackShareModalOpened(params: {
  activeTab: 'brief' | 'experience';
  messageCount: number;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.SHARE_MODAL_OPENED, {
    active_tab: params.activeTab,
    message_count: params.messageCount,
  });
}

/**
 * Track LinkedIn/contact input provided in share modal
 */
export function trackShareContactProvided(params: {
  hasLinkedIn: boolean;
  hasEmail: boolean;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.SHARE_LINKEDIN_INPUT_PROVIDED, {
    has_linkedin: params.hasLinkedIn,
    has_email: params.hasEmail,
  });
}

/**
 * Track share link copied
 */
export function trackShareLinkCopied(params: {
  shareId: string;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.SHARE_LINK_COPIED, {
    share_id: params.shareId,
  });
}

/**
 * Track share PDF downloaded
 */
export function trackSharePdfDownloaded(params: {
  shareId: string;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.SHARE_PDF_DOWNLOADED, {
    share_id: params.shareId,
  });
}

/**
 * Track successful share creation
 */
export function trackShareSuccess(params: {
  shareId: string;
  messageCount: number;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.SHARE_SUCCESS, {
    share_id: params.shareId,
    message_count: params.messageCount,
  });
}

/**
 * Track CV chat widget opened
 */
export function trackCVChatInitiated() {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.CV_CHAT_INITIATED);
}

/**
 * Track CV contact provided (email/LinkedIn)
 */
export function trackCVContactProvided(params: {
  hasLinkedIn: boolean;
  hasEmail: boolean;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture('cv_contact_provided', {
    has_linkedin: params.hasLinkedIn,
    has_email: params.hasEmail,
  });
}

/**
 * Track CV PDF download
 */
export function trackCVPdfDownload() {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.CV_PDF_DOWNLOADED);
}

/**
 * Track contact form submission
 */
export function trackContactFormSent(params: {
  hasEmail: boolean;
  hasLinkedIn: boolean;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.CONTACT_FORM_SENT, {
    has_email: params.hasEmail,
    has_linkedin: params.hasLinkedIn,
  });
}

/**
 * Track start over clicked
 */
export function trackStartOverClicked(params: {
  messageCount: number;
  viewMode: 'chat' | 'split';
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.START_OVER_CLICKED, {
    message_count: params.messageCount,
    view_mode: params.viewMode,
  });
}

/**
 * Track conversation abandoned (user left before reaching split view)
 */
export function trackConversationAbandoned(params: {
  messageCount: number;
  viewMode: 'handshake' | 'chat';
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.CONVERSATION_ABANDONED, {
    message_count: params.messageCount,
    view_mode: params.viewMode,
  });
}

/**
 * Track shared conversation viewed
 */
export function trackSharedConversationViewed(params: {
  shareId: string;
  messageCount: number;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.SHARED_CONVERSATION_VIEWED, {
    share_id: params.shareId,
    message_count: params.messageCount,
  });
}

/**
 * Track external link clicked (e.g., LinkedIn profile)
 */
export function trackExternalLinkClicked(params: {
  linkUrl: string;
  linkLabel: string;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.EXTERNAL_LINK_CLICKED, {
    link_url: params.linkUrl,
    link_label: params.linkLabel,
  });
}

/**
 * Track custom page view (for client-side navigation)
 * Note: PostHog autocapture handles most pageviews, but use this for SPA route changes
 */
export function trackPageView(params: {
  path: string;
  title?: string;
}) {
  const posthog = getPostHog();
  if (!posthog) return;
  
  posthog.capture(EVENTS.PAGE_VIEW, {
    path: params.path,
    title: params.title,
  });
}
