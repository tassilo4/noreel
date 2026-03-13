import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Linking, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import WebView from 'react-native-webview';
import { useSettings } from '@/providers/settings-context';
import { useScreenTime, checkMilestones } from '@/hooks/useScreenTime';

const INSTAGRAM_URL = 'https://www.instagram.com/';
const BLOCKED_PATTERNS = ['/reels', '/reel/'];

const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const IG_BG_DARK = '#000000';
const IG_BG_LIGHT = '#FAFAFA';

const INJECTED_JS_BEFORE = `
(function() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('__fb-dark-mode');
    document.documentElement.classList.remove('__fb-light-mode');
  }

  var link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://static.cdninstagram.com';
  link.crossOrigin = 'anonymous';
  document.documentElement.appendChild(link);

  var style = document.createElement('style');
  style.textContent = [
    'a[href="/reels/"], a[href="/reels"] { display: none !important; }',
    '* { -webkit-tap-highlight-color: transparent !important; }',
    '* { -webkit-touch-callout: none !important; }',
    '* { -webkit-overflow-scrolling: touch; }',
    'body { overscroll-behavior-y: none; }',
    ':focus { outline: none !important; box-shadow: none !important; }',
    'div, p, span, h1, h2, h3, img, video { -webkit-user-select: none; user-select: none; }',
    'input, textarea, [contenteditable] { -webkit-user-select: text !important; user-select: text !important; }',
    'input, select, textarea { font-size: max(16px, 1em) !important; }',
    '[data-pagelet="LoggedInAppBanner"], [data-pagelet="AppBanner"] { display: none !important; }',
  ].join('\\n');
  document.documentElement.appendChild(style);

  document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, true);
})();
true;
`;

function buildInjectedJS(hideSponsored: boolean, hideExploreGrid: boolean) { return `
(function() {
  function hideReels() {
    document.querySelectorAll('svg[aria-label="Reels"]').forEach(function(svg) {
      var link = svg.closest('a');
      if (link) {
        link.style.setProperty('display', 'none', 'important');
        if (link.parentElement) link.parentElement.style.setProperty('display', 'none', 'important');
      }
    });
    document.querySelectorAll('a[href="/reels/"], a[href="/reels"]').forEach(function(el) {
      el.style.setProperty('display', 'none', 'important');
      if (el.parentElement) el.parentElement.style.setProperty('display', 'none', 'important');
    });
    document.querySelectorAll('article a[href*="/reel/"]').forEach(function(el) {
      var article = el.closest('article');
      if (article) article.style.setProperty('display', 'none', 'important');
    });
  }

  var shouldHideSponsored = ${hideSponsored};
  var shouldHideExploreGrid = ${hideExploreGrid};

  var _lastExploreShow = null;
  var _inputFocused = false;

  function updateExploreGrid() {
    var onExplore = window.location.pathname.startsWith('/explore');
    var searchInput = document.querySelector('input[aria-label="Search input"]') ||
                      document.querySelector('input[type="text"]');
    var isActive = _inputFocused || !!(searchInput && searchInput.value && searchInput.value.trim().length > 0);
    var shouldShow = shouldHideExploreGrid && onExplore && !isActive;
    if (shouldShow === _lastExploreShow) return;
    _lastExploreShow = shouldShow;

    var navTop = 60;
    var navBottom = 49;
    try {
      var main = document.querySelector('main') || document.querySelector('[role="main"]');
      var topNav = main ? main.querySelector('nav') : null;
      if (topNav) { var tnr = topNav.getBoundingClientRect(); if (tnr.bottom > 0) navTop = Math.round(tnr.bottom); }
      // Find the bottom nav by walking up from the home link
      var homeLink = document.querySelector('a[href="/"]');
      if (homeLink) {
        var cur = homeLink;
        for (var k = 0; k < 6; k++) {
          if (!cur.parentElement) break;
          cur = cur.parentElement;
          var cr = cur.getBoundingClientRect();
          if (cr.width > window.innerWidth * 0.8 && cr.top > window.innerHeight * 0.5 && cr.height > 0) {
            navBottom = Math.round(window.innerHeight - cr.top);
            break;
          }
        }
      }
    } catch(e) {}
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'explore', show: shouldShow, navTop: navTop, navBottom: navBottom })
    );
  }

  document.addEventListener('focus', function(e) {
    if (e.target && e.target.tagName === 'INPUT') { _inputFocused = true; updateExploreGrid(); }
  }, true);
  document.addEventListener('blur', function(e) {
    if (e.target && e.target.tagName === 'INPUT') { _inputFocused = false; setTimeout(updateExploreGrid, 300); }
  }, true);
  document.addEventListener('input', function(e) { if (e.target && e.target.tagName === 'INPUT') updateExploreGrid(); }, true);
  function hideSponsoredPosts() {
    if (!shouldHideSponsored) return;
    document.querySelectorAll('article').forEach(function(article) {
      if (article.dataset.noreelChecked) return;
      article.dataset.noreelChecked = '1';

      var isAd = false;

      var els = article.querySelectorAll('span, a');
      for (var i = 0; i < els.length; i++) {
        var t = els[i].childElementCount === 0 && els[i].textContent.trim();
        if (t === 'Ad' || t === 'Sponsored') { isAd = true; break; }
      }

      if (!isAd && article.querySelector('._aarz')) isAd = true;
      if (!isAd && article.querySelector('a[href*="enable_persistent_cta"]')) isAd = true;

      if (isAd) article.style.setProperty('display', 'none', 'important');
    });
  }

  var originalPushState = history.pushState.bind(history);
  history.pushState = function(state, title, url) {
    if (url && url.toString().toLowerCase().includes('/reels')) return;
    var result = originalPushState(state, title, url);
    setTimeout(updateExploreGrid, 100);
    return result;
  };

  var originalReplaceState = history.replaceState.bind(history);
  history.replaceState = function(state, title, url) {
    if (url && url.toString().toLowerCase().includes('/reels')) return;
    var result = originalReplaceState(state, title, url);
    setTimeout(updateExploreGrid, 100);
    return result;
  };

  // Pre-trigger Instagram's infinite scroll before user hits the bottom
  (function() {
    var THRESHOLD = 2000;
    var lastTriggered = 0;
    var COOLDOWN = 1500;
    function checkPreload() {
      var now = Date.now();
      if (now - lastTriggered < COOLDOWN) return;
      var distFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (distFromBottom < THRESHOLD && distFromBottom > 0) {
        lastTriggered = now;
        setTimeout(function() { window.dispatchEvent(new Event('scroll')); }, 100);
      }
    }
    window.addEventListener('scroll', checkPreload, { passive: true });
  })();

  function runAll() {
    hideReels();
    hideSponsoredPosts();
    updateExploreGrid();
  }

  runAll();
  var observer = new MutationObserver(runAll);
  observer.observe(document.body, { childList: true, subtree: true });

  // Poll every 500ms to catch tab switches where no pushState/DOM change fires
  setInterval(updateExploreGrid, 500);
  window.addEventListener('popstate', function() { setTimeout(updateExploreGrid, 50); });
})();
true;
`; }

