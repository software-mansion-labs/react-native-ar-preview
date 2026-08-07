import ARKit
import CryptoKit
import Foundation
import QuickLook
import UIKit

@objc public class ArPreviewImpl: NSObject {
  private let session: URLSession
  private let cacheDirectory: URL
  private let presenterProvider: () -> UIViewController?
  private let retryScheduler: (TimeInterval, @escaping () -> Void) -> Void
  private let controllerFactory: () -> QLPreviewController

  private var presentedItemUrl: URL?
  private weak var presentedController: QLPreviewController?
  private let openLock = NSLock()
  private var isOpening = false

  @objc public override convenience init() {
    self.init(
      session: .shared,
      cacheDirectory: FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0],
      presenterProvider: ArPreviewImpl.topViewController,
      retryScheduler: { delay, work in
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
      },
      controllerFactory: { QLPreviewController() }
    )
  }

  public init(
    session: URLSession,
    cacheDirectory: URL,
    presenterProvider: @escaping () -> UIViewController?,
    retryScheduler: @escaping (TimeInterval, @escaping () -> Void) -> Void,
    controllerFactory: @escaping () -> QLPreviewController
  ) {
    self.session = session
    self.cacheDirectory = cacheDirectory
    self.presenterProvider = presenterProvider
    self.retryScheduler = retryScheduler
    self.controllerFactory = controllerFactory
  }

  @objc public func isARAvailable() -> Bool {
    ARWorldTrackingConfiguration.isSupported
  }

  @objc public func openAR(
    _ url: String,
    resolve rawResolve: @escaping () -> Void,
    reject rawReject: @escaping (String, String) -> Void
  ) {
    guard beginOpen() else {
      rawResolve()
      return
    }
    let resolve = {
      self.endOpen()
      rawResolve()
    }
    let reject = { (code: String, message: String) in
      self.endOpen()
      rawReject(code, message)
    }
    guard let sourceUrl = URL(string: url) else {
      reject("E_INVALID_SOURCE", "Invalid url: \(url)")
      return
    }
    if sourceUrl.isFileURL {
      present(itemAt: sourceUrl, resolve: resolve, reject: reject)
      return
    }
    let cachedUrl = cacheLocation(for: url)
    if FileManager.default.fileExists(atPath: cachedUrl.path) {
      present(itemAt: cachedUrl, resolve: resolve, reject: reject)
      return
    }
    let task = session.downloadTask(with: sourceUrl) { location, response, error in
      if let error {
        reject("E_DOWNLOAD_FAILED", error.localizedDescription)
        return
      }
      if let httpResponse = response as? HTTPURLResponse,
         !(200..<300).contains(httpResponse.statusCode) {
        reject("E_DOWNLOAD_FAILED", "Download failed with status \(httpResponse.statusCode)")
        return
      }
      guard let location else {
        reject("E_DOWNLOAD_FAILED", "Download produced no file")
        return
      }
      guard ArPreviewImpl.hasZipMagicBytes(at: location) else {
        reject("E_DOWNLOAD_FAILED", "Downloaded file is not a valid USDZ model")
        return
      }
      do {
        try FileManager.default.createDirectory(
          at: cachedUrl.deletingLastPathComponent(),
          withIntermediateDirectories: true
        )
        try? FileManager.default.removeItem(at: cachedUrl)
        try FileManager.default.moveItem(at: location, to: cachedUrl)
      } catch {
        reject("E_DOWNLOAD_FAILED", error.localizedDescription)
        return
      }
      self.present(itemAt: cachedUrl, resolve: resolve, reject: reject)
    }
    task.resume()
  }

  private func beginOpen() -> Bool {
    openLock.lock()
    defer { openLock.unlock() }
    if isOpening {
      return false
    }
    isOpening = true
    return true
  }

  private func endOpen() {
    openLock.lock()
    defer { openLock.unlock() }
    isOpening = false
  }

  private func present(
    itemAt itemUrl: URL,
    resolve: @escaping () -> Void,
    reject: @escaping (String, String) -> Void
  ) {
    DispatchQueue.main.async {
      self.attemptPresentation(of: itemUrl, retriesLeft: 40, resolve: resolve, reject: reject)
    }
  }

  private func attemptPresentation(
    of itemUrl: URL,
    retriesLeft: Int,
    resolve: @escaping () -> Void,
    reject: @escaping (String, String) -> Void
  ) {
    if let existing = presentedController {
      if existing.isBeingDismissed {
        if retriesLeft == 0 {
          reject("E_LAUNCH_FAILED", "Timed out waiting for the previous AR preview to dismiss")
          return
        }
        retryScheduler(0.05) {
          self.attemptPresentation(
            of: itemUrl,
            retriesLeft: retriesLeft - 1,
            resolve: resolve,
            reject: reject
          )
        }
        return
      }
      if existing.presentingViewController != nil {
        reject("E_LAUNCH_FAILED", "An AR preview is already being presented")
        return
      }
    }
    guard let presenter = presenterProvider() else {
      reject("E_LAUNCH_FAILED", "No view controller available to present from")
      return
    }
    presentedItemUrl = itemUrl
    let controller = controllerFactory()
    controller.dataSource = self
    controller.delegate = self
    presentedController = controller
    presenter.present(controller, animated: true) {
      resolve()
    }
  }

  private static func topViewController() -> UIViewController? {
    let root = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }?
      .rootViewController
    var top = root
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }

  private static func hasZipMagicBytes(at url: URL) -> Bool {
    guard let handle = try? FileHandle(forReadingFrom: url) else {
      return false
    }
    defer { try? handle.close() }
    let prefix = (try? handle.read(upToCount: 2)) ?? Data()
    return prefix == Data([0x50, 0x4B])
  }

  private func cacheLocation(for url: String) -> URL {
    let digest = SHA256.hash(data: Data(url.utf8))
    let hash = digest.map { String(format: "%02x", $0) }.joined()
    let ext = URL(string: url)?.pathExtension ?? ""
    let fileName = ext.isEmpty ? "\(hash).usdz" : "\(hash).\(ext)"
    return cacheDirectory.appendingPathComponent("ar-preview").appendingPathComponent(fileName)
  }
}

extension ArPreviewImpl: QLPreviewControllerDataSource, QLPreviewControllerDelegate {
  public func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
    presentedItemUrl == nil ? 0 : 1
  }

  public func previewController(
    _ controller: QLPreviewController,
    previewItemAt index: Int
  ) -> QLPreviewItem {
    (presentedItemUrl ?? URL(fileURLWithPath: "")) as NSURL
  }

  public func previewControllerDidDismiss(_ controller: QLPreviewController) {
    presentedItemUrl = nil
  }
}
