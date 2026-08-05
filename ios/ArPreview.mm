#import "ArPreview.h"

#import <ARKit/ARKit.h>
#import <CommonCrypto/CommonDigest.h>
#import <React/RCTUtils.h>

static NSString *const kErrorDownloadFailed = @"E_DOWNLOAD_FAILED";
static NSString *const kErrorLaunchFailed = @"E_LAUNCH_FAILED";

@implementation ArPreview {
  NSURL *_presentedItemUrl;
}

- (void)isARAvailable:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  resolve(@(ARWorldTrackingConfiguration.isSupported));
}

- (void)openAR:(NSString *)url
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject
{
  NSURL *sourceUrl = [NSURL URLWithString:url];
  if (sourceUrl == nil) {
    reject(kErrorLaunchFailed, [NSString stringWithFormat:@"Invalid url: %@", url], nil);
    return;
  }
  if (sourceUrl.isFileURL) {
    [self presentItemAt:sourceUrl resolve:resolve reject:reject];
    return;
  }
  NSURL *cachedUrl = [self cacheLocationFor:url];
  if ([NSFileManager.defaultManager fileExistsAtPath:cachedUrl.path]) {
    [self presentItemAt:cachedUrl resolve:resolve reject:reject];
    return;
  }
  NSURLSessionDownloadTask *task = [NSURLSession.sharedSession
      downloadTaskWithURL:sourceUrl
        completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
          if (error != nil) {
            reject(kErrorDownloadFailed, error.localizedDescription, error);
            return;
          }
          NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
          if ([httpResponse isKindOfClass:NSHTTPURLResponse.class] &&
              (httpResponse.statusCode < 200 || httpResponse.statusCode >= 300)) {
            reject(kErrorDownloadFailed,
                   [NSString stringWithFormat:@"Download failed with status %ld",
                                              (long)httpResponse.statusCode],
                   nil);
            return;
          }
          NSError *moveError = nil;
          [NSFileManager.defaultManager createDirectoryAtURL:cachedUrl.URLByDeletingLastPathComponent
                                 withIntermediateDirectories:YES
                                                  attributes:nil
                                                       error:nil];
          [NSFileManager.defaultManager removeItemAtURL:cachedUrl error:nil];
          if (![NSFileManager.defaultManager moveItemAtURL:location
                                                     toURL:cachedUrl
                                                     error:&moveError]) {
            reject(kErrorDownloadFailed, moveError.localizedDescription, moveError);
            return;
          }
          [self presentItemAt:cachedUrl resolve:resolve reject:reject];
        }];
  [task resume];
}

- (void)presentItemAt:(NSURL *)itemUrl
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIViewController *presenter = RCTPresentedViewController();
    if (presenter == nil) {
      reject(kErrorLaunchFailed, @"No view controller available to present from", nil);
      return;
    }
    self->_presentedItemUrl = itemUrl;
    QLPreviewController *controller = [QLPreviewController new];
    controller.dataSource = self;
    controller.delegate = self;
    [presenter presentViewController:controller
                            animated:YES
                          completion:^{
                            resolve(nil);
                          }];
  });
}

- (NSURL *)cacheLocationFor:(NSString *)url
{
  NSData *data = [url dataUsingEncoding:NSUTF8StringEncoding];
  unsigned char digest[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(data.bytes, (CC_LONG)data.length, digest);
  NSMutableString *hash = [NSMutableString stringWithCapacity:CC_SHA256_DIGEST_LENGTH * 2];
  for (int i = 0; i < CC_SHA256_DIGEST_LENGTH; i++) {
    [hash appendFormat:@"%02x", digest[i]];
  }
  NSURL *cachesDir = [NSFileManager.defaultManager URLsForDirectory:NSCachesDirectory
                                                          inDomains:NSUserDomainMask]
                         .firstObject;
  NSString *extension = [NSURL URLWithString:url].pathExtension;
  NSString *fileName = extension.length > 0
                           ? [NSString stringWithFormat:@"%@.%@", hash, extension]
                           : [NSString stringWithFormat:@"%@.usdz", hash];
  return [[cachesDir URLByAppendingPathComponent:@"ar-preview"]
      URLByAppendingPathComponent:fileName];
}

- (NSInteger)numberOfPreviewItemsInPreviewController:(QLPreviewController *)controller
{
  return _presentedItemUrl == nil ? 0 : 1;
}

- (id<QLPreviewItem>)previewController:(QLPreviewController *)controller
                    previewItemAtIndex:(NSInteger)index
{
  return _presentedItemUrl;
}

- (void)previewControllerDidDismiss:(QLPreviewController *)controller
{
  _presentedItemUrl = nil;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeArPreviewSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"ArPreview";
}

@end
