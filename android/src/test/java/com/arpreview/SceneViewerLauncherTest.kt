package com.arpreview

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.Mockito.doThrow
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SceneViewerLauncherTest {

  private val packageManager: PackageManager = mock(PackageManager::class.java)
  private val activity: Activity = mock(Activity::class.java)

  private var launchedCount = 0
  private var failedCode: String? = null
  private var failedMessage: String? = null
  private var failedError: Throwable? = null

  private fun makeLauncher(activityProvider: () -> Activity? = { activity }) =
    SceneViewerLauncher(packageManager, activityProvider)

  private fun launch(launcher: SceneViewerLauncher, url: String = MODEL_URL) {
    launcher.launch(
      url,
      onLaunched = { launchedCount += 1 },
      onFailed = { code, message, error ->
        failedCode = code
        failedMessage = message
        failedError = error
      }
    )
  }

  private fun stubSceneViewerInstalled(installed: Boolean) {
    `when`(packageManager.resolveActivity(any(Intent::class.java), anyInt()))
      .thenReturn(if (installed) sceneViewerResolveInfo() else null)
  }

  private fun sceneViewerResolveInfo() = ResolveInfo().apply {
    activityInfo = ActivityInfo().apply {
      packageName = "com.google.ar.core"
      name = "SceneViewerActivity"
      applicationInfo = ApplicationInfo().apply { packageName = "com.google.ar.core" }
    }
  }

  @Test
  fun `intent targets scene viewer with the model url and ar mode`() {
    val intent = SceneViewerLauncher.buildIntent(MODEL_URL)

    assertEquals(Intent.ACTION_VIEW, intent.action)
    assertEquals("com.google.ar.core", intent.`package`)
    assertEquals("https", intent.data?.scheme)
    assertEquals("arvr.google.com", intent.data?.authority)
    assertEquals("/scene-viewer/1.0", intent.data?.path)
    assertEquals(MODEL_URL, intent.data?.getQueryParameter("file"))
    assertEquals("ar_preferred", intent.data?.getQueryParameter("mode"))
  }

  @Test
  fun `isAvailable reflects scene viewer resolution`() {
    stubSceneViewerInstalled(true)
    assertTrue(makeLauncher().isAvailable())

    stubSceneViewerInstalled(false)
    assertFalse(makeLauncher().isAvailable())
  }

  @Test
  fun `launch starts scene viewer and reports success`() {
    stubSceneViewerInstalled(true)
    launch(makeLauncher())

    val captor = ArgumentCaptor.forClass(Intent::class.java)
    verify(activity).startActivity(captor.capture())
    assertEquals("com.google.ar.core", captor.value.`package`)
    assertEquals(MODEL_URL, captor.value.data?.getQueryParameter("file"))
    assertEquals(1, launchedCount)
    assertNull(failedCode)
  }

  @Test
  fun `launch without an activity fails with launch error`() {
    stubSceneViewerInstalled(true)
    launch(makeLauncher(activityProvider = { null }))

    assertEquals("E_LAUNCH_FAILED", failedCode)
    assertEquals("No activity available to launch from", failedMessage)
    assertEquals(0, launchedCount)
    verify(activity, never()).startActivity(any(Intent::class.java))
  }

  @Test
  fun `launch without scene viewer fails with unavailable error`() {
    stubSceneViewerInstalled(false)
    launch(makeLauncher())

    assertEquals("E_AR_UNAVAILABLE", failedCode)
    assertEquals("Scene Viewer is not available on this device", failedMessage)
    assertEquals(0, launchedCount)
    verify(activity, never()).startActivity(any(Intent::class.java))
  }

  @Test
  fun `launch surfaces activity start failures`() {
    stubSceneViewerInstalled(true)
    val boom = ActivityNotFoundException("Scene Viewer disappeared")
    doThrow(boom).`when`(activity).startActivity(any(Intent::class.java))

    launch(makeLauncher())

    assertEquals("E_LAUNCH_FAILED", failedCode)
    assertEquals("Scene Viewer disappeared", failedMessage)
    assertEquals(boom, failedError)
    assertEquals(0, launchedCount)
  }

  @Test
  fun `second launch while scene viewer is open is a silent no-op`() {
    stubSceneViewerInstalled(true)
    val launcher = makeLauncher()

    launch(launcher)
    launch(launcher)

    verify(activity, times(1)).startActivity(any(Intent::class.java))
    assertEquals(2, launchedCount)
    assertNull(failedCode)
  }

  @Test
  fun `launch works again after the host resumes`() {
    stubSceneViewerInstalled(true)
    val launcher = makeLauncher()

    launch(launcher)
    launcher.notifyHostResumed()
    launch(launcher)

    verify(activity, times(2)).startActivity(any(Intent::class.java))
    assertEquals(2, launchedCount)
    assertNull(failedCode)
  }

  @Test
  fun `failed launch does not block the next attempt`() {
    stubSceneViewerInstalled(true)
    val boom = ActivityNotFoundException("Scene Viewer disappeared")
    doThrow(boom).`when`(activity).startActivity(any(Intent::class.java))
    val launcher = makeLauncher()
    launch(launcher)

    org.mockito.Mockito.reset(activity)
    launch(launcher)

    verify(activity, times(1)).startActivity(any(Intent::class.java))
    assertEquals(1, launchedCount)
  }

  companion object {
    private const val MODEL_URL = "https://example.com/models/chair.glb"
  }
}
