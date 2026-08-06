import ARKit
import CryptoKit
import Foundation
import QuickLook
import UIKit

@objc public class ArPreviewImpl: NSObject {
  private var presentedItemUrl: URL?

  @objc public func isARAvailable() -> Bool {
    ARWorldTrackingConfiguration.isSupported
  }

  @objc public func openAR(
    _ url: String,
    resolve: @escaping () -> Void,
    reject: @escaping (String, String) -> Void
  ) {
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
    let task = URLSession.shared.downloadTask(with: sourceUrl) { location, response, error in
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

  private func present(
    itemAt itemUrl: URL,
    resolve: @escaping () -> Void,
    reject: @escaping (String, String) -> Void
  ) {
    DispatchQueue.main.async {
      if self.presentedItemUrl != nil {
        reject("E_LAUNCH_FAILED", "An AR preview is already being presented")
        return
      }
      guard let presenter = self.topViewController() else {
        reject("E_LAUNCH_FAILED", "No view controller available to present from")
        return
      }
      self.presentedItemUrl = itemUrl
      let controller = QLPreviewController()
      controller.dataSource = self
      controller.delegate = self
      presenter.present(controller, animated: true) {
        resolve()
      }
    }
  }

  private func topViewController() -> UIViewController? {
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

  private func cacheLocation(for url: String) -> URL {
    let digest = SHA256.hash(data: Data(url.utf8))
    let hash = digest.map { String(format: "%02x", $0) }.joined()
    let ext = URL(string: url)?.pathExtension ?? ""
    let fileName = ext.isEmpty ? "\(hash).usdz" : "\(hash).\(ext)"
    let cachesDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    return cachesDir.appendingPathComponent("ar-preview").appendingPathComponent(fileName)
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
