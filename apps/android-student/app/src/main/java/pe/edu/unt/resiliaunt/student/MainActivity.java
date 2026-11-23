package pe.edu.unt.resiliaunt.student;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout errorPanel;
    private String portalHost;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Uri baseUri = Uri.parse(BuildConfig.PORTAL_BASE_URL);
        portalHost = baseUri.getHost();
        if (!"https".equalsIgnoreCase(baseUri.getScheme()) || portalHost == null) {
            showConfigurationError();
            return;
        }

        getWindow().setStatusBarColor(Color.rgb(32, 86, 80));
        getWindow().setNavigationBarColor(Color.WHITE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        createWebView();
        if (savedInstanceState != null && webView.restoreState(savedInstanceState) != null) {
            // Conserva la navegación al rotar o recrear la actividad.
        } else {
            loadStudentPortal();
        }
    }

    private void createWebView() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(245, 247, 250));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookies.setAcceptThirdPartyCookies(webView, false);
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("https".equalsIgnoreCase(scheme) && portalHost.equalsIgnoreCase(uri.getHost())) {
                    return false;
                }
                if ("https".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme)
                        || "tel".equalsIgnoreCase(scheme)) {
                    openExternal(uri);
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                errorPanel.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showConnectionError();
                }
            }
        });

        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        root.addView(progressBar, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, 6, Gravity.TOP
        ));

        errorPanel = createErrorPanel();
        root.addView(errorPanel, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));
        errorPanel.setVisibility(View.GONE);

        setContentView(root);
    }

    private LinearLayout createErrorPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(36, 36, 36, 36);
        panel.setBackgroundColor(Color.rgb(245, 247, 250));

        TextView title = new TextView(this);
        title.setText("No se pudo conectar");
        title.setTextColor(Color.rgb(23, 33, 43));
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(null, android.graphics.Typeface.BOLD);

        TextView message = new TextView(this);
        message.setText("Comprueba tu conexión a internet e inténtalo nuevamente.");
        message.setTextColor(Color.rgb(102, 112, 133));
        message.setTextSize(14);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, 12, 0, 20);

        Button retry = new Button(this);
        retry.setText("Reintentar");
        retry.setAllCaps(false);
        retry.setOnClickListener(view -> loadStudentPortal());

        panel.addView(title);
        panel.addView(message);
        panel.addView(retry);
        return panel;
    }

    private void loadStudentPortal() {
        errorPanel.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        progressBar.setVisibility(View.VISIBLE);
        String startUrl = BuildConfig.PORTAL_BASE_URL + "/login?next=%2Fmovil%2Festudiante";
        webView.loadUrl(startUrl);
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // No hay una aplicación externa disponible para este enlace.
        }
    }

    private void showConnectionError() {
        progressBar.setVisibility(View.GONE);
        webView.setVisibility(View.GONE);
        errorPanel.setVisibility(View.VISIBLE);
    }

    private void showConfigurationError() {
        TextView error = new TextView(this);
        error.setText("La dirección de ResiliaUNT debe usar HTTPS. Revisa resiliauntPortalUrl en Gradle.");
        error.setTextSize(16);
        error.setTextColor(Color.rgb(23, 33, 43));
        error.setGravity(Gravity.CENTER);
        error.setPadding(32, 32, 32, 32);
        setContentView(error);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) {
            webView.saveState(outState);
        }
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
