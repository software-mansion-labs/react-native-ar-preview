import ArPreviewImpl
import QuickLook
import UIKit
import XCTest

final class StubURLProtocol: URLProtocol {
  nonisolated(unsafe) static var handler: ((URLRequest) -> Result<(HTTPURLResponse, Data), Error>)?
  nonisolated(unsafe) static var requestCount = 0

  static func reset() {
    handler = nil
    requestCount = 0
  }

  override class func canInit(with request: URLRequest) -> Bool {
    true
  }

  override class func canonicalRequest(for request: URLRequest) -> URLRequest {
    request
  }

  override func startLoading() {
    Self.requestCount += 1
    guard let handler = Self.handler else {
      client?.urlProtocol(self, didFailWithError: URLError(.unsupportedURL))
      return
    }
    switch handler(request) {
    case let .success((response, data)):
      client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
      client?.urlProtocol(self, didLoad: data)
      client?.urlProtocolDidFinishLoading(self)
    case let .failure(error):
      client?.urlProtocol(self, didFailWithError: error)
    }
  }

  override func stopLoading() {}
}

final class FakePresenter: UIViewController {
  var presented: [UIViewController] = []

  override func present(
    _ viewControllerToPresent: UIViewController,
    animated flag: Bool,
    completion: (() -> Void)? = nil
  ) {
    presented.append(viewControllerToPresent)
    completion?()
  }
}

let zipBytes = Data([0x50, 0x4B, 0x03, 0x04]) + Data(repeating: 0, count: 64)
let htmlBytes = Data("<!doctype html><html><body>Not a model</body></html>".utf8)

final class ArPreviewImplTests: XCTestCase {
  private var cacheDir: URL!

  override func setUpWithError() throws {
    cacheDir = FileManager.default.temporaryDirectory
      .appendingPathComponent("ar-preview-tests")
      .appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
    StubURLProtocol.reset()
  }

  override func tearDownWithError() throws {
    try? FileManager.default.removeItem(at: cacheDir)
  }

  private func makeSession() -> URLSession {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [StubURLProtocol.self]
    return URLSession(configuration: configuration)
  }

  private func makeImpl(
    presenter: @escaping () -> UIViewController?,
    scheduler: @escaping (TimeInterval, @escaping () -> Void) -> Void = { delay, work in
      DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
    },
    factory: @escaping () -> QLPreviewController = { QLPreviewController() }
  ) -> ArPreviewImpl {
    ArPreviewImpl(
      session: makeSession(),
      cacheDirectory: cacheDir,
      presenterProvider: presenter,
      retryScheduler: scheduler,
      controllerFactory: factory
    )
  }

  private func stubResponse(status: Int, data: Data) {
    StubURLProtocol.handler = { request in
      let response = HTTPURLResponse(
        url: request.url!,
        statusCode: status,
        httpVersion: "HTTP/1.1",
        headerFields: nil
      )!
      return .success((response, data))
    }
  }

  private func cachedModelFiles() -> [URL] {
    let modelsDir = cacheDir.appendingPathComponent("ar-preview")
    let contents = try? FileManager.default.contentsOfDirectory(
      at: modelsDir,
      includingPropertiesForKeys: nil
    )
    return contents ?? []
  }

  private func openAR(
    _ impl: ArPreviewImpl,
    url: String,
    timeout: TimeInterval = 5
  ) -> (resolved: Bool, code: String?, message: String?) {
    let expectation = expectation(description: "openAR settles")
    var resolved = false
    var code: String?
    var message: String?
    impl.openAR(
      url,
      resolve: {
        resolved = true
        expectation.fulfill()
      },
      reject: { rejectCode, rejectMessage in
        code = rejectCode
        message = rejectMessage
        expectation.fulfill()
      }
    )
    wait(for: [expectation], timeout: timeout)
    return (resolved, code, message)
  }

