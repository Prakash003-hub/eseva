// Notification Manager for Subi e-Sevai
// Tracks newly added Home posts, Application forms, Job alerts, and Announcements

const STORAGE_KEY = 'subi_seen_records';
const NOTIFICATION_PERMISSION_KEY = 'subi_push_enabled';

export function getSeenState() {
  if (typeof window === 'undefined') return { posts: [], forms: [], jobs: [], announcements: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { posts: [], forms: [], jobs: [], announcements: [], initialized: false };
    const parsed = JSON.parse(raw);
    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      forms: Array.isArray(parsed.forms) ? parsed.forms : [],
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
      initialized: true
    };
  } catch (err) {
    console.error('[NotificationManager] Error reading storage:', err);
    return { posts: [], forms: [], jobs: [], announcements: [], initialized: false };
  }
}

export function saveSeenState(state) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      posts: state.posts || [],
      forms: state.forms || [],
      jobs: state.jobs || [],
      announcements: state.announcements || [],
      initialized: true,
      lastUpdated: Date.now()
    }));
  } catch (err) {
    console.error('[NotificationManager] Error saving storage:', err);
  }
}

function formatNotificationDate(rawDate) {
  if (!rawDate) return 'Recently';
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return String(rawDate);
    const now = new Date();
    const diffMs = now - d;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1 && diffHours >= 0) return 'Just now';
    if (diffHours < 24 && diffHours > 0) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(rawDate);
  }
}

// Computes unread counts and formats a unified feed of notifications
export function computeNotifications(posts = [], forms = [], jobs = [], announcements = []) {
  const seen = getSeenState();

  // If this is the user's first visit, initialize seen state to avoid overwhelming them,
  // but leave the latest 1 item in each category as a "New" sample
  if (!seen.initialized) {
    const postIds = posts.map(p => String(p.id || p.title));
    const formIds = forms.map(f => String(f.id || f.title));
    const jobIds = jobs.map(j => String(j.id || j.title));
    const annIds = announcements.map(a => String(a.id || a.title));

    // Keep the most recent 1 item unread for exploration
    const initSeen = {
      posts: postIds.slice(1),
      forms: formIds.slice(1),
      jobs: jobIds.slice(1),
      announcements: annIds.slice(1),
      initialized: true
    };
    saveSeenState(initSeen);
    return computeNotifications(posts, forms, jobs, announcements);
  }

  const seenPosts = new Set(seen.posts);
  const seenForms = new Set(seen.forms);
  const seenJobs = new Set(seen.jobs);
  const seenAnnouncements = new Set(seen.announcements);

  const notifications = [];

  // 1. Home Posts
  posts.forEach(p => {
    const key = String(p.id || p.title);
    const isNew = !seenPosts.has(key);
    notifications.push({
      id: `post_${key}`,
      rawId: p.id,
      category: 'home',
      categoryLabel: 'Home Update',
      categoryBadge: '🏠 Home',
      title: p.title || 'New Announcement Posted',
      description: p.description || p.content || '',
      date: formatNotificationDate(p.created_at || p.date),
      isNew,
      actionTab: 'home',
      linkUrl: `/user?tab=home#post-${p.id}`
    });
  });

  // 2. Application Services / Forms
  forms.forEach(f => {
    const key = String(f.id || f.title);
    const isNew = !seenForms.has(key);
    notifications.push({
      id: `form_${key}`,
      rawId: f.id,
      category: 'apply',
      categoryLabel: 'E-Sevai Service',
      categoryBadge: '📝 Apply',
      title: f.title || f.service_name || 'New Application Form',
      description: f.description || `Apply for ${f.title} online`,
      date: formatNotificationDate(f.created_at || f.date),
      isNew,
      actionTab: 'apply',
      linkUrl: `/user?tab=apply&formId=${f.id}`
    });
  });

  // 3. Job Alerts
  jobs.forEach(j => {
    const key = String(j.id || j.title);
    const isNew = !seenJobs.has(key);
    notifications.push({
      id: `job_${key}`,
      rawId: j.id,
      category: 'jobs',
      categoryLabel: 'Job Alert',
      categoryBadge: '💼 Job Alert',
      title: j.title || 'New Vacancy Announcement',
      description: j.description || j.short_desc || `Recruitment: ${j.title}`,
      date: formatNotificationDate(j.created_at || j.date || j.last_date),
      isNew,
      actionTab: 'jobs',
      linkUrl: `/user?tab=jobs&jobId=${j.id}`
    });
  });

  // 4. Announcements / Ads
  announcements.forEach(a => {
    const key = String(a.id || a.title);
    const isNew = !seenAnnouncements.has(key);
    notifications.push({
      id: `ann_${key}`,
      rawId: a.id,
      category: 'announcements',
      categoryLabel: 'Notice',
      categoryBadge: '📢 Alert',
      title: a.title || 'Official Notice',
      description: a.message || a.content || '',
      date: formatNotificationDate(a.created_at || a.date),
      isNew,
      actionTab: 'home',
      linkUrl: `/user?tab=home`
    });
  });

  // Sort: Newest / Unread items first
  notifications.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));

  const unreadCounts = {
    home: notifications.filter(n => n.category === 'home' && n.isNew).length,
    apply: notifications.filter(n => n.category === 'apply' && n.isNew).length,
    jobs: notifications.filter(n => n.category === 'jobs' && n.isNew).length,
    announcements: notifications.filter(n => n.category === 'announcements' && n.isNew).length
  };
  unreadCounts.total = unreadCounts.home + unreadCounts.apply + unreadCounts.jobs + unreadCounts.announcements;

  return { notifications, unreadCounts };
}

