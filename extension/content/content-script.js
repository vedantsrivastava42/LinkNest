/**
 * Content script — injected into every page.
 * Listens for messages from the extension to grab page metadata.
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PAGE_INFO") {
    const getMetaContent = (name) => {
      const el =
        document.querySelector(`meta[property="${name}"]`) ||
        document.querySelector(`meta[name="${name}"]`);
      return el?.getAttribute("content") || "";
    };

    sendResponse({
      url: window.location.href,
      title: document.title,
      description:
        getMetaContent("og:description") || getMetaContent("description"),
      siteName: getMetaContent("og:site_name"),
      favicon:
        document.querySelector('link[rel="icon"]')?.href ||
        document.querySelector('link[rel="shortcut icon"]')?.href ||
        `${window.location.origin}/favicon.ico`,
    });
    return false;
  }
});