  func test_unparseable_url_rejects_with_invalid_source() {
    let presenter = FakePresenter()
    let impl = makeImpl(presenter: { presenter })

    let result = openAR(impl, url: "")

    XCTAssertEqual(result.code, "E_INVALID_SOURCE")
    XCTAssertTrue(presenter.presented.isEmpty)
  }

  func test_local_file_presents_without_network() throws {
    let modelUrl = cacheDir.appendingPathComponent("local.usdz")
    try zipBytes.write(to: modelUrl)
    let presenter = FakePresenter()
    let impl = makeImpl(presenter: { presenter })

    let result = openAR(impl, url: modelUrl.absoluteString)

    XCTAssertTrue(result.resolved)
    XCTAssertEqual(StubURLProtocol.requestCount, 0)
    XCTAssertTrue(presenter.presented.first is QLPreviewController)
  }

  func test_download_success_presents_and_caches() {
    stubResponse(status: 200, data: zipBytes)
    let presenter = FakePresenter()
    let impl = makeImpl(presenter: { presenter })

    let result = openAR(impl, url: "https://example.com/models/chair.usdz")

    XCTAssertTrue(result.resolved)
    XCTAssertEqual(StubURLProtocol.requestCount, 1)
    XCTAssertEqual(cachedModelFiles().count, 1)
    XCTAssertEqual(cachedModelFiles().first?.pathExtension, "usdz")
    XCTAssertTrue(presenter.presented.first is QLPreviewController)
  }

  func test_second_open_replays_from_cache_without_network() {
    stubResponse(status: 200, data: zipBytes)
    let presenter = FakePresenter()
    let impl = makeImpl(presenter: { presenter })
    _ = openAR(impl, url: "https://example.com/models/chair.usdz")

    StubURLProtocol.handler = { _ in .failure(URLError(.notConnectedToInternet)) }
    let offlineImpl = makeImpl(presenter: { presenter })
    let result = openAR(offlineImpl, url: "https://example.com/models/chair.usdz")

    XCTAssertTrue(result.resolved)
    XCTAssertEqual(StubURLProtocol.requestCount, 1)
  }

  func test_http_error_status_rejects_and_caches_nothing() {
    stubResponse(status: 404, data: Data())
    let impl = makeImpl(presenter: { FakePresenter() })

    let result = openAR(impl, url: "https://example.com/missing.usdz")

    XCTAssertEqual(result.code, "E_DOWNLOAD_FAILED")
    XCTAssertTrue(cachedModelFiles().isEmpty)
  }

  func test_server_error_status_rejects() {
    stubResponse(status: 500, data: Data())
    let impl = makeImpl(presenter: { FakePresenter() })

    let result = openAR(impl, url: "https://example.com/broken.usdz")

    XCTAssertEqual(result.code, "E_DOWNLOAD_FAILED")
  }

  func test_network_failure_rejects_and_caches_nothing() {
    StubURLProtocol.handler = { _ in .failure(URLError(.notConnectedToInternet)) }
    let impl = makeImpl(presenter: { FakePresenter() })

    let result = openAR(impl, url: "https://example.com/chair.usdz")

    XCTAssertEqual(result.code, "E_DOWNLOAD_FAILED")
    XCTAssertTrue(cachedModelFiles().isEmpty)
  }

  func test_html_payload_rejects_and_caches_nothing() {
    stubResponse(status: 200, data: htmlBytes)
    let presenter = FakePresenter()
    let impl = makeImpl(presenter: { presenter })

    let result = openAR(impl, url: "https://example.com/not-a-model.usdz")

    XCTAssertEqual(result.code, "E_DOWNLOAD_FAILED")
    XCTAssertTrue(cachedModelFiles().isEmpty)
    XCTAssertTrue(presenter.presented.isEmpty)
  }

  func test_missing_presenter_rejects_with_launch_failed() throws {
    let modelUrl = cacheDir.appendingPathComponent("local.usdz")
    try zipBytes.write(to: modelUrl)
    let impl = makeImpl(presenter: { nil })

    let result = openAR(impl, url: modelUrl.absoluteString)

    XCTAssertEqual(result.code, "E_LAUNCH_FAILED")
  }

