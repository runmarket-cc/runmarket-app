import ExpoModulesCore
import ActivityKit

// ActivityAttributes 정의 - RunmarketWidget 과 동일하게 유지해야 함
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

public class RunmarketLiveActivityModule: Module {
    private var runnerActivity: Any? = nil
    private var spectatorActivity: Any? = nil

    public func definition() -> ModuleDefinition {
        Name("RunmarketLiveActivity")

        AsyncFunction("startRunnerActivity") { [weak self] (params: [String: Any]) -> String? in
            guard #available(iOS 16.2, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

            let runnerId = params["runnerId"] as? String ?? ""
            let groupId = params["groupId"] as? String ?? ""

            let attributes = RunnerActivityAttributes(runnerId: runnerId, groupId: groupId)
            let state = RunnerActivityAttributes.ContentState()
            do {
                let activity = try Activity<RunnerActivityAttributes>.request(
                    attributes: attributes,
                    content: ActivityContent(state: state, staleDate: nil),
                    pushType: nil
                )
                self?.runnerActivity = activity
                return activity.id
            } catch {
                return nil
            }
        }

AsyncFunction("endRunnerActivity") { [weak self] () async in
            guard #available(iOS 16.2, *) else { return }
            guard let activity = self?.runnerActivity as? Activity<RunnerActivityAttributes> else { return }
            await activity.end(nil, dismissalPolicy: .immediate)
            self?.runnerActivity = nil
        }

        AsyncFunction("startSpectatorActivity") { [weak self] (params: [String: Any]) -> String? in
            guard #available(iOS 16.2, *) else { return nil }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

            let groupId = params["groupId"] as? String ?? ""
            let runnerCount = params["runnerCount"] as? Int ?? 0

            let attributes = SpectatorActivityAttributes(groupId: groupId)
            let state = SpectatorActivityAttributes.ContentState(
                runnerCount: runnerCount, isConnected: true
            )
            do {
                let activity = try Activity<SpectatorActivityAttributes>.request(
                    attributes: attributes,
                    content: ActivityContent(state: state, staleDate: nil),
                    pushType: nil
                )
                self?.spectatorActivity = activity
                return activity.id
            } catch {
                return nil
            }
        }

        AsyncFunction("updateSpectatorActivity") { [weak self] (params: [String: Any]) async in
            guard #available(iOS 16.2, *) else { return }
            guard let activity = self?.spectatorActivity as? Activity<SpectatorActivityAttributes> else { return }

            let runnerCount = params["runnerCount"] as? Int ?? 0
            let isConnected = params["isConnected"] as? Bool ?? true

            let state = SpectatorActivityAttributes.ContentState(
                runnerCount: runnerCount, isConnected: isConnected
            )
            await activity.update(ActivityContent(state: state, staleDate: nil))
        }

        AsyncFunction("endSpectatorActivity") { [weak self] () async in
            guard #available(iOS 16.2, *) else { return }
            guard let activity = self?.spectatorActivity as? Activity<SpectatorActivityAttributes> else { return }
            await activity.end(nil, dismissalPolicy: .immediate)
            self?.spectatorActivity = nil
        }
    }
}
