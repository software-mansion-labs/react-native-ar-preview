package com.arpreview

import android.app.Activity
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class ArPreviewModuleTest {

  private val packageManager: PackageManager = mock(PackageManager::class.java)
  private val context: ReactApplicationContext = mock(ReactApplicationContext::class.java)
  private val promise: Promise = mock(Promise::class.java)
  private lateinit var activity: Activity
  private lateinit var module: ArPreviewModule

  @Before
  fun setUp() {
    activity = Robolectric.buildActivity(Activity::class.java).setup().get()
    `when`(context.packageManager).thenReturn(packageManager)
    `when`(context.currentActivity).thenReturn(activity)
    `when`(packageManager.resolveActivity(any(Intent::class.java), anyInt()))
      .thenReturn(sceneViewerResolveInfo())
    module = ArPreviewModule(context)
  }

  private fun sceneViewerResolveInfo() = ResolveInfo().apply {
    activityInfo = ActivityInfo().apply {
      packageName = "com.google.ar.core"
      name = "SceneViewerActivity"
      applicationInfo = ApplicationInfo().apply { packageName = "com.google.ar.core" }
    }
  }

  @Test
  fun `options are forwarded into the scene viewer intent`() {
    module.openAR(MODEL_URL, "fixed", PRODUCT_LINK, promise)

    val started = shadowOf(activity).nextStartedActivity
    assertEquals("com.google.ar.core", started.`package`)
    assertEquals(MODEL_URL, started.data?.getQueryParameter("file"))
    assertEquals("ar_preferred", started.data?.getQueryParameter("mode"))
    assertEquals("false", started.data?.getQueryParameter("resizable"))
    assertEquals(PRODUCT_LINK, started.data?.getQueryParameter("link"))
    verify(promise).resolve(null)
  }

  @Test
  fun `a call without options builds the intent exactly as before`() {
    module.openAR(MODEL_URL, null, null, promise)

    val started = shadowOf(activity).nextStartedActivity
    assertEquals("com.google.ar.core", started.`package`)
    assertEquals(MODEL_URL, started.data?.getQueryParameter("file"))
    assertEquals("ar_preferred", started.data?.getQueryParameter("mode"))
    assertNull(started.data?.getQueryParameter("resizable"))
    assertNull(started.data?.getQueryParameter("link"))
    assertNull(started.extras)
    verify(promise).resolve(null)
  }

  @Test
  fun `duplicate launch guard behaves the same with options`() {
    module.openAR(MODEL_URL, "fixed", PRODUCT_LINK, promise)
    module.openAR(MODEL_URL, "fixed", PRODUCT_LINK, promise)

    val first = shadowOf(activity).nextStartedActivity
    val second = shadowOf(activity).nextStartedActivity
    assertEquals("com.google.ar.core", first.`package`)
    assertNull(second)
    verify(promise, times(2)).resolve(null)
  }

  companion object {
    private const val MODEL_URL = "https://example.com/models/chair.glb"
    private const val PRODUCT_LINK = "https://shop.example.com/chair"
  }
}
