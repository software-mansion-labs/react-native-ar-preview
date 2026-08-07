package com.arpreview

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri

class SceneViewerLauncher(
  private val packageManager: PackageManager,
  private val activityProvider: () -> Activity?
) {

  private var launchInFlight = false

  fun isAvailable(): Boolean =
    buildIntent(PROBE_MODEL_URL).resolveActivity(packageManager) != null

  fun notifyHostResumed() {
    launchInFlight = false
  }

  fun launch(
    url: String,
    scale: String? = null,
    link: String? = null,
    onLaunched: () -> Unit,
    onFailed: (code: String, message: String?, error: Throwable?) -> Unit
  ) {
    if (launchInFlight) {
      onLaunched()
      return
    }
    val activity = activityProvider()
    if (activity == null) {
      onFailed(E_LAUNCH_FAILED, "No activity available to launch from", null)
      return
    }
    val intent = buildIntent(url, scale, link)
    if (intent.resolveActivity(packageManager) == null) {
      onFailed(E_AR_UNAVAILABLE, "Scene Viewer is not available on this device", null)
      return
    }
    try {
      activity.startActivity(intent)
      launchInFlight = true
      onLaunched()
    } catch (error: Exception) {
      onFailed(E_LAUNCH_FAILED, error.message, error)
    }
  }

  companion object {
    const val E_AR_UNAVAILABLE = "E_AR_UNAVAILABLE"
    const val E_LAUNCH_FAILED = "E_LAUNCH_FAILED"
    private const val PROBE_MODEL_URL = "https://example.com/probe.glb"

    fun buildIntent(url: String, scale: String? = null, link: String? = null): Intent {
      val builder = Uri.parse("https://arvr.google.com/scene-viewer/1.0")
        .buildUpon()
        .appendQueryParameter("file", url)
        .appendQueryParameter("mode", "ar_preferred")
      if (scale == "fixed") {
        builder.appendQueryParameter("resizable", "false")
      }
      if (link != null) {
        builder.appendQueryParameter("link", link)
      }
      return Intent(Intent.ACTION_VIEW).apply {
        data = builder.build()
        setPackage("com.google.ar.core")
      }
    }
  }
}