// Mark all items of a particular category as seen
export function markCategorySeen(category, items = []) {
  const seen = getSeenState();
  const catKey = category === 'home' ? 'posts' : category;
  if (!seen[catKey]) seen[catKey] = [];

  const existing = new Set(seen[catKey]);
  items.forEach(it => {
    const k = String(it.id || it.title || it.rawId);
    if (k) existing.add(k);
  });

  seen[catKey] = Array.from(existing);
  saveSeenState(seen);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('subi-notifications-updated'));
  }
}

// Mark all items as seen
export function markAllSeen(posts = [], forms = [], jobs = [], announcements = []) {
  saveSeenState({
    posts: posts.map(p => String(p.id || p.title)),
    forms: forms.map(f => String(f.id || f.title)),
    jobs: jobs.map(j => String(j.id || j.title)),
    announcements: announcements.map(a => String(a.id || a.title)),
    initialized: true
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('subi-notifications-updated'));
  }
}

// Request Native Web Push / Mobile Browser Notification Permission
export async function requestMobileNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
      sendDeviceNotification(
        '🔔 Subi e-Sevai Notifications Active!',
        'You will now receive automatic notifications whenever new services or jobs are posted.'
      );
    }
    return permission;
  } catch (err) {
    console.error('[NotificationManager] Permission error:', err);
    return 'denied';
  }
}

// Check if device push notifications are enabled
export function isMobileNotificationEnabled() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

// Send native mobile device / browser notification
export function sendDeviceNotification(title, body, url = '/') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    // Try service worker notification first (better on mobile Android)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon: '/whatsbro_logo.png',
          badge: '/favicon.png',
          vibrate: [200, 100, 200],
          tag: 'subi-notification',
          renotify: true,
          data: { url: url || '/' }
        });
      }).catch(() => {
        new Notification(title, { body, icon: '/whatsbro_logo.png' });
      });
    } else {
      new Notification(title, { body, icon: '/whatsbro_logo.png' });
    }
  } catch (err) {
    console.warn('[NotificationManager] Native notification error:', err);
  }
}

// Play notification sound
export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio('/click-sound.wav');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (err) {
    // Audio autoplay might be blocked
  }
}
