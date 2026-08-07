package com.arpreview

import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class ArPreviewModule(reactContext: ReactApplicationContext) :
  NativeArPreviewSpec(reactContext), LifecycleEventListener {

  private val launcher = SceneViewerLauncher(reactContext.packageManager) { currentActivity }

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun onHostResume() {
    launcher.notifyHostResumed()
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() = Unit

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    super.invalidate()
  }

  override fun isARAvailable(promise: Promise) {
    promise.resolve(launcher.isAvailable())
  }

  override fun openAR(url: String, scale: String?, link: String?, promise: Promise) {
    launcher.launch(
      url,
      scale,
      link,
      onLaunched = { promise.resolve(null) },
      onFailed = { code, message, error -> promise.reject(code, message, error) }
    )
  }

  companion object {
    const val NAME = NativeArPreviewSpec.NAME
  }
}