  func test_data_source_reflects_presented_item() throws {
    let modelUrl = cacheDir.appendingPathComponent("local.usdz")
    try zipBytes.write(to: modelUrl)
    let presenter = FakePresenter()
    let impl = makeImpl(presenter: { presenter })
    let controller = QLPreviewController()

    XCTAssertEqual(impl.numberOfPreviewItems(in: controller), 0)
    _ = openAR(impl, url: modelUrl.absoluteString)

    XCTAssertEqual(impl.numberOfPreviewItems(in: controller), 1)
    XCTAssertEqual(
      impl.previewController(controller, previewItemAt: 0).previewItemURL,
      modelUrl
    )

    impl.previewControllerDidDismiss(controller)
    XCTAssertEqual(impl.numberOfPreviewItems(in: controller), 0)
  }
}

final class ControllableQLPreviewController: QLPreviewController {
  var stubbedBeingDismissed = false
  var stubbedPresenting: UIViewController?

  override var isBeingDismissed: Bool {
    stubbedBeingDismissed
  }

  override var presentingViewController: UIViewController? {
    stubbedPresenting
  }
}

extension ArPreviewImplTests {
  private func presentModel(
    factory: @escaping () -> QLPreviewController,
    scheduler: @escaping (TimeInterval, @escaping () -> Void) -> Void = { delay, work in
      DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
    }
  ) throws -> (impl: ArPreviewImpl, presenter: FakePresenter, url: URL) {
    let modelUrl = cacheDir.appendingPathComponent("presented.usdz")
    try zipBytes.write(to: modelUrl)
    let presenter = FakePresenter()
    let impl = makeImpl(presenter: { presenter }, scheduler: scheduler, factory: factory)
    let first = openAR(impl, url: modelUrl.absoluteString)
    XCTAssertTrue(first.resolved)
    return (impl, presenter, modelUrl)
  }

  func test_second_open_while_presented_rejects_with_launch_failed() throws {
    let controller = ControllableQLPreviewController()
    let fixture = try presentModel(factory: { controller })
    controller.stubbedPresenting = fixture.presenter

    let second = openAR(fixture.impl, url: fixture.url.absoluteString)

    XCTAssertEqual(second.code, "E_LAUNCH_FAILED")
    XCTAssertEqual(second.message, "An AR preview is already being presented")
    XCTAssertEqual(fixture.presenter.presented.count, 1)
  }

  func test_open_during_dismissal_waits_until_dismissed_then_presents() throws {
    let controller = ControllableQLPreviewController()
    var retries = 0
    let fixture = try presentModel(
      factory: { controller },
      scheduler: { _, work in
        retries += 1
        if retries == 3 {
          controller.stubbedBeingDismissed = false
          controller.stubbedPresenting = nil
        }
        DispatchQueue.main.async(execute: work)
      }
    )
    controller.stubbedBeingDismissed = true

    let second = openAR(fixture.impl, url: fixture.url.absoluteString)

    XCTAssertTrue(second.resolved)
    XCTAssertEqual(retries, 3)
    XCTAssertEqual(fixture.presenter.presented.count, 2)
  }

  func test_open_during_stuck_dismissal_times_out() throws {
    let controller = ControllableQLPreviewController()
    var retries = 0
    let fixture = try presentModel(
      factory: { controller },
      scheduler: { _, work in
        retries += 1
        DispatchQueue.main.async(execute: work)
      }
    )
    controller.stubbedBeingDismissed = true

    let second = openAR(fixture.impl, url: fixture.url.absoluteString)

    XCTAssertEqual(second.code, "E_LAUNCH_FAILED")
    XCTAssertEqual(
      second.message,
      "Timed out waiting for the previous AR preview to dismiss"
    )
    XCTAssertEqual(retries, 40)
  }
}
