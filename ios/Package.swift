// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "ArPreviewImpl",
  platforms: [.iOS(.v15)],
  targets: [
    .target(
      name: "ArPreviewImpl",
      path: ".",
      exclude: ["ArPreview.h", "ArPreview.mm", "Tests"],
      sources: ["ArPreviewImpl.swift"]
    ),
    .testTarget(
      name: "ArPreviewImplTests",
      dependencies: ["ArPreviewImpl"],
      path: "Tests"
    ),
  ]
)
