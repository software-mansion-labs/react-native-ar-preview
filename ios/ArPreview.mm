#import "ArPreview.h"

#import <QuickLook/QuickLook.h>

#if __has_include("ArPreview/ArPreview-Swift.h")
#import "ArPreview/ArPreview-Swift.h"
#else
#import "ArPreview-Swift.h"
#endif

@implementation ArPreview {
  ArPreviewImpl *_impl;
}

- (instancetype)init
{
  if (self = [super init]) {
    _impl = [ArPreviewImpl new];
  }
  return self;
}

- (void)isARAvailable:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  resolve(@([_impl isARAvailable]));
}

- (void)openAR:(NSString *)url
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject
{
  [_impl openAR:url
        resolve:^{
          resolve(nil);
        }
         reject:^(NSString *code, NSString *message) {
           reject(code, message, nil);
         }];
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
