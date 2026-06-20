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
private let amber = Color(red: 1.0, green: 0.541, blue: 0.0) // #FF8A00

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
                Text("공유 중")
                    .font(.caption2)
                    .fontWeight(.semibold)
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
                        Text("그룹 \(context.attributes.groupId)")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                }
                Text("러너 \(context.state.runnerCount)명 추적 중")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(context.state.runnerCount)")
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
                    Text("\(context.state.runnerCount)명")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(amber)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("그룹 \(context.attributes.groupId) · 러너 \(context.state.runnerCount)명")
                        .font(.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal)
                }
            } compactLeading: {
                Text("👀")
            } compactTrailing: {
                Text("\(context.state.runnerCount)명")
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
