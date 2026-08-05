#import <ArPreviewSpec/ArPreviewSpec.h>
#import <QuickLook/QuickLook.h>

@interface ArPreview
    : NSObject <NativeArPreviewSpec, QLPreviewControllerDataSource,
                QLPreviewControllerDelegate>

@end
