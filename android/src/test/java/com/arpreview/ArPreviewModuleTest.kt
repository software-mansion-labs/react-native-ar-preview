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
import org.junit.Assert.assertTrue
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
  fun `options produce an intent identical to a launch without options`() {
    module.openAR(MODEL_URL, null, null, promise)
    val withoutOptions = shadowOf(activity).nextStartedActivity

    module.onHostResume()
    module.openAR(MODEL_URL, "fixed", "https://shop.example.com/chair", promise)
    val withOptions = shadowOf(activity).nextStartedActivity

    assertTrue(withoutOptions.filterEquals(withOptions))
    assertEquals(withoutOptions.flags, withOptions.flags)
    assertNull(withoutOptions.extras)
    assertNull(withOptions.extras)
    verify(promise, times(2)).resolve(null)
  }

  @Test
  fun `duplicate launch guard behaves the same with options`() {
    module.openAR(MODEL_URL, "fixed", "https://shop.example.com/chair", promise)
    module.openAR(MODEL_URL, "fixed", "https://shop.example.com/chair", promise)

    val first = shadowOf(activity).nextStartedActivity
    val second = shadowOf(activity).nextStartedActivity
    assertEquals("com.google.ar.core", first.`package`)
    assertNull(second)
    verify(promise, times(2)).resolve(null)
  }

  companion object {
    private const val MODEL_URL = "https://example.com/models/chair.glb"
  }
}
