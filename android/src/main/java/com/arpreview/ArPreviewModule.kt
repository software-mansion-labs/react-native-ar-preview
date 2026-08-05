package com.arpreview

import com.facebook.react.bridge.ReactApplicationContext

class ArPreviewModule(reactContext: ReactApplicationContext) :
  NativeArPreviewSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeArPreviewSpec.NAME
  }
}
