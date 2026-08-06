package com.arpreview

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class ArPreviewModule(reactContext: ReactApplicationContext) :
  NativeArPreviewSpec(reactContext) {

  private val launcher = SceneViewerLauncher(reactContext.packageManager) { currentActivity }

  override fun isARAvailable(promise: Promise) {
    promise.resolve(launcher.isAvailable())
  }

  override fun openAR(url: String, promise: Promise) {
    launcher.launch(
      url,
      onLaunched = { promise.resolve(null) },
      onFailed = { code, message, error -> promise.reject(code, message, error) }
    )
  }

  companion object {
    const val NAME = NativeArPreviewSpec.NAME
  }
}
