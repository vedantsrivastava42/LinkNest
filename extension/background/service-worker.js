/**
 * Extension background service worker.
 * Handles context menu, badge updates, and session management.
 */

import { getClient, getSession } from "../../lib/adapters/extension/auth.js";

// === Context Menu ===
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-bookmark",
    title: "Save to LinkNest",
    contexts: ["page", "link"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "save-bookmark") return;

  const url = info.linkUrl || info.pageUrl || tab?.url;
  const title = tab?.title || url;

  if (!url) return;

  // Send message to popup or handle directly
  try {
    // Store the bookmark intent — popup will pick it up
    await chrome.storage.local.set({
      pendingBookmark: { url, title, timestamp: Date.now() },
    });

    // Try to notify the popup if it's open
    chrome.runtime.sendMessage({
      type: "QUICK_SAVE",
      payload: { url, title },
    }).catch(() => {
      // Popup not open — that's fine, it'll pick up pendingBookmark on open
    });

    // Show a badge
    chrome.action.setBadgeText({ text: "+1", tabId: tab?.id });
    chrome.action.setBadgeBackgroundColor({
      color: "#e8590c",
      tabId: tab?.id,
    });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "", tabId: tab?.id });
    }, 2000);
  } catch (err) {
    console.error("Context menu save error:", err);
  }
});

// === Handle messages from popup / content script ===
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_CURRENT_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      sendResponse({
        url: tab?.url || "",
        title: tab?.title || "",
        favIconUrl: tab?.favIconUrl || "",
      });
    });
    return true; // async response
  }

  if (message.type === "CLEAR_PENDING") {
    chrome.storage.local.remove("pendingBookmark");
    sendResponse({ ok: true });
    return false;
  }

  // === OAuth Sign-In (runs in background so popup close doesn't kill it) ===
  if (message.type === "SIGN_IN") {
    handleSignIn(message.provider || "google")
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ error: err.message || String(err) }));
    return true; // async response
  }
});

/**
 * Perform the full OAuth flow in the background service worker.
 * Uses implicit flow so tokens arrive directly in the URL hash.
 */
async function handleSignIn(provider) {
  const supabase = getClient();

  const redirectUrl = chrome.identity.getRedirectURL();
  console.log("Extension redirect URL (add to Supabase):", redirectUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    throw new Error(error?.message || "Failed to get OAuth URL");
  }

  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: data.url, interactive: true },
      (url) => {
        if (chrome.runtime.lastError || !url) {
          reject(chrome.runtime.lastError || new Error("Auth cancelled"));
        } else {
          resolve(url);
        }
      }
    );
  });

  // Extract tokens from hash fragment (implicit flow)
  const url = new URL(responseUrl);
  const params = new URLSearchParams(url.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    throw new Error("No tokens found in redirect URL");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    throw sessionError;
  }
}

// === Session refresh alarm ===
chrome.alarms.create("refresh-session", { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "refresh-session") return;

  try {
    await getSession();
  } catch {
    // Session refresh failed — user will need to re-auth
  }
});
