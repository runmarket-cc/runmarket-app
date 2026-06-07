import {
  ConfigPlugin,
  withXcodeProject,
  withInfoPlist,
  withDangerousMod,
} from '@expo/config-plugins';
import * as path from 'path';
import * as fs from 'fs';

const WIDGET_TARGET = 'RunmarketWidget';

// ── Widget Extension Swift 소스 ─────────────────────────────────────────────

const WIDGET_SWIFT = `
import WidgetKit
import SwiftUI
import ActivityKit

// MARK: - ActivityAttributes (RunmarketLiveActivityModule.swift 와 동일하게 유지)

struct RunnerActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {}
    var runnerId: String
    var groupId: String
}

struct SpectatorActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var runnerCount: Int
        var isConnected: Bool
    }
    var groupId: String
}

private let navyBG = Color(red: 0.09, green: 0.14, blue: 0.24)

// MARK: - Runner Lock Screen View

struct RunnerLockScreenView: View {
    let context: ActivityViewContext<RunnerActivityAttributes>

    var body: some View {
        HStack(spacing: 12) {
            Text("🏃").font(.largeTitle)
            VStack(alignment: .leading, spacing: 4) {
                Text("위치 전송 중")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                Text(context.attributes.runnerId)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
            }
            Spacer()
            Image(systemName: "location.fill")
                .foregroundColor(.green)
                .font(.title3)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(navyBG)
        .activityBackgroundTint(navyBG)
    }
}

// MARK: - Runner Widget

struct RunnerLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RunnerActivityAttributes.self) { context in
            RunnerLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("위치 전송 중", systemImage: "location.fill")
                        .font(.caption2)
                        .foregroundColor(.green)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.runnerId)
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.7))
                }
            } compactLeading: {
                Text("🏃")
            } compactTrailing: {
                Image(systemName: "location.fill")
                    .font(.caption2)
                    .foregroundColor(.green)
            } minimal: {
                Text("🏃")
            }
        }
    }
}

// MARK: - Spectator Lock Screen View

struct SpectatorLockScreenView: View {
    let context: ActivityViewContext<SpectatorActivityAttributes>

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Text("👀").font(.title3)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("관전 중")
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.6))
                        Text("그룹 \\(context.attributes.groupId)")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                }
                Text("러너 \\(context.state.runnerCount)명 추적 중")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text("\\(context.state.runnerCount)")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(amber)
                Text("명")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.6))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(navyBG)
        .activityBackgroundTint(navyBG)
    }
}

// MARK: - Spectator Widget

struct SpectatorLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SpectatorActivityAttributes.self) { context in
            SpectatorLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("👀 관전 중")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.8))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\\(context.state.runnerCount)명")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(amber)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("그룹 \\(context.attributes.groupId) · 러너 \\(context.state.runnerCount)명")
                        .font(.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal)
                }
            } compactLeading: {
                Text("👀")
            } compactTrailing: {
                Text("\\(context.state.runnerCount)명")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(amber)
            } minimal: {
                Text("👀")
            }
        }
    }
}

// MARK: - Widget Bundle

@main
struct RunmarketWidgetBundle: WidgetBundle {
    var body: some Widget {
        RunnerLiveActivityWidget()
        SpectatorLiveActivityWidget()
    }
}
`.trimStart();

const WIDGET_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>
`;

// ── Config Plugin ───────────────────────────────────────────────────────────

const withLiveActivities: ConfigPlugin = (config) => {
  // 1. Info.plist 에 Live Activities 허용 플래그 추가
  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true;
    mod.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return mod;
  });

  // 2. Widget Extension Swift 파일 생성
  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      const iosDir = mod.modRequest.platformProjectRoot;
      const widgetDir = path.join(iosDir, WIDGET_TARGET);

      if (!fs.existsSync(widgetDir)) {
        fs.mkdirSync(widgetDir, { recursive: true });
      }

      fs.writeFileSync(path.join(widgetDir, 'RunmarketWidget.swift'), WIDGET_SWIFT, 'utf8');
      fs.writeFileSync(path.join(widgetDir, 'Info.plist'), WIDGET_INFO_PLIST, 'utf8');

      console.log(`\n[withLiveActivities] Widget Extension 파일 생성 완료: ${widgetDir}`);
      console.log('[withLiveActivities] ⚠️  Xcode에서 Widget Extension 타겟을 수동으로 추가해야 합니다.');
      console.log('[withLiveActivities]    1. Xcode 열기 → File → New → Target → Widget Extension');
      console.log(`[withLiveActivities]    2. Product Name: ${WIDGET_TARGET}`);
      console.log('[withLiveActivities]    3. Bundle Identifier: cc.runmarket.app.widget');
      console.log('[withLiveActivities]    4. Deployment Target: iOS 16.2');
      console.log('[withLiveActivities]    5. 생성된 기본 파일 삭제 후 ios/RunmarketWidget/ 파일 사용');

      return mod;
    },
  ]);

  // 3. Xcode 프로젝트에 Widget Extension 타겟 추가
  config = withXcodeProject(config, (mod) => {
    const xcodeProject = mod.modResults;
    const bundleId = config.ios?.bundleIdentifier ?? 'cc.runmarket.app';
    const widgetBundleId = `${bundleId}.widget`;

    // 이미 타겟이 있으면 스킵
    const existingTargets = xcodeProject.pbxNativeTargetSection();
    const alreadyAdded = Object.values(existingTargets).some(
      (t: any) => t && t.name === WIDGET_TARGET
    );
    if (alreadyAdded) {
      return mod;
    }

    // Widget Extension 타겟 추가
    const widgetTarget = xcodeProject.addTarget(
      WIDGET_TARGET,
      'app_extension',
      WIDGET_TARGET,
      widgetBundleId
    );

    if (!widgetTarget) {
      console.warn('[withLiveActivities] Widget 타겟 추가 실패');
      return mod;
    }

    const targetUuid = widgetTarget.uuid;

    // 소스 파일 추가
    xcodeProject.addSourceFile(
      `${WIDGET_TARGET}/RunmarketWidget.swift`,
      {},
      targetUuid
    );

    // 프레임워크 추가
    xcodeProject.addFramework('WidgetKit.framework', {
      target: targetUuid,
      link: true,
    });
    xcodeProject.addFramework('SwiftUI.framework', {
      target: targetUuid,
      link: true,
    });

    // 빌드 설정 구성
    const configListKey = xcodeProject.pbxNativeTargetSection()[targetUuid]?.buildConfigurationList;
    if (configListKey) {
      const configList = xcodeProject.pbxXCConfigurationList()[configListKey];
      if (configList) {
        configList.buildConfigurations?.forEach(({ value: configKey }: any) => {
          const buildConfig = xcodeProject.pbxXCBuildConfigurationSection()[configKey];
          if (buildConfig?.buildSettings) {
            Object.assign(buildConfig.buildSettings, {
              SWIFT_VERSION: '"5.0"',
              IPHONEOS_DEPLOYMENT_TARGET: '"16.2"',
              INFOPLIST_FILE: `"${WIDGET_TARGET}/Info.plist"`,
              PRODUCT_BUNDLE_IDENTIFIER: `"${widgetBundleId}"`,
              SKIP_INSTALL: 'YES',
              TARGETED_DEVICE_FAMILY: '"1"',
              CODE_SIGN_ENTITLEMENTS: '""',
            });
          }
        });
      }
    }

    console.log('[withLiveActivities] Widget Extension 타겟 Xcode 프로젝트에 추가 완료');

    return mod;
  });

  return config;
};

export default withLiveActivities;
