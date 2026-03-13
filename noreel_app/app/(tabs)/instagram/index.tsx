import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Linking, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import WebView from 'react-native-webview';
import { useSettings } from '@/providers/settings-context';
import { useScreenTime, checkMilestones } from '@/hooks/useScreenTime';

const INSTAGRAM_URL = 'https://www.instagram.com/';

const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const IG_BG_DARK = '#000000';
const IG_BG_LIGHT = '#FAFAFA';

// Pre-load script. INJECTED_JS_BEFORE is safe; buildInjectedJS/injectedJavaScript prop
// was found to break infinite scroll (any post-load injection disrupts Instagram's init).
const INJECTED_JS_BEFORE = `
(function() {
  // Hide the reels tab from Instagram's bottom nav bar.
  var style = document.createElement('style');
  style.textContent = 'a[href="/reels/"], a[href="/reels"] { display: none !important; }';
  document.documentElement.appendChild(style);

  // Dark mode class before content renders to avoid flash.
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('__fb-dark-mode');
    document.documentElement.classList.remove('__fb-light-mode');
  }

  // Fix WKWebView IO throttling: IntersectionObserver callbacks are suppressed during
  // active touch scroll, so Instagram's Relay sentinel never fires → white space.
  // Patch: fire the callback immediately when observe() is called (after a short yield).
  // Instagram creates a new IO sentinel right after each batch of posts loads, so firing
  // on observe() triggers loadMore() before the user has scrolled anywhere near the end.
  // Relay's loadMore is idempotent — duplicate/early calls are safely ignored.
  // Intercept history.pushState so React Native gets URL changes immediately
  // (onNavigationStateChange fires late; pushState fires synchronously).
  var _origPushState = history.pushState.bind(history);
  history.pushState = function(state, title, url) {
    _origPushState(state, title, url);
    try {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'urlChange', url: String(url || location.href) })
      );
    } catch(e) {}
  };

  if (typeof IntersectionObserver !== 'undefined') {
    var _NativeIO = IntersectionObserver;
    var _PatchedIO = function(cb, options) {
      var opts = options ? Object.assign({}, options) : {};
      if (!opts.root) opts.rootMargin = '0px 0px 3000px 0px';
      var io = new _NativeIO(cb, opts);
      var _origObserve = io.observe.bind(io);
      io.observe = function(el) {
        _origObserve(el);
        var tag = (el.tagName || '').toLowerCase();
        if (tag !== 'img' && tag !== 'video' && tag !== 'source' && tag !== 'picture') {
          setTimeout(function() {
            try {
              var r = el.getBoundingClientRect();
              cb([{
                target: el, isIntersecting: true, intersectionRatio: 1,
                boundingClientRect: r, intersectionRect: r,
                rootBounds: { top: 0, left: 0, right: window.innerWidth,
                  bottom: window.innerHeight, width: window.innerWidth,
                  height: window.innerHeight, x: 0, y: 0 },
                time: performance.now()
              }], io);
            } catch(e) {}
          }, 100);
        }
      };
      return io;
    };
    _PatchedIO.prototype = _NativeIO.prototype;
    try { Object.defineProperty(_PatchedIO, 'prototype', { writable: false }); } catch(e) {}
    window.IntersectionObserver = _PatchedIO;
  }
})();
true;
`;

// Measure the CSS safe-area-inset-bottom from inside the WebView (useSafeAreaInsets().bottom
// returns 0 inside NativeTabs, so JS measurement is the only reliable approach).
const SAFE_AREA_MEASURE_JS = `
(function() {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden;';
  document.documentElement.appendChild(el);
  var sab = parseFloat(getComputedStyle(el).paddingBottom) || 0;
  document.documentElement.removeChild(el);
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: 'safeAreaBottom', value: sab })
  );
})();
true;
`;

export default function InstagramTab() {
  const theme = useColorScheme();
  const { top } = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const loadingOpacity = useRef(new Animated.Value(1)).current;
  const { hideExploreGrid } = useSettings();
  const { addTime } = useScreenTime();
  const sessionStart = useRef<number | null>(null);
  const [showExploreOverlay, setShowExploreOverlay] = useState(false);
  const [safeAreaBottom, setSafeAreaBottom] = useState(34);
  const isOnExplorePage = useRef(false);

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
    <View style={[StyleSheet.absoluteFill, { top, bottom: 56 + safeAreaBottom }]}>
      <WebView
        ref={webViewRef}
        source={{ uri: INSTAGRAM_URL }}
        style={[{ flex: 1 }, { backgroundColor: theme === 'dark' ? IG_BG_DARK : IG_BG_LIGHT }]}
        userAgent={USER_AGENT}
        injectedJavaScriptBeforeContentLoaded={INJECTED_JS_BEFORE}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url.toLowerCase();

          if (/instagram\.com\/reels\/?(\?|$)/.test(url)) {
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
          // Match only the explore root, not sub-pages like /explore/search/
          const onExplore = /instagram\.com\/explore\/?(\?|$)/i.test(state.url);
          isOnExplorePage.current = onExplore;
          if (hideExploreGrid) {
            setShowExploreOverlay(onExplore);
          }
        }}
        onLoad={() => {
          webViewRef.current?.injectJavaScript(SAFE_AREA_MEASURE_JS);
        }}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'safeAreaBottom') {
              setSafeAreaBottom(msg.value);
            } else if (msg.type === 'urlChange' && hideExploreGrid) {
              // pushState url can be relative (/explore/) or absolute
              const onExplore =
                /instagram\.com\/explore\/?(\?|$)/i.test(msg.url) ||
                /^\/explore\/?(\?|$)/.test(msg.url);
              isOnExplorePage.current = onExplore;
              setShowExploreOverlay(onExplore);
            }
          } catch {}
        }}
        onLoadProgress={handleLoadProgress}
        onContentProcessDidTerminate={() => webViewRef.current?.reload()}
        decelerationRate='normal'
        allowsBackForwardNavigationGestures
        keyboardDisplayRequiresUserAction={true}
        hideKeyboardAccessoryView
        contentMode='mobile'
        cacheEnabled
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustsScrollIndicatorInsets={false}

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
      {showExploreOverlay && (
        <View
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            bottom: 49,
            backgroundColor: theme === 'dark' ? IG_BG_DARK : IG_BG_LIGHT,
          }}
          pointerEvents='box-only'
        />
      )}
    </View>
  );
}
