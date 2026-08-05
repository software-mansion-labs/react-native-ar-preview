package com.arpreview

import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class ArPreviewModule(reactContext: ReactApplicationContext) :
  NativeArPreviewSpec(reactContext) {

  override fun isARAvailable(promise: Promise) {
    val intent = buildSceneViewerIntent(PROBE_MODEL_URL)
    val resolved = intent.resolveActivity(reactApplicationContext.packageManager)
    promise.resolve(resolved != null)
  }

  override fun openAR(url: String, promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject(E_LAUNCH_FAILED, "No activity available to launch from")
      return
    }
    val intent = buildSceneViewerIntent(url)
    if (intent.resolveActivity(reactApplicationContext.packageManager) == null) {
      promise.reject(E_AR_UNAVAILABLE, "Scene Viewer is not available on this device")
      return
    }
    try {
      activity.startActivity(intent)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject(E_LAUNCH_FAILED, error.message, error)
    }
  }

  private fun buildSceneViewerIntent(url: String): Intent {
    val uri = Uri.parse("https://arvr.google.com/scene-viewer/1.0")
      .buildUpon()
      .appendQueryParameter("file", url)
      .appendQueryParameter("mode", "ar_preferred")
      .build()
    return Intent(Intent.ACTION_VIEW).apply {
      data = uri
      setPackage("com.google.ar.core")
    }
  }

  companion object {
    const val NAME = NativeArPreviewSpec.NAME
    private const val E_AR_UNAVAILABLE = "E_AR_UNAVAILABLE"
    private const val E_LAUNCH_FAILED = "E_LAUNCH_FAILED"
    private const val PROBE_MODEL_URL = "https://example.com/probe.glb"
  }
}