export default function InstagramTab() {
  const theme = useColorScheme();
  const { top } = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const loadingOpacity = useRef(new Animated.Value(1)).current;
  const { hideSponsored, hideExploreGrid } = useSettings();
  const { addTime } = useScreenTime();
  const sessionStart = useRef<number | null>(null);
  const [exploreOverlay, setExploreOverlay] = useState({ show: false, navTop: 60, navBottom: 49 });

  useEffect(() => {
    webViewRef.current?.injectJavaScript(buildInjectedJS(hideSponsored, hideExploreGrid));
  }, [hideSponsored]);

  useFocusEffect(
    useCallback(() => {
      sessionStart.current = Date.now();

      const subscription = AppState.addEventListener('change', (nextState) => {
        if ((nextState === 'background' || nextState === 'inactive') && sessionStart.current !== null) {
          const elapsed = Math.floor((Date.now() - sessionStart.current) / 1000);
          addTime(elapsed);
          checkMilestones(elapsed);
          sessionStart.current = null;
        } else if (nextState === 'active' && sessionStart.current === null) {
          sessionStart.current = Date.now();
        }
      });

      return () => {
        if (sessionStart.current !== null) {
          const elapsed = Math.floor((Date.now() - sessionStart.current) / 1000);
          addTime(elapsed);
          checkMilestones(elapsed);
          sessionStart.current = null;
        }
        subscription.remove();
      };
    }, [addTime])
  );

  function handleMessage({ nativeEvent }: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(nativeEvent.data);
      if (msg.type === 'explore') {
        setExploreOverlay({ show: !!msg.show, navTop: msg.navTop ?? 60, navBottom: msg.navBottom ?? 49 });
      }
    } catch {}
  }

  function handleLoadProgress({ nativeEvent }: { nativeEvent: { progress: number } }) {
    if (nativeEvent.progress >= 0.8) {
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }

  return (
    <View style={[StyleSheet.absoluteFill, { top }]}>
      <WebView
        ref={webViewRef}
        source={{ uri: INSTAGRAM_URL }}
        style={[{ flex: 1 }, { backgroundColor: theme === 'dark' ? IG_BG_DARK : IG_BG_LIGHT }]}
        userAgent={USER_AGENT}
        injectedJavaScriptBeforeContentLoaded={INJECTED_JS_BEFORE}
        injectedJavaScript={buildInjectedJS(hideSponsored, hideExploreGrid)}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url.toLowerCase();

          if (BLOCKED_PATTERNS.some((p) => url.includes(p))) {
            webViewRef.current?.goBack();
            return false;
          }

          const isInternal =
            url.startsWith('about:') ||
            url.startsWith('data:') ||
            url.includes('instagram.com') ||
            url.includes('cdninstagram.com') ||
            url.includes('facebook.com');
          if (!isInternal) {
            Linking.openURL(request.url);
            return false;
          }

          return true;
        }}
        onNavigationStateChange={(state) => {
          if (state.url.toLowerCase().includes('/reels')) {
            webViewRef.current?.goBack();
          }
        }}
        onMessage={handleMessage}
        onLoadProgress={handleLoadProgress}
        onContentProcessDidTerminate={() => webViewRef.current?.reload()}
        decelerationRate='normal'
        allowsBackForwardNavigationGestures
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView
        contentMode='mobile'
        cacheEnabled
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: loadingOpacity, backgroundColor: theme === 'dark' ? IG_BG_DARK : IG_BG_LIGHT },
        ]}
        pointerEvents='none'
      >
        <ActivityIndicator
          size='large'
          color={theme === 'dark' ? '#ffffff' : '#000000'}
          style={{ flex: 1 }}
        />
      </Animated.View>
      {exploreOverlay.show && (
        <View
          style={{
            position: 'absolute',
            top: exploreOverlay.navTop,
            left: 0,
            right: 0,
            bottom: exploreOverlay.navBottom,
            backgroundColor: theme === 'dark' ? IG_BG_DARK : IG_BG_LIGHT,
          }}
          pointerEvents='box-only'
        />
      )}
    </View>
  );
}
